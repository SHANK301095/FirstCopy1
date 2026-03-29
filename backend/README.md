# EA Backtesting Engine - Backend

Vectorized backtesting engine with JWT authentication, rate limiting, and Docker support.

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Development mode (with hot reload)
docker-compose up

# Production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Run tests
docker-compose run --rm test
```

### Option 2: Local Python

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
DEV_AUTH_BYPASS=1 uvicorn main:app --reload --port 8000

# Run tests
pytest tests/ -v --cov=. --cov-report=html
```

## 📁 Project Structure

```
backend/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Development compose
├── docker-compose.prod.yml # Production overrides
├── pytest.ini             # Pytest configuration
└── tests/
    ├── __init__.py
    ├── test_backtest_engine.py  # Unit tests
    └── test_api_endpoints.py    # API tests
```

## 🔌 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | ❌ | Health check |
| `/system/info` | GET | ✅ | System diagnostics |
| `/data/upload` | POST | ✅ | Upload CSV data |
| `/data/{file_id}` | DELETE | ✅ | Delete uploaded data |
| `/backtest/run` | POST | ✅ | Execute backtest |
| `/strategy/validate` | POST | ✅ | Validate strategy code |
| `/mt5/status` | GET | ✅ | MT5 integration status |

## 📚 API Documentation

FastAPI auto-generates OpenAPI docs:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_JWT_SECRET` | Prod: Yes | - | JWT secret for auth |
| `SUPABASE_URL` | No | - | Supabase project URL |
| `DEV_AUTH_BYPASS` | Dev only | `0` | Skip auth in dev (`1` to enable) |
| `PRODUCTION` | No | `0` | Production mode flag |
| `ALLOWED_ORIGINS` | No | `*` | CORS allowed origins |
| `PORT` | No | `8000` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=. --cov-report=html

# Run specific test file
pytest tests/test_backtest_engine.py -v

# Run specific test class
pytest tests/test_backtest_engine.py::TestIndicatorCalculation -v

# Run only fast tests (exclude slow)
pytest tests/ -v -m "not slow"
```

### Test Coverage

Tests cover:
- ✅ Model validation (BacktestSettings, StrategyConfig)
- ✅ Rate limiting logic
- ✅ Technical indicator calculations (EMA, RSI, MACD, ATR, Bollinger)
- ✅ Signal generation
- ✅ Backtest execution engine
- ✅ API endpoint authentication
- ✅ File validation & path security
- ✅ Performance benchmarks

## 🛡️ Security Features

1. **JWT Authentication** - Supabase JWT verification
2. **Rate Limiting** - 100 requests per 60 seconds per IP
3. **Path Traversal Prevention** - Safe file ID validation
4. **Input Validation** - Pydantic model validation
5. **Audit Logging** - Security event logging
6. **CORS** - Configurable allowed origins
7. **Non-root Docker** - Runs as unprivileged user

## 📊 Supported Indicators

The engine auto-detects and calculates indicators based on strategy code:

- **EMA** (Exponential Moving Average) - 12, 26, 50 periods
- **RSI** (Relative Strength Index) - 14 period
- **MACD** (Moving Average Convergence Divergence)
- **ATR** (Average True Range) - 14 period
- **Bollinger Bands** - 20 period, 2 std dev

## 🔄 Redis Cache (Optional)

Enable Redis for caching backtest results:

```bash
docker-compose --profile with-cache up
```

## 📈 Performance

- Handles 10,000+ rows in < 5 seconds
- Chunked CSV parsing for memory efficiency
- Vectorized operations with NumPy/Pandas
- Concurrent backtest limiting (max 5)

## 🤝 Contributing

1. Run tests before committing: `pytest tests/ -v`
2. Ensure code coverage doesn't drop
3. Follow existing code style
4. Update tests for new features
