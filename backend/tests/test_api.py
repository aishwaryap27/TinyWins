from unittest.mock import patch

from botocore.exceptions import ClientError
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("app.main._invoke")
def test_plan_returns_exactly_three_steps(mock_invoke):
    mock_invoke.return_value = (
        '{"steps":['
        '{"title":"Open your notes","minutes":2,"explanation":"Gather your materials."},'
        '{"title":"Review one topic","minutes":8,"explanation":"Start with a manageable section."},'
        '{"title":"Write three questions","minutes":5,"explanation":"Notice what to revisit."}'
        ']}'
    )
    response = client.post(
        "/api/plan",
        json={"task": "Study biology", "available_minutes": 20, "energy": "Low"},
    )
    assert response.status_code == 200
    assert len(response.json()["steps"]) == 3
    mock_invoke.assert_called_once()
    assert "20 minutes total" in mock_invoke.call_args.args[0]
    assert "Low" in mock_invoke.call_args.args[0]


@patch("app.main._invoke")
def test_smaller_step_returns_single_step(mock_invoke):
    mock_invoke.return_value = (
        '{"step":{"title":"Find your notebook","minutes":1,'
        '"explanation":"Just put it on your desk."}}'
    )
    response = client.post(
        "/api/steps/smaller",
        json={
            "task": "Study biology",
            "step": {
                "title": "Review one topic",
                "minutes": 8,
                "explanation": "Start with a manageable section.",
            },
            "energy": "Low",
        },
    )
    assert response.status_code == 200
    assert response.json()["step"]["title"] == "Find your notebook"


def test_plan_rejects_invalid_time():
    response = client.post(
        "/api/plan",
        json={"task": "Study biology", "available_minutes": 15, "energy": "Low"},
    )
    assert response.status_code == 422


@patch("app.main._invoke")
def test_plan_rejects_steps_that_exceed_available_time(mock_invoke):
    mock_invoke.return_value = (
        '{"steps":['
        '{"title":"First","minutes":10,"explanation":"Begin."},'
        '{"title":"Second","minutes":8,"explanation":"Continue."},'
        '{"title":"Third","minutes":5,"explanation":"Finish."}'
        ']}'
    )
    response = client.post(
        "/api/plan",
        json={"task": "Study biology", "available_minutes": 20, "energy": "Medium"},
    )
    assert response.status_code == 502
    assert "don’t fit" in response.json()["detail"]


@patch("app.main._invoke")
def test_plan_reports_unreadable_model_output(mock_invoke):
    mock_invoke.return_value = "not json"
    response = client.post(
        "/api/plan",
        json={"task": "Study biology", "available_minutes": 20, "energy": "Medium"},
    )
    assert response.status_code == 502
    assert "couldn’t read" in response.json()["detail"]


@patch("app.main._bedrock_client")
def test_bedrock_unavailable_returns_friendly_error(mock_client):
    mock_client.return_value.converse.side_effect = ClientError(
        {"Error": {"Code": "AccessDeniedException", "Message": "not authorized"}},
        "Converse",
    )
    response = client.post(
        "/api/plan",
        json={"task": "Study biology", "available_minutes": 20, "energy": "Medium"},
    )
    assert response.status_code == 503
    assert "credentials, region, model access" in response.json()["detail"]
