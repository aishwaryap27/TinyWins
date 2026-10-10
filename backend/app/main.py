import json
import os
import re
from pathlib import Path
from typing import Literal

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class PlanRequest(BaseModel):
    task: str = Field(min_length=1, max_length=2000)
    available_minutes: Literal[10, 20, 30, 60, 120]
    energy: Literal["Low", "Medium", "High"]


class Step(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    minutes: int = Field(ge=1, le=120)
    explanation: str = Field(min_length=1, max_length=500)


class PlanResponse(BaseModel):
    steps: list[Step] = Field(min_length=3, max_length=3)


class SmallerStepRequest(BaseModel):
    task: str = Field(min_length=1, max_length=2000)
    step: Step
    energy: Literal["Low", "Medium", "High"]


class SmallerStepResponse(BaseModel):
    step: Step


app = FastAPI(title="TinyWins API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _bedrock_client():
    return boto3.client("bedrock-runtime", region_name=os.getenv("AWS_REGION", "us-east-1"))


def _invoke(prompt: str, max_tokens: int = 1100) -> str:
    try:
        response = _bedrock_client().converse(
            modelId=os.getenv(
                "BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0"
            ),
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": max_tokens, "temperature": 0.4},
        )
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "TinyWins couldn’t reach Amazon Bedrock. Check your AWS credentials, "
                "region, model access, and try again."
            ),
        ) from exc

    try:
        content = response["output"]["message"]["content"]
        return "\n".join(block["text"] for block in content if "text" in block)
    except (KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=502,
            detail="The AI returned an unexpected response. Please try again.",
        ) from exc


def _parse_json(text: str) -> dict:
    cleaned = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", text.strip(), flags=re.IGNORECASE)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="The AI returned a plan we couldn’t read. Please try again.",
        ) from exc
    if not isinstance(value, dict):
        raise HTTPException(
            status_code=502,
            detail="The AI returned an unexpected response. Please try again.",
        )
    return value


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/plan", response_model=PlanResponse)
def create_plan(request: PlanRequest) -> PlanResponse:
    prompt = f"""You are TinyWins, a warm and practical productivity coach.
Turn the user's task into exactly three realistic, specific, actionable next steps.
Fit the steps to the available time ({request.available_minutes} minutes total) and energy ({request.energy}).
Make the first step especially easy to begin. Avoid vague advice. Keep each step small, and estimate
minutes so their sum does not exceed the available time. Return only valid JSON with this exact shape:
{{"steps":[{{"title":"A concise action","minutes":5,"explanation":"Why this is a useful first move."}}]}}
Do not include markdown or any text outside the JSON.

User's task: {request.task.strip()}"""
    data = _parse_json(_invoke(prompt))
    try:
        plan = PlanResponse.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=502,
            detail="The AI didn’t return exactly three usable steps. Please try again.",
        ) from exc
    if sum(step.minutes for step in plan.steps) > request.available_minutes:
        raise HTTPException(
            status_code=502,
            detail="The AI returned steps that don’t fit your available time. Please try again.",
        )
    return plan


@app.post("/api/steps/smaller", response_model=SmallerStepResponse)
def make_step_smaller(request: SmallerStepRequest) -> SmallerStepResponse:
    prompt = f"""You are TinyWins, a warm and practical productivity coach.
Break the selected action into one much smaller, concrete first action that can be started immediately.
Make it feel easy for someone with {request.energy.lower()} energy. The new estimate must be shorter
than the selected step when possible. Return only valid JSON with this exact shape:
{{"step":{{"title":"One tiny action","minutes":2,"explanation":"A brief encouraging reason."}}}}
Do not include markdown or any text outside the JSON.

Overall task: {request.task.strip()}
Selected action: {request.step.title}
Selected action explanation: {request.step.explanation}
Selected action estimated minutes: {request.step.minutes}"""
    data = _parse_json(_invoke(prompt, max_tokens=450))
    try:
        result = SmallerStepResponse.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=502,
            detail="The AI didn’t return a smaller step we could use. Please try again.",
        ) from exc
    if request.step.minutes > 1 and result.step.minutes >= request.step.minutes:
        raise HTTPException(
            status_code=502,
            detail="The AI didn’t make that step smaller. Please try again.",
        )
    return result
