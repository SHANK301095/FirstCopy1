# EA Backtesting Engine - Docker Configuration
# Multi-stage build for optimized production image

# ========== Build Stage ==========
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install test dependencies (for CI)
RUN pip install --no-cache-dir pytest pytest-cov pytest-asyncio httpx


# ========== Production Stage ==========
FROM python:3.11-slim as production

WORKDIR /app

# Create non-root user for security
RUN groupadd -r backtest && useradd -r -g backtest backtest

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY main.py .
COPY tests/ ./tests/

# Create data directories
RUN mkdir -p /app/data/uploads && \
    chown -R backtest:backtest /app

# Switch to non-root user
USER backtest

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["sh", "-c", "uvicorn main:app --host ${HOST} --port ${PORT}"]


# ========== Development Stage ==========
FROM production as development

USER root

# Install dev dependencies
RUN pip install --no-cache-dir watchfiles

USER backtest

# Enable hot reload for development
CMD ["sh", "-c", "uvicorn main:app --host ${HOST} --port ${PORT} --reload"]
