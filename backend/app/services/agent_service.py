"""
Agent Dispatcher — sends confirmed commands to remote .NET Agent servers.
"""
import httpx
from datetime import datetime, timezone
from app.models.chat import AgentServer


async def dispatch_command(
    agent: AgentServer,
    command: str,
    shell_type: str,
    message_id: str,
) -> dict:
    """
    POST the command to the .NET agent REST endpoint.
    Returns execution result dict.
    """
    url = f"http://{agent.host}:{agent.port}/api/execute"
    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": agent.api_key or "",
    }
    payload = {
        "messageId": str(message_id),
        "command": command,
        "shellType": shell_type,
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def ping_agent(agent: AgentServer) -> bool:
    try:
        url = f"http://{agent.host}:{agent.port}/api/health"
        headers = {"X-Api-Key": agent.api_key or ""}
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(url, headers=headers)
            return resp.status_code == 200
    except Exception:
        return False
