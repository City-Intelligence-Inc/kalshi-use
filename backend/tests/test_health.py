from unittest.mock import MagicMock, patch

# Mock boto3 before importing the app to prevent DynamoDB connection at import
with patch("boto3.resource") as mock_resource:
    mock_table = MagicMock()
    mock_resource.return_value.Table.return_value = mock_table
    from backend.main import app

from fastapi.testclient import TestClient

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "hello"}
