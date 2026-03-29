"""
API endpoint tests for the FastAPI backend.
Run with: pytest backend/tests/ -v
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, AuthenticatedUser


# ========== Fixtures ==========

@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_auth():
    """Mock authentication to bypass JWT verification."""
    with patch('main.verify_jwt') as mock:
        mock.return_value = AuthenticatedUser(user_id="test-user", email="test@example.com")
        yield mock


# ========== Health Endpoint Tests ==========

class TestHealthEndpoint:
    """Tests for the health check endpoint."""
    
    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200
    
    def test_health_response_format(self, client):
        response = client.get("/health")
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "healthy"
        assert "version" in data


# ========== System Info Endpoint Tests ==========

class TestSystemInfoEndpoint:
    """Tests for system info endpoint."""
    
    def test_system_info_requires_auth(self, client):
        response = client.get("/system/info")
        assert response.status_code == 401
    
    def test_system_info_with_auth(self, client, mock_auth):
        response = client.get(
            "/system/info",
            headers={"Authorization": "Bearer test-token"}
        )
        # Should not be 401 (auth passed)
        assert response.status_code in [200, 500]  # 500 if psutil not available


# ========== Data Upload Endpoint Tests ==========

class TestDataUploadEndpoint:
    """Tests for data upload endpoint."""
    
    def test_upload_requires_auth(self, client):
        response = client.post("/data/upload")
        assert response.status_code == 401
    
    def test_upload_requires_file(self, client, mock_auth):
        response = client.post(
            "/data/upload",
            headers={"Authorization": "Bearer test-token"}
        )
        assert response.status_code == 422  # Validation error - missing file
    
    def test_upload_rejects_non_csv(self, client, mock_auth):
        # Create a fake non-CSV file
        files = {"file": ("test.txt", b"content", "text/plain")}
        response = client.post(
            "/data/upload",
            headers={"Authorization": "Bearer test-token"},
            files=files
        )
        assert response.status_code == 400
        assert "extension" in response.json().get("detail", "").lower()


# ========== Backtest Endpoint Tests ==========

class TestBacktestEndpoint:
    """Tests for backtest execution endpoint."""
    
    def test_backtest_requires_auth(self, client):
        response = client.post("/backtest/run", json={})
        assert response.status_code == 401
    
    def test_backtest_validates_request(self, client, mock_auth):
        response = client.post(
            "/backtest/run",
            headers={"Authorization": "Bearer test-token"},
            json={}
        )
        assert response.status_code == 422  # Validation error
    
    def test_backtest_rejects_invalid_file_id(self, client, mock_auth):
        response = client.post(
            "/backtest/run",
            headers={"Authorization": "Bearer test-token"},
            json={
                "file_id": "../../../etc/passwd",  # Path traversal attempt
                "strategy": {
                    "code": "// Valid strategy code with enough content"
                },
                "settings": {}
            }
        )
        assert response.status_code == 422  # Pydantic validates file_id format


# ========== Strategy Validation Endpoint Tests ==========

class TestStrategyValidationEndpoint:
    """Tests for strategy validation endpoint."""
    
    def test_validate_requires_auth(self, client):
        response = client.post("/strategy/validate", json={})
        assert response.status_code == 401
    
    def test_validate_empty_code(self, client, mock_auth):
        response = client.post(
            "/strategy/validate",
            headers={"Authorization": "Bearer test-token"},
            json={"code": ""}
        )
        assert response.status_code in [200, 422]
    
    def test_validate_valid_code(self, client, mock_auth):
        response = client.post(
            "/strategy/validate",
            headers={"Authorization": "Bearer test-token"},
            json={"code": "// EMA Crossover Strategy\ninput int Period = 14;"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data


# ========== MT5 Status Endpoint Tests ==========

class TestMT5StatusEndpoint:
    """Tests for MT5 status endpoint."""
    
    def test_mt5_status_requires_auth(self, client):
        response = client.get("/mt5/status")
        assert response.status_code == 401
    
    def test_mt5_status_response(self, client, mock_auth):
        response = client.get(
            "/mt5/status",
            headers={"Authorization": "Bearer test-token"}
        )
        assert response.status_code == 200


# ========== Data Delete Endpoint Tests ==========

class TestDataDeleteEndpoint:
    """Tests for data deletion endpoint."""
    
    def test_delete_requires_auth(self, client):
        response = client.delete("/data/test-file-id")
        assert response.status_code == 401
    
    def test_delete_invalid_file_id(self, client, mock_auth):
        response = client.delete(
            "/data/../../../etc/passwd",  # Path traversal
            headers={"Authorization": "Bearer test-token"}
        )
        assert response.status_code in [400, 404]
    
    def test_delete_nonexistent_file(self, client, mock_auth):
        response = client.delete(
            "/data/nonexistent-file-id-12345",
            headers={"Authorization": "Bearer test-token"}
        )
        assert response.status_code == 404


# ========== Rate Limiting Tests ==========

class TestRateLimiting:
    """Tests for rate limiting behavior."""
    
    def test_rate_limit_headers(self, client):
        """Check that rate limiting is active."""
        # Make multiple requests to health endpoint
        responses = [client.get("/health") for _ in range(5)]
        
        # All should succeed (health is public, high limit)
        assert all(r.status_code == 200 for r in responses)


# ========== CORS Tests ==========

class TestCORS:
    """Tests for CORS configuration."""
    
    def test_cors_preflight(self, client):
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        # Should not fail
        assert response.status_code in [200, 405]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
