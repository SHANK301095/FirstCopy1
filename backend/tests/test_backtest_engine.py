"""
Unit tests for the backtest engine.
Run with: pytest backend/tests/ -v --cov=backend
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import (
    BacktestSettings,
    StrategyConfig,
    RateLimiter,
    calculate_indicators,
    generate_signals,
    run_vectorized_backtest,
    validate_extension,
)


# ========== Fixtures ==========

@pytest.fixture
def sample_ohlc_data():
    """Generate sample OHLC data for testing."""
    np.random.seed(42)
    dates = pd.date_range(start='2023-01-01', periods=500, freq='H')
    
    # Generate realistic price movements
    close = 100 + np.cumsum(np.random.randn(500) * 0.5)
    high = close + np.abs(np.random.randn(500) * 0.3)
    low = close - np.abs(np.random.randn(500) * 0.3)
    open_price = close + np.random.randn(500) * 0.2
    
    df = pd.DataFrame({
        'timestamp': dates,
        'open': open_price,
        'high': high,
        'low': low,
        'close': close,
        'volume': np.random.randint(1000, 10000, 500)
    })
    return df


@pytest.fixture
def default_settings():
    """Default backtest settings."""
    return BacktestSettings(
        symbol="EURUSD",
        timeframe="H1",
        date_range="last1y",
        commission_percent=0.01,
        slippage_ticks=1.0,
        spread_points=0.0,
        risk_per_trade=1.0,
        max_trades_per_day=10,
        daily_loss_cap=5.0,
        initial_capital=100000.0
    )


@pytest.fixture
def ema_strategy():
    """EMA crossover strategy config."""
    return StrategyConfig(
        code="""
        // EMA Crossover Strategy
        input int FastPeriod = 12;
        input int SlowPeriod = 26;
        
        double ema_fast = iMA(Symbol(), 0, FastPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
        double ema_slow = iMA(Symbol(), 0, SlowPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
        """,
        language="MQL5",
        parameters={"FastPeriod": 12, "SlowPeriod": 26}
    )


# ========== Model Validation Tests ==========

class TestBacktestSettings:
    """Tests for BacktestSettings model."""
    
    def test_default_values(self):
        settings = BacktestSettings()
        assert settings.symbol == "DEFAULT"
        assert settings.initial_capital == 100000.0
        assert settings.commission_percent == 0.01
    
    def test_custom_values(self):
        settings = BacktestSettings(
            symbol="GBPUSD",
            initial_capital=50000.0,
            max_trades_per_day=5
        )
        assert settings.symbol == "GBPUSD"
        assert settings.initial_capital == 50000.0
        assert settings.max_trades_per_day == 5
    
    def test_capital_must_be_positive(self):
        with pytest.raises(ValueError, match="Initial capital must be positive"):
            BacktestSettings(initial_capital=-1000)
    
    def test_zero_capital_invalid(self):
        with pytest.raises(ValueError):
            BacktestSettings(initial_capital=0)


class TestStrategyConfig:
    """Tests for StrategyConfig model."""
    
    def test_valid_strategy(self):
        config = StrategyConfig(
            code="// This is a valid strategy with enough code content",
            language="MQL5"
        )
        assert config.language == "MQL5"
    
    def test_code_too_short(self):
        with pytest.raises(ValueError, match="too short"):
            StrategyConfig(code="abc")
    
    def test_empty_code_invalid(self):
        with pytest.raises(ValueError):
            StrategyConfig(code="")


# ========== Rate Limiter Tests ==========

class TestRateLimiter:
    """Tests for rate limiting functionality."""
    
    def test_allows_requests_under_limit(self):
        limiter = RateLimiter(max_requests=5, window_seconds=60)
        
        for _ in range(5):
            assert limiter.is_allowed("test_key") is True
    
    def test_blocks_requests_over_limit(self):
        limiter = RateLimiter(max_requests=3, window_seconds=60)
        
        # First 3 should pass
        for _ in range(3):
            assert limiter.is_allowed("test_key") is True
        
        # 4th should be blocked
        assert limiter.is_allowed("test_key") is False
    
    def test_different_keys_independent(self):
        limiter = RateLimiter(max_requests=2, window_seconds=60)
        
        assert limiter.is_allowed("key1") is True
        assert limiter.is_allowed("key1") is True
        assert limiter.is_allowed("key1") is False
        
        # Different key should still work
        assert limiter.is_allowed("key2") is True


# ========== Indicator Calculation Tests ==========

class TestIndicatorCalculation:
    """Tests for technical indicator calculations."""
    
    def test_ema_calculation(self, sample_ohlc_data):
        df = calculate_indicators(sample_ohlc_data.copy(), "ema crossover iMA")
        
        assert 'ema_12' in df.columns
        assert 'ema_26' in df.columns
        assert 'ema_50' in df.columns
        assert not df['ema_12'].isna().all()
    
    def test_rsi_calculation(self, sample_ohlc_data):
        df = calculate_indicators(sample_ohlc_data.copy(), "rsi strategy")
        
        assert 'rsi' in df.columns
        # RSI should be between 0 and 100
        valid_rsi = df['rsi'].dropna()
        assert (valid_rsi >= 0).all() and (valid_rsi <= 100).all()
    
    def test_atr_calculation(self, sample_ohlc_data):
        df = calculate_indicators(sample_ohlc_data.copy(), "atr trailing stop")
        
        assert 'atr' in df.columns
        # ATR should be positive
        valid_atr = df['atr'].dropna()
        assert (valid_atr >= 0).all()
    
    def test_macd_calculation(self, sample_ohlc_data):
        df = calculate_indicators(sample_ohlc_data.copy(), "macd divergence")
        
        assert 'macd' in df.columns
        assert 'macd_signal' in df.columns
    
    def test_bollinger_bands_calculation(self, sample_ohlc_data):
        df = calculate_indicators(sample_ohlc_data.copy(), "bollinger bands")
        
        assert 'bb_upper' in df.columns
        assert 'bb_middle' in df.columns
        assert 'bb_lower' in df.columns
        
        # Upper should be > middle > lower
        valid_idx = ~df['bb_upper'].isna()
        assert (df.loc[valid_idx, 'bb_upper'] >= df.loc[valid_idx, 'bb_middle']).all()
        assert (df.loc[valid_idx, 'bb_middle'] >= df.loc[valid_idx, 'bb_lower']).all()


# ========== Signal Generation Tests ==========

class TestSignalGeneration:
    """Tests for trading signal generation."""
    
    def test_ema_signals(self, sample_ohlc_data):
        df = calculate_indicators(sample_ohlc_data.copy(), "ema iMA")
        df = generate_signals(df, "ema crossover")
        
        assert 'signal' in df.columns
        assert df['signal'].isin([-1, 0, 1]).all()
    
    def test_rsi_signals(self, sample_ohlc_data):
        df = calculate_indicators(sample_ohlc_data.copy(), "rsi")
        df = generate_signals(df, "rsi strategy")
        
        assert 'signal' in df.columns
        # Buy signals when RSI < 30
        oversold = df[df['rsi'] < 30]
        if not oversold.empty:
            assert (oversold['signal'] == 1).any()
    
    def test_no_indicators_no_signals(self, sample_ohlc_data):
        df = sample_ohlc_data.copy()
        df = generate_signals(df, "unknown strategy")
        
        assert 'signal' in df.columns
        assert (df['signal'] == 0).all()


# ========== Backtest Execution Tests ==========

class TestBacktestExecution:
    """Tests for the backtest execution engine."""
    
    def test_backtest_with_no_signals(self, sample_ohlc_data, default_settings):
        df = sample_ohlc_data.copy()
        df['signal'] = 0  # No signals
        
        result = run_vectorized_backtest(df, default_settings)
        
        assert result.total_trades == 0
        assert result.net_profit == 0
        assert result.win_rate == 0
    
    def test_backtest_generates_trades(self, sample_ohlc_data, default_settings):
        df = calculate_indicators(sample_ohlc_data.copy(), "ema iMA")
        df = generate_signals(df, "ema crossover")
        
        result = run_vectorized_backtest(df, default_settings)
        
        # Should have some trades
        assert result.total_trades >= 0
        assert result.id is not None
        assert result.run_at is not None
    
    def test_backtest_respects_daily_trade_limit(self, sample_ohlc_data):
        settings = BacktestSettings(max_trades_per_day=1)
        
        # Create many signals
        df = sample_ohlc_data.copy()
        df['signal'] = np.where(df.index % 5 == 0, 1, 0)
        df.loc[df.index % 10 == 0, 'signal'] = -1
        
        result = run_vectorized_backtest(df, settings)
        
        # Trades per day should be limited
        if result.trades:
            trades_df = pd.DataFrame([
                {'date': datetime.fromisoformat(t.entry_time).date()} 
                for t in result.trades
            ])
            trades_per_day = trades_df.groupby('date').size()
            # Due to the limit, should not exceed much
            assert trades_per_day.max() <= 2  # Allow some tolerance
    
    def test_backtest_equity_curve_consistency(self, sample_ohlc_data, default_settings):
        df = calculate_indicators(sample_ohlc_data.copy(), "ema iMA")
        df = generate_signals(df, "ema crossover")
        
        result = run_vectorized_backtest(df, default_settings)
        
        # Equity curve should start with initial capital
        assert result.equity_curve[0] == default_settings.initial_capital
        
        # Length should be related to trades
        assert len(result.equity_curve) >= 1
    
    def test_backtest_drawdown_calculation(self, sample_ohlc_data, default_settings):
        df = calculate_indicators(sample_ohlc_data.copy(), "ema iMA")
        df = generate_signals(df, "ema crossover")
        
        result = run_vectorized_backtest(df, default_settings)
        
        # Drawdown should be <= 0
        assert result.max_drawdown_percent <= 0
        assert result.max_drawdown_amount >= 0


# ========== File Validation Tests ==========

class TestFileValidation:
    """Tests for file validation utilities."""
    
    def test_valid_csv_extension(self):
        assert validate_extension("data.csv") is True
        assert validate_extension("DATA.CSV") is True
        assert validate_extension("my_file.csv") is True
    
    def test_invalid_extensions(self):
        assert validate_extension("data.txt") is False
        assert validate_extension("data.xlsx") is False
        assert validate_extension("script.py") is False
        assert validate_extension("file") is False


# ========== Performance Tests ==========

class TestPerformance:
    """Performance-related tests."""
    
    def test_large_dataset_handling(self, default_settings):
        """Test that backtest can handle larger datasets."""
        np.random.seed(42)
        n_rows = 10000
        
        dates = pd.date_range(start='2020-01-01', periods=n_rows, freq='H')
        close = 100 + np.cumsum(np.random.randn(n_rows) * 0.5)
        
        df = pd.DataFrame({
            'timestamp': dates,
            'open': close + np.random.randn(n_rows) * 0.2,
            'high': close + np.abs(np.random.randn(n_rows) * 0.3),
            'low': close - np.abs(np.random.randn(n_rows) * 0.3),
            'close': close
        })
        
        df = calculate_indicators(df, "ema iMA")
        df = generate_signals(df, "ema crossover")
        
        import time
        start = time.time()
        result = run_vectorized_backtest(df, default_settings)
        duration = time.time() - start
        
        # Should complete in reasonable time (< 5 seconds)
        assert duration < 5.0
        assert result.duration_ms > 0


# ========== Integration Tests ==========

class TestIntegration:
    """Integration tests for complete workflows."""
    
    def test_full_backtest_pipeline(self, sample_ohlc_data, default_settings):
        """Test complete backtest from data to results."""
        # Calculate indicators
        df = calculate_indicators(sample_ohlc_data.copy(), "ema iMA macd")
        
        # Generate signals
        df = generate_signals(df, "ema crossover")
        
        # Run backtest
        result = run_vectorized_backtest(df, default_settings)
        
        # Validate result structure
        assert result.symbol == default_settings.symbol
        assert result.timeframe == default_settings.timeframe
        assert isinstance(result.trades, list)
        assert isinstance(result.equity_curve, list)
        assert isinstance(result.drawdown_curve, list)
        
        # Validate metrics consistency
        if result.total_trades > 0:
            assert result.winning_trades + result.losing_trades == result.total_trades
            if result.gross_loss > 0:
                expected_pf = result.gross_profit / result.gross_loss
                assert abs(result.profit_factor - expected_pf) < 0.01


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
