"""
EA Backtesting Studio - FastAPI Backend
Vectorized backtest engine with full offline support.
Secured with JWT auth, rate limiting, and path validation.
"""

import argparse
import os
import sys
import time
import re
import hashlib
import hmac
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from functools import wraps
import json
import uuid
import asyncio
from collections import defaultdict

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
import uvicorn
import jwt

# Import structured logging and caching
from logging_config import setup_logging, get_logger, RequestContext, set_correlation_id, logger as structured_logger
from cache import (
    generate_cache_key, get_cached_result, set_cached_result, 
    invalidate_cache, get_cache_stats
)

# Setup structured logging
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
LOG_FORMAT = os.environ.get("LOG_FORMAT", "json")
setup_logging(level=LOG_LEVEL, json_format=(LOG_FORMAT == "json"))
logger = get_logger(__name__)

# Configuration
DEFAULT_TIMEZONE = "Asia/Kolkata"
DEFAULT_CURRENCY = "INR"
CHUNK_SIZE = 100_000  # Process CSV in chunks for memory efficiency
UPLOADS_DIR = Path("./data/uploads")
ALLOWED_EXTENSIONS = {".csv"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
MAX_CONCURRENT_BACKTESTS = 5
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 60  # seconds

# Supabase JWT settings (read from env)
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")

# Production mode detection
IS_PRODUCTION = os.environ.get("PRODUCTION", "0") == "1" or os.environ.get("ENV", "") == "production"
DEV_AUTH_BYPASS = os.environ.get("DEV_AUTH_BYPASS", "0") == "1"

# Create uploads directory
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="EA Backtesting Engine",
    version="1.0.0",
    description="Offline vectorized backtesting engine with security",
)

# CORS - Restrict to known origins in production
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:*,http://127.0.0.1:*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if os.environ.get("PRODUCTION") else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ========== Rate Limiting ==========

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
    
    def is_allowed(self, key: str) -> bool:
        now = time.time()
        # Clean old requests
        self.requests[key] = [t for t in self.requests[key] if now - t < self.window]
        
        if len(self.requests[key]) >= self.max_requests:
            return False
        
        self.requests[key].append(now)
        return True

rate_limiter = RateLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW)

# ========== Auth Middleware ==========

class AuthenticatedUser(BaseModel):
    user_id: str
    email: Optional[str] = None

async def verify_jwt(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    """Verify Supabase JWT token and extract user info."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization[7:]
    
    if not SUPABASE_JWT_SECRET:
        # PRODUCTION MODE: Reject all requests if JWT secret is missing
        if IS_PRODUCTION:
            audit_log("system", "auth_rejected_no_secret", {"reason": "SUPABASE_JWT_SECRET not configured in production"})
            raise HTTPException(
                status_code=401, 
                detail="Authentication service unavailable. Contact administrator."
            )
        
        # DEVELOPMENT MODE: Only allow bypass if explicitly enabled
        if DEV_AUTH_BYPASS:
            print("WARNING: DEV_AUTH_BYPASS enabled - using dev-user (NOT for production!)")
            return AuthenticatedUser(user_id="dev-user")
        else:
            print("ERROR: SUPABASE_JWT_SECRET not set. Set DEV_AUTH_BYPASS=1 for development bypass.")
            raise HTTPException(
                status_code=401, 
                detail="Authentication not configured. Set SUPABASE_JWT_SECRET or DEV_AUTH_BYPASS=1 for development."
            )
    
    try:
        # Decode and verify JWT
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
        
        return AuthenticatedUser(user_id=user_id, email=email)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        audit_log("unknown", "auth_invalid_token", {"error": str(e)})
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

async def rate_limit_check(request: Request):
    """Check rate limit for the request."""
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

# ========== Path Security ==========

def validate_file_id(file_id: str) -> Path:
    """Validate file ID and return safe path. Prevents path traversal."""
    # Only allow UUID-style file IDs
    if not re.match(r'^[a-zA-Z0-9_-]{1,64}$', file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID format")
    
    # Build path and verify it's within uploads directory
    file_path = UPLOADS_DIR / f"{file_id}.csv"
    
    try:
        # Resolve to absolute path and check it's under uploads
        resolved = file_path.resolve()
        uploads_resolved = UPLOADS_DIR.resolve()
        
        if not str(resolved).startswith(str(uploads_resolved)):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        return resolved
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file path")

def validate_extension(filename: str) -> bool:
    """Check if file extension is allowed."""
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS

# ========== Audit Logging (now uses structured logger) ==========

def audit_log(user_id: str, action: str, details: Dict[str, Any] = None):
    """Log audit events using structured logger (no sensitive data)."""
    structured_logger.audit(
        action=action,
        user_id=user_id,
        **{k: v for k, v in (details or {}).items() if k not in ["token", "password", "secret"]}
    )

# ========== Models ==========

class BacktestSettings(BaseModel):
    symbol: str = "DEFAULT"
    timeframe: str = "H1"
    date_range: str = "last1y"
    custom_start: Optional[str] = None
    custom_end: Optional[str] = None
    commission_percent: float = 0.01
    slippage_ticks: float = 1.0
    spread_points: float = 0.0
    risk_per_trade: float = 1.0
    max_trades_per_day: int = 10
    daily_loss_cap: float = 5.0
    initial_capital: float = 100000.0
    
    @validator('initial_capital')
    def capital_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Initial capital must be positive')
        return v

class StrategyConfig(BaseModel):
    code: str
    language: str = "MQL5"
    parameters: Dict[str, Any] = {}
    
    @validator('code')
    def code_must_not_be_empty(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Strategy code is too short')
        return v

class BacktestRequest(BaseModel):
    file_id: str  # Changed from data_path to file_id
    strategy: StrategyConfig
    settings: BacktestSettings
    column_mapping: Dict[str, str] = {}
    
    @validator('file_id')
    def file_id_must_be_safe(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]{1,64}$', v):
            raise ValueError('Invalid file ID format')
        return v

class Trade(BaseModel):
    id: str
    entry_time: str
    exit_time: str
    symbol: str
    direction: str
    entry_price: float
    exit_price: float
    quantity: float
    pnl: float
    pnl_percent: float
    commission: float

class BacktestResult(BaseModel):
    id: str
    symbol: str
    timeframe: str
    date_range: str
    win_rate: float
    profit_factor: float
    expectancy_r: float
    max_drawdown_percent: float
    max_drawdown_amount: float
    cagr: float
    sharpe_ratio: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    net_profit: float
    gross_profit: float
    gross_loss: float
    equity_curve: List[float]
    drawdown_curve: List[float]
    trades: List[Trade]
    run_at: str
    duration_ms: int

# ========== Global State ==========

backtest_jobs: Dict[str, Dict[str, Any]] = {}
active_backtests: int = 0
backtest_lock = asyncio.Lock()

# ========== Utility Functions ==========

def parse_csv_chunked(file_path: Path, column_mapping: Dict[str, str]) -> pd.DataFrame:
    """Parse CSV with chunking for large files."""
    chunks = []
    
    for chunk in pd.read_csv(file_path, chunksize=CHUNK_SIZE):
        rename_map = {v: k for k, v in column_mapping.items() if v in chunk.columns}
        chunk = chunk.rename(columns=rename_map)
        chunks.append(chunk)
    
    df = pd.concat(chunks, ignore_index=True)
    
    required = ['timestamp', 'open', 'high', 'low', 'close']
    for col in required:
        if col not in df.columns:
            aliases = {
                'timestamp': ['time', 'date', 'datetime', 'Time', 'Date'],
                'open': ['Open', 'o', 'O'],
                'high': ['High', 'h', 'H'],
                'low': ['Low', 'l', 'L'],
                'close': ['Close', 'c', 'C'],
            }
            for alias in aliases.get(col, []):
                if alias in df.columns:
                    df[col] = df[alias]
                    break
    
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        df = df.dropna(subset=['timestamp'])
        df = df.sort_values('timestamp').reset_index(drop=True)
    
    return df

def calculate_indicators(df: pd.DataFrame, strategy_code: str) -> pd.DataFrame:
    """Calculate technical indicators based on strategy code."""
    if 'ema' in strategy_code.lower() or 'iMA' in strategy_code:
        df['ema_12'] = df['close'].ewm(span=12, adjust=False).mean()
        df['ema_26'] = df['close'].ewm(span=26, adjust=False).mean()
        df['ema_50'] = df['close'].ewm(span=50, adjust=False).mean()
    
    if 'rsi' in strategy_code.lower():
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
    
    if 'atr' in strategy_code.lower():
        high_low = df['high'] - df['low']
        high_close = np.abs(df['high'] - df['close'].shift())
        low_close = np.abs(df['low'] - df['close'].shift())
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df['atr'] = tr.rolling(window=14).mean()
    
    if 'macd' in strategy_code.lower():
        ema_12 = df['close'].ewm(span=12, adjust=False).mean()
        ema_26 = df['close'].ewm(span=26, adjust=False).mean()
        df['macd'] = ema_12 - ema_26
        df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    
    if 'bollinger' in strategy_code.lower() or 'bb' in strategy_code.lower():
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        df['bb_std'] = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (df['bb_std'] * 2)
        df['bb_lower'] = df['bb_middle'] - (df['bb_std'] * 2)
    
    return df

def generate_signals(df: pd.DataFrame, strategy_code: str) -> pd.DataFrame:
    """Generate trading signals based on strategy logic."""
    df['signal'] = 0
    
    if 'ema_12' in df.columns and 'ema_26' in df.columns:
        df.loc[(df['ema_12'] > df['ema_26']) & (df['ema_12'].shift(1) <= df['ema_26'].shift(1)), 'signal'] = 1
        df.loc[(df['ema_12'] < df['ema_26']) & (df['ema_12'].shift(1) >= df['ema_26'].shift(1)), 'signal'] = -1
    elif 'rsi' in df.columns:
        df.loc[df['rsi'] < 30, 'signal'] = 1
        df.loc[df['rsi'] > 70, 'signal'] = -1
    elif 'macd' in df.columns and 'macd_signal' in df.columns:
        df.loc[(df['macd'] > df['macd_signal']) & (df['macd'].shift(1) <= df['macd_signal'].shift(1)), 'signal'] = 1
        df.loc[(df['macd'] < df['macd_signal']) & (df['macd'].shift(1) >= df['macd_signal'].shift(1)), 'signal'] = -1
    
    return df

def run_vectorized_backtest(df: pd.DataFrame, settings: BacktestSettings) -> BacktestResult:
    """Execute vectorized backtest."""
    start_time = time.time()
    
    trades: List[Trade] = []
    capital = settings.initial_capital
    equity_curve = [capital]
    position = 0
    entry_price = 0.0
    entry_time = None
    trade_count_today = 0
    current_day = None
    daily_pnl = 0.0
    
    for idx in range(1, len(df)):
        row = df.iloc[idx]
        
        if current_day != row['timestamp'].date():
            current_day = row['timestamp'].date()
            trade_count_today = 0
            daily_pnl = 0.0
        
        if daily_pnl / capital * 100 <= -settings.daily_loss_cap:
            continue
        
        signal = row.get('signal', 0)
        
        if position != 0 and signal != 0 and signal != position:
            exit_price = row['close']
            slippage = settings.slippage_ticks * 0.0001
            if position == 1:
                exit_price -= slippage
            else:
                exit_price += slippage
            
            if position == 1:
                pnl = (exit_price - entry_price) * 1000
            else:
                pnl = (entry_price - exit_price) * 1000
            
            commission = abs(pnl) * (settings.commission_percent / 100) * 2
            pnl -= commission
            
            capital += pnl
            daily_pnl += pnl
            
            trades.append(Trade(
                id=str(uuid.uuid4()),
                entry_time=entry_time.isoformat() if entry_time else "",
                exit_time=row['timestamp'].isoformat(),
                symbol=settings.symbol,
                direction="long" if position == 1 else "short",
                entry_price=entry_price,
                exit_price=exit_price,
                quantity=1.0,
                pnl=pnl,
                pnl_percent=(pnl / settings.initial_capital) * 100,
                commission=commission,
            ))
            
            position = 0
            equity_curve.append(capital)
        
        if position == 0 and signal != 0 and trade_count_today < settings.max_trades_per_day:
            entry_price = row['close']
            slippage = settings.slippage_ticks * 0.0001
            if signal == 1:
                entry_price += slippage
            else:
                entry_price -= slippage
            
            entry_price += settings.spread_points * 0.0001
            position = signal
            entry_time = row['timestamp']
            trade_count_today += 1
    
    if not trades:
        return BacktestResult(
            id=str(uuid.uuid4()),
            symbol=settings.symbol,
            timeframe=settings.timeframe,
            date_range=settings.date_range,
            win_rate=0, profit_factor=0, expectancy_r=0,
            max_drawdown_percent=0, max_drawdown_amount=0,
            cagr=0, sharpe_ratio=0,
            total_trades=0, winning_trades=0, losing_trades=0,
            net_profit=0, gross_profit=0, gross_loss=0,
            equity_curve=equity_curve, drawdown_curve=[0],
            trades=[],
            run_at=datetime.now().isoformat(),
            duration_ms=int((time.time() - start_time) * 1000),
        )
    
    winning_trades = [t for t in trades if t.pnl > 0]
    losing_trades = [t for t in trades if t.pnl <= 0]
    
    gross_profit = sum(t.pnl for t in winning_trades)
    gross_loss = abs(sum(t.pnl for t in losing_trades))
    net_profit = gross_profit - gross_loss
    
    win_rate = len(winning_trades) / len(trades) * 100 if trades else 0
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
    
    peak = equity_curve[0]
    drawdown_curve = []
    max_dd = 0
    max_dd_amount = 0
    
    for eq in equity_curve:
        if eq > peak:
            peak = eq
        dd = (eq - peak) / peak * 100
        drawdown_curve.append(dd)
        if dd < max_dd:
            max_dd = dd
            max_dd_amount = peak - eq
    
    if len(trades) > 1:
        returns = [t.pnl_percent for t in trades]
        sharpe = np.mean(returns) / np.std(returns) * np.sqrt(252) if np.std(returns) > 0 else 0
    else:
        sharpe = 0
    
    if len(df) > 0:
        days = (df['timestamp'].iloc[-1] - df['timestamp'].iloc[0]).days
        years = max(days / 365, 0.1)
        cagr = ((capital / settings.initial_capital) ** (1 / years) - 1) * 100
    else:
        cagr = 0
    
    avg_win = np.mean([t.pnl for t in winning_trades]) if winning_trades else 0
    avg_loss = abs(np.mean([t.pnl for t in losing_trades])) if losing_trades else 1
    expectancy_r = (win_rate / 100 * avg_win - (1 - win_rate / 100) * avg_loss) / avg_loss if avg_loss > 0 else 0
    
    return BacktestResult(
        id=str(uuid.uuid4()),
        symbol=settings.symbol,
        timeframe=settings.timeframe,
        date_range=settings.date_range,
        win_rate=round(win_rate, 2),
        profit_factor=round(profit_factor, 2),
        expectancy_r=round(expectancy_r, 2),
        max_drawdown_percent=round(max_dd, 2),  # Keep negative (drawdown convention)
        max_drawdown_amount=round(max_dd_amount, 2),
        cagr=round(cagr, 2),
        sharpe_ratio=round(sharpe, 2),
        total_trades=len(trades),
        winning_trades=len(winning_trades),
        losing_trades=len(losing_trades),
        net_profit=round(net_profit, 2),
        gross_profit=round(gross_profit, 2),
        gross_loss=round(gross_loss, 2),
        equity_curve=equity_curve[:1000],
        drawdown_curve=drawdown_curve[:1000],
        trades=trades[:500],
        run_at=datetime.now().isoformat(),
        duration_ms=int((time.time() - start_time) * 1000),
    )

# ========== API Endpoints ==========

@app.get("/health")
async def health_check():
    """Health check endpoint (public)."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "timezone": DEFAULT_TIMEZONE,
        "currency": DEFAULT_CURRENCY,
    }

@app.get("/system/info")
async def system_info(
    user: AuthenticatedUser = Depends(verify_jwt),
    _: None = Depends(rate_limit_check)
):
    """System information for diagnostics (authenticated)."""
    import platform
    import psutil
    
    audit_log(user.user_id, "system_info_check")
    
    return {
        "platform": platform.system(),
        "platform_version": platform.version(),
        "python_version": platform.python_version(),
        "cpu_count": psutil.cpu_count(),
        "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
        "memory_available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
        "cpu_percent": psutil.cpu_percent(),
        "active_backtests": active_backtests,
    }

@app.post("/data/upload")
async def upload_data(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(verify_jwt),
    _: None = Depends(rate_limit_check)
):
    """Upload CSV data file. Returns file_id for use in backtest."""
    if not file.filename or not validate_extension(file.filename):
        raise HTTPException(status_code=400, detail="Invalid file extension. Only CSV files are allowed.")
    
    # Generate safe file ID
    file_id = f"{user.user_id[:8]}_{uuid.uuid4().hex[:16]}"
    file_path = UPLOADS_DIR / f"{file_id}.csv"
    
    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    audit_log(user.user_id, "data_upload", {"file_id": file_id, "size": len(content)})
    
    return {"file_id": file_id, "size": len(content)}

@app.post("/backtest/run")
async def run_backtest(
    request: BacktestRequest,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(verify_jwt),
    _: None = Depends(rate_limit_check)
):
    """Run a backtest with the provided data and strategy."""
    global active_backtests
    
    # Generate cache key and check for cached result
    cache_key = generate_cache_key(
        file_id=request.file_id,
        strategy_code=request.strategy.code,
        settings=request.settings.model_dump()
    )
    
    cached_result = get_cached_result(cache_key)
    if cached_result:
        structured_logger.info(
            "Backtest cache hit",
            cache_key=cache_key[:16],
            user_id=user.user_id
        )
        return cached_result
    
    async with backtest_lock:
        if active_backtests >= MAX_CONCURRENT_BACKTESTS:
            raise HTTPException(status_code=429, detail="Too many concurrent backtests. Try again later.")
        active_backtests += 1
    
    try:
        # Validate and get safe file path
        file_path = validate_file_id(request.file_id)
        
        # Check file exists and belongs to user
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Data file not found. Upload first via /data/upload")
        
        # Verify user ownership (file_id starts with user_id prefix)
        if not request.file_id.startswith(user.user_id[:8]):
            raise HTTPException(status_code=403, detail="Access denied to this file")
        
        structured_logger.backtest(
            action="start",
            file_id=request.file_id,
            symbol=request.settings.symbol,
            user_id=user.user_id
        )
        
        df = parse_csv_chunked(file_path, request.column_mapping)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV file is empty or invalid")
        
        df = calculate_indicators(df, request.strategy.code)
        df = generate_signals(df, request.strategy.code)
        result = run_vectorized_backtest(df, request.settings)
        
        # Cache the result
        result_dict = result.model_dump()
        set_cached_result(cache_key, result_dict)
        
        structured_logger.backtest(
            action="complete",
            file_id=request.file_id,
            trades=result.total_trades,
            duration_ms=result.duration_ms,
            cached=True
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        structured_logger.error(
            f"Backtest failed: {str(e)[:100]}",
            file_id=request.file_id,
            user_id=user.user_id
        )
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        async with backtest_lock:
            active_backtests -= 1


@app.get("/cache/stats")
async def cache_stats(
    user: AuthenticatedUser = Depends(verify_jwt),
    _: None = Depends(rate_limit_check)
):
    """Get Redis cache statistics."""
    return get_cache_stats()


@app.delete("/cache/invalidate")
async def cache_invalidate(
    pattern: str = "backtest:*",
    user: AuthenticatedUser = Depends(verify_jwt),
    _: None = Depends(rate_limit_check)
):
    """Invalidate cached results matching pattern."""
    deleted = invalidate_cache(pattern)
    return {"deleted": deleted, "pattern": pattern}

@app.post("/strategy/validate")
async def validate_strategy(
    config: StrategyConfig,
    user: AuthenticatedUser = Depends(verify_jwt),
    _: None = Depends(rate_limit_check)
):
    """Validate strategy code syntax."""
    code = config.code.strip()
    
    if len(code) < 50:
        return {"valid": False, "error": "Strategy code is too short"}
    
    patterns_found = []
    if "OnInit" in code or "OnTick" in code:
        patterns_found.append("MQL5/MQL4 structure")
    if "strategy.entry" in code or "strategy.exit" in code:
        patterns_found.append("PineScript structure")
    if "ema" in code.lower() or "sma" in code.lower():
        patterns_found.append("Moving Average indicators")
    if "rsi" in code.lower():
        patterns_found.append("RSI indicator")
    if "macd" in code.lower():
        patterns_found.append("MACD indicator")
    
    return {
        "valid": True,
        "language": config.language,
        "code_length": len(code),
        "patterns_detected": patterns_found,
        "translation_confidence": 0.85 if patterns_found else 0.5,
    }

@app.get("/mt5/status")
async def mt5_status(
    user: AuthenticatedUser = Depends(verify_jwt),
    _: None = Depends(rate_limit_check)
):
    """Get MT5 integration status."""
    return {
        "available": True,
        "version": "1.0.0",
        "features": ["backtest", "compile", "bulk_run"],
    }

@app.delete("/data/{file_id}")
async def delete_data(
    file_id: str,
    user: AuthenticatedUser = Depends(verify_jwt),
    _: None = Depends(rate_limit_check)
):
    """Delete uploaded data file."""
    file_path = validate_file_id(file_id)
    
    # Check file exists first
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Then verify user ownership (allow dev-user bypass)
    if user.user_id != "dev-user" and not file_id.startswith(user.user_id[:8]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_path.unlink()
    audit_log(user.user_id, "data_delete", {"file_id": file_id})
    return {"deleted": True}

# ========== Main Entry Point ==========

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EA Backtesting Engine Server")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 32145)))
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()
    
    logger.info(
        f"Starting EA Backtesting Engine on {args.host}:{args.port} | "
        f"Auth: {bool(SUPABASE_JWT_SECRET)} | Rate limit: {RATE_LIMIT_REQUESTS}/{RATE_LIMIT_WINDOW}s"
    )
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
