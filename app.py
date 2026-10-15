"""FastAPI 后端骨架：暴露 Gemini AI 调用与服务健康检查。

运行方式：
    uv run uvicorn app:app --reload --port 8080
"""
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="AutoMail Agent Studio API", version="0.1.0")


class GenerateRequest(BaseModel):
    email_content: str
    sender: str = ""
    subject: str = ""


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/generate-draft")
async def generate_draft(req: GenerateRequest) -> dict:
    """服务端 Gemini 调用：为收到的邮件拟写回复草稿。"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY 未配置")

    from google.genai import Client, types

    client = Client(api_key=api_key)
    prompt = (
        "请针对以下来信拟写一封礼貌、清晰的中文回复草稿，"
        f"发件人: {req.sender}，标题: {req.subject}。\n\n来信内容:\n{req.email_content}"
    )
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.4),
    )
    return {"draft": response.text}
