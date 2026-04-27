from __future__ import annotations

from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.workflow import run_workflow


class GenerateReportRequest(BaseModel):
    texts: List[str] = Field(default_factory=list)


class GenerateReportResponse(BaseModel):
    report: str


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/generate-report", response_model=GenerateReportResponse)
def generate_report(payload: GenerateReportRequest) -> GenerateReportResponse:
    texts = [t for t in (payload.texts or []) if isinstance(t, str) and t.strip()]
    if not texts:
        raise HTTPException(status_code=400, detail="texts 不能为空（至少提供一条非空文本）")

    try:
        report_md = run_workflow(texts)
        return GenerateReportResponse(report=report_md)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"报告生成失败: {str(e)}") from e


