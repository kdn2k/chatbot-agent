"""
AI Service — calls local Ollama (Gemma4) to convert user prompt into
a structured JSON command payload.
"""
import json
import re
import httpx
from typing import Optional
from app.core.config import settings


SYSTEM_PROMPT = """You are an operations assistant that converts natural language requests into shell commands.

You will receive:
- The user's request
- A list of available agent servers (name, os_type, shell_type)

Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "command": "<shell command to execute>",
  "shell_type": "<bash|powershell|cmd>",
  "description": "<one sentence explaining what this command does>",
  "suggested_agent": "<agent server name that best fits, or null>",
  "risk_level": "<low|medium|high>",
  "params": {}
}

Rules:
- For Linux/bash agents: use bash syntax
- For Windows/powershell agents: use PowerShell syntax
- If the request is ambiguous or dangerous, set risk_level to "high"
- Never include commands that delete critical system files
- The command must be a single executable line (use && for chaining)
"""


async def prompt_to_command(
    user_message: str,
    agent_servers: list[dict],
) -> Optional[dict]:
    """
    Send user prompt + agent context to Gemma4.
    Returns parsed JSON dict or None on failure.
    """
    agents_context = "\n".join(
        f"- {s['name']} ({s['os_type']}, {s['shell_type']})" for s in agent_servers
    )
    user_content = f"""Available servers:
{agents_context}

User request: {user_message}"""

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "num_predict": 512,
        },
    }

    async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
        resp = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    raw = data["message"]["content"]

    # Strip markdown fences if model ignores format directive
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    parsed = json.loads(raw)
    return parsed


async def check_ollama_health() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False
