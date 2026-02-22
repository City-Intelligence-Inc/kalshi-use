from unittest.mock import MagicMock, patch

# Mock boto3 before importing the app to prevent AWS connections at import
mock_s3 = MagicMock()
mock_s3.head_bucket.side_effect = Exception("mocked")

with (
    patch("boto3.resource") as mock_resource,
    patch("boto3.client", return_value=mock_s3),
):
    mock_table = MagicMock()
    mock_resource.return_value.Table.return_value = mock_table
    from backend.main import app

from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "hello"}


def test_list_models():
    response = client.get("/models")
    assert response.status_code == 200
    models = response.json()
    names = [m["name"] for m in models]
    assert "random" in names
    assert "taruns_model" in names
