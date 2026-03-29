"""
Redis Caching for Backtest Results

Features:
- Async Redis connection with connection pooling
- Automatic cache key generation from backtest parameters
- TTL-based expiration (default: 1 hour)
- Graceful fallback when Redis is unavailable
- Compression for large results
"""

import os
import json
import hashlib
import gzip
from typing import Optional, Any, Dict
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

# Redis configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", 3600))  # 1 hour default
COMPRESSION_THRESHOLD = 1024  # Compress if payload > 1KB

# Lazy-loaded Redis client
_redis_client = None
_redis_available = None


def _get_redis_client():
    """Get or create Redis client (lazy initialization)."""
    global _redis_client, _redis_available
    
    if _redis_available is False:
        return None
    
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.from_url(
                REDIS_URL,
                decode_responses=False,  # We handle encoding ourselves
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
                retry_on_timeout=True,
            )
            # Test connection
            _redis_client.ping()
            _redis_available = True
            logger.info(f"Redis connected: {REDIS_URL}")
        except ImportError:
            logger.warning("redis package not installed, caching disabled")
            _redis_available = False
            return None
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}, caching disabled")
            _redis_available = False
            return None
    
    return _redis_client


def generate_cache_key(
    file_id: str,
    strategy_code: str,
    settings: Dict[str, Any],
    prefix: str = "backtest"
) -> str:
    """
    Generate deterministic cache key from backtest parameters.
    
    Uses SHA256 hash of normalized parameters to create consistent keys.
    """
    # Normalize parameters for consistent hashing
    key_data = {
        "file_id": file_id,
        "strategy_hash": hashlib.md5(strategy_code.encode()).hexdigest()[:16],
        "settings": {
            "symbol": settings.get("symbol", "DEFAULT"),
            "timeframe": settings.get("timeframe", "H1"),
            "date_range": settings.get("date_range", "last1y"),
            "custom_start": settings.get("custom_start"),
            "custom_end": settings.get("custom_end"),
            "commission_percent": settings.get("commission_percent", 0.01),
            "slippage_ticks": settings.get("slippage_ticks", 1.0),
            "spread_points": settings.get("spread_points", 0.0),
            "risk_per_trade": settings.get("risk_per_trade", 1.0),
            "max_trades_per_day": settings.get("max_trades_per_day", 10),
            "daily_loss_cap": settings.get("daily_loss_cap", 5.0),
            "initial_capital": settings.get("initial_capital", 100000.0),
        }
    }
    
    # Create deterministic JSON string
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    key_hash = hashlib.sha256(key_str.encode()).hexdigest()[:32]
    
    return f"{prefix}:{key_hash}"


def _compress(data: bytes) -> bytes:
    """Compress data if it exceeds threshold."""
    if len(data) > COMPRESSION_THRESHOLD:
        return b"gz:" + gzip.compress(data)
    return b"raw:" + data


def _decompress(data: bytes) -> bytes:
    """Decompress data if needed."""
    if data.startswith(b"gz:"):
        return gzip.decompress(data[3:])
    elif data.startswith(b"raw:"):
        return data[4:]
    return data  # Legacy data without prefix


def get_cached_result(cache_key: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached backtest result.
    
    Returns None if not found or on any error.
    """
    client = _get_redis_client()
    if client is None:
        return None
    
    try:
        data = client.get(cache_key)
        if data is None:
            logger.debug(f"Cache miss: {cache_key}")
            return None
        
        decompressed = _decompress(data)
        result = json.loads(decompressed.decode())
        logger.info(f"Cache hit: {cache_key}")
        return result
        
    except Exception as e:
        logger.warning(f"Cache get error: {e}")
        return None


def set_cached_result(
    cache_key: str,
    result: Dict[str, Any],
    ttl_seconds: Optional[int] = None
) -> bool:
    """
    Cache backtest result with TTL.
    
    Returns True if successfully cached, False otherwise.
    """
    client = _get_redis_client()
    if client is None:
        return False
    
    ttl = ttl_seconds or CACHE_TTL_SECONDS
    
    try:
        # Serialize and compress
        json_data = json.dumps(result, default=str).encode()
        compressed = _compress(json_data)
        
        client.setex(cache_key, timedelta(seconds=ttl), compressed)
        
        logger.info(f"Cached result: {cache_key} (TTL: {ttl}s, size: {len(compressed)}B)")
        return True
        
    except Exception as e:
        logger.warning(f"Cache set error: {e}")
        return False


def invalidate_cache(pattern: str = "backtest:*") -> int:
    """
    Invalidate cached results matching pattern.
    
    Returns number of keys deleted.
    """
    client = _get_redis_client()
    if client is None:
        return 0
    
    try:
        keys = list(client.scan_iter(match=pattern, count=100))
        if keys:
            deleted = client.delete(*keys)
            logger.info(f"Invalidated {deleted} cache keys matching '{pattern}'")
            return deleted
        return 0
        
    except Exception as e:
        logger.warning(f"Cache invalidation error: {e}")
        return 0


def get_cache_stats() -> Dict[str, Any]:
    """Get Redis cache statistics."""
    client = _get_redis_client()
    if client is None:
        return {"available": False, "reason": "Redis not connected"}
    
    try:
        info = client.info("memory")
        keyspace = client.info("keyspace")
        
        # Count backtest keys
        backtest_keys = sum(1 for _ in client.scan_iter(match="backtest:*", count=1000))
        
        return {
            "available": True,
            "memory_used_mb": round(info.get("used_memory", 0) / (1024 * 1024), 2),
            "memory_peak_mb": round(info.get("used_memory_peak", 0) / (1024 * 1024), 2),
            "total_keys": sum(d.get("keys", 0) for d in keyspace.values() if isinstance(d, dict)),
            "backtest_keys": backtest_keys,
            "ttl_seconds": CACHE_TTL_SECONDS,
        }
        
    except Exception as e:
        return {"available": False, "reason": str(e)}


def clear_all_cache() -> bool:
    """Clear all cached data. Use with caution!"""
    client = _get_redis_client()
    if client is None:
        return False
    
    try:
        client.flushdb()
        logger.warning("All cache cleared!")
        return True
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        return False


# Decorator for caching function results
def cached(
    key_prefix: str = "func",
    ttl_seconds: int = CACHE_TTL_SECONDS,
    key_builder: Optional[callable] = None
):
    """
    Decorator to cache function results.
    
    Args:
        key_prefix: Prefix for cache keys
        ttl_seconds: Time-to-live for cached results
        key_builder: Optional function to build cache key from args
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default: hash all args
                key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
                key_hash = hashlib.sha256(key_data.encode()).hexdigest()[:32]
                cache_key = f"{key_prefix}:{func.__name__}:{key_hash}"
            
            # Try cache
            cached_result = get_cached_result(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            if result is not None:
                set_cached_result(cache_key, result, ttl_seconds)
            
            return result
        
        return wrapper
    return decorator
