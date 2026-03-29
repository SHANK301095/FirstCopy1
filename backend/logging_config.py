"""
Structured JSON Logging with Correlation IDs

Provides centralized logging configuration with:
- JSON formatted output for log aggregation
- Correlation IDs for request tracing
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Context managers for request-scoped logging
"""

import logging
import json
import sys
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from contextvars import ContextVar
from functools import wraps

# Context variable for correlation ID (thread/async-safe)
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


class CorrelationIdFilter(logging.Filter):
    """Add correlation_id to all log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = correlation_id_var.get() or "-"
        return True


class JSONFormatter(logging.Formatter):
    """Format log records as JSON for structured logging."""
    
    def __init__(self, service_name: str = "backtest-engine"):
        super().__init__()
        self.service_name = service_name
    
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service_name,
            "correlation_id": getattr(record, "correlation_id", "-"),
        }
        
        # Add location info
        log_obj["location"] = {
            "file": record.filename,
            "line": record.lineno,
            "function": record.funcName,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_obj["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info) if record.exc_info[2] else None,
            }
        
        # Add extra fields
        extra_keys = set(record.__dict__.keys()) - {
            "name", "msg", "args", "created", "filename", "funcName",
            "levelname", "levelno", "lineno", "module", "msecs",
            "pathname", "process", "processName", "relativeCreated",
            "stack_info", "exc_info", "exc_text", "thread", "threadName",
            "message", "correlation_id"
        }
        
        if extra_keys:
            log_obj["extra"] = {k: record.__dict__[k] for k in extra_keys}
        
        return json.dumps(log_obj, default=str)


class ConsoleFormatter(logging.Formatter):
    """Human-readable console formatter with colors."""
    
    COLORS = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"
    
    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, "")
        correlation_id = getattr(record, "correlation_id", "-")
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        prefix = f"{color}[{timestamp}] [{record.levelname:8}]{self.RESET}"
        corr = f"[{correlation_id[:8]}]" if correlation_id != "-" else ""
        
        return f"{prefix} {corr} {record.getMessage()}"


def get_correlation_id() -> str:
    """Get current correlation ID or generate new one."""
    cid = correlation_id_var.get()
    if not cid:
        cid = str(uuid.uuid4())
        correlation_id_var.set(cid)
    return cid


def set_correlation_id(cid: Optional[str] = None) -> str:
    """Set correlation ID for current context."""
    if cid is None:
        cid = str(uuid.uuid4())
    correlation_id_var.set(cid)
    return cid


def clear_correlation_id() -> None:
    """Clear correlation ID after request completes."""
    correlation_id_var.set("")


class RequestContext:
    """Context manager for request-scoped logging."""
    
    def __init__(self, correlation_id: Optional[str] = None):
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.previous_id: Optional[str] = None
    
    def __enter__(self) -> str:
        self.previous_id = correlation_id_var.get()
        correlation_id_var.set(self.correlation_id)
        return self.correlation_id
    
    def __exit__(self, *args) -> None:
        correlation_id_var.set(self.previous_id or "")


def with_correlation_id(func):
    """Decorator to ensure function runs with correlation ID."""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        with RequestContext():
            return await func(*args, **kwargs)
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        with RequestContext():
            return func(*args, **kwargs)
    
    import asyncio
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper


def setup_logging(
    level: str = "INFO",
    json_format: bool = True,
    service_name: str = "backtest-engine"
) -> logging.Logger:
    """
    Configure structured logging for the application.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Use JSON format (True) or human-readable (False)
        service_name: Service name for log records
    
    Returns:
        Root logger configured with structured logging
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    
    # Add correlation ID filter
    console_handler.addFilter(CorrelationIdFilter())
    
    # Set formatter based on preference
    if json_format:
        console_handler.setFormatter(JSONFormatter(service_name))
    else:
        console_handler.setFormatter(ConsoleFormatter())
    
    root_logger.addHandler(console_handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name."""
    return logging.getLogger(name)


# Convenience functions for common log patterns
class StructuredLogger:
    """Wrapper for structured logging with extra context."""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def _log(self, level: int, msg: str, **extra):
        self.logger.log(level, msg, extra=extra)
    
    def debug(self, msg: str, **extra):
        self._log(logging.DEBUG, msg, **extra)
    
    def info(self, msg: str, **extra):
        self._log(logging.INFO, msg, **extra)
    
    def warning(self, msg: str, **extra):
        self._log(logging.WARNING, msg, **extra)
    
    def error(self, msg: str, **extra):
        self._log(logging.ERROR, msg, **extra)
    
    def critical(self, msg: str, **extra):
        self._log(logging.CRITICAL, msg, **extra)
    
    def audit(self, action: str, user_id: str, **details):
        """Log audit event with standard structure."""
        self.info(
            f"AUDIT: {action}",
            audit=True,
            action=action,
            user_id=user_id,
            **{k: v for k, v in details.items() if k not in ["token", "password", "secret"]}
        )
    
    def request(self, method: str, path: str, status: int, duration_ms: float, **extra):
        """Log HTTP request with standard structure."""
        self.info(
            f"{method} {path} - {status} ({duration_ms:.1f}ms)",
            request=True,
            method=method,
            path=path,
            status_code=status,
            duration_ms=duration_ms,
            **extra
        )
    
    def backtest(self, action: str, **details):
        """Log backtest-related events."""
        self.info(
            f"BACKTEST: {action}",
            backtest=True,
            action=action,
            **details
        )


# Default logger instance
logger = StructuredLogger("backtest-engine")
