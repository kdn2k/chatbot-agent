"""
Chat API — core flow:
  1. User sends message
  2. Backend queries agent_servers from DB
  3. Calls Gemma4 via Ollama → structured JSON
  4. Returns JSON preview to user
  5. User confirms → backend dispatches to .NET agent
  6. Returns execution result
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage, AgentServer
from app.schemas.schemas import (
    SendMessageRequest, ExecuteCommandRequest,
    ChatMessageOut, ChatSessionOut,
)
from app.services.ai_service import prompt_to_command
from app.services.agent_service import dispatch_command

router = APIRouter(prefix="/chat", tags=["chat"])


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=list[ChatSessionOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
async def get_messages(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sess_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return result.scalars().all()


# ── Send message → AI parse ───────────────────────────────────────────────────

@router.post("/send", response_model=ChatMessageOut)
async def send_message(
    body: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Resolve or create session
    if body.session_id:
        sess_result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == body.session_id,
                ChatSession.user_id == current_user.id,
            )
        )
        session = sess_result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = ChatSession(
            user_id=current_user.id,
            title=body.content[:60],
        )
        db.add(session)
        await db.flush()

    # 2. Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    await db.flush()

    # 3. Fetch active agent servers for context
    agents_result = await db.execute(
        select(AgentServer).where(AgentServer.is_active == True)
    )
    agents = agents_result.scalars().all()
    agents_ctx = [
        {"name": a.name, "os_type": a.os_type, "shell_type": a.shell_type}
        for a in agents
    ]

    # 4. Call Gemma4
    try:
        command_payload = await prompt_to_command(body.content, agents_ctx)
    except Exception as e:
        command_payload = None
        error_content = f"AI service error: {str(e)}"
    else:
        error_content = None

    # 5. Build assistant reply
    if command_payload:
        content = (
            f"I've parsed your request. Here is the command that will be executed:\n\n"
            f"**Command:** `{command_payload.get('command')}`\n"
            f"**Shell:** {command_payload.get('shell_type')}\n"
            f"**Description:** {command_payload.get('description')}\n"
            f"**Risk level:** {command_payload.get('risk_level', 'low').upper()}\n"
            f"**Suggested server:** {command_payload.get('suggested_agent') or 'Any'}\n\n"
            f"Please review and confirm execution."
        )
    else:
        content = error_content or "Sorry, I could not parse your request. Please try again."

    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=content,
        command_payload=command_payload,
        exec_status="pending" if command_payload else None,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)
    return assistant_msg


# ── Execute confirmed command ─────────────────────────────────────────────────

@router.post("/execute", response_model=ChatMessageOut)
async def execute_command(
    body: ExecuteCommandRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Load the message
    msg_result = await db.execute(
        select(ChatMessage)
        .join(ChatSession)
        .where(
            ChatMessage.id == body.message_id,
            ChatSession.user_id == current_user.id,
        )
    )
    msg = msg_result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if not msg.command_payload:
        raise HTTPException(status_code=400, detail="No command payload on this message")
    if msg.exec_status not in ("pending", None):
        raise HTTPException(status_code=400, detail=f"Command already {msg.exec_status}")

    # Load agent
    agent_result = await db.execute(
        select(AgentServer).where(AgentServer.id == body.agent_server_id)
    )
    agent = agent_result.scalar_one_or_none()
    if not agent or not agent.is_active:
        raise HTTPException(status_code=404, detail="Agent server not found or inactive")

    # Dispatch to .NET agent
    msg.exec_status = "confirmed"
    msg.agent_server_id = agent.id
    await db.flush()

    try:
        result = await dispatch_command(
            agent=agent,
            command=msg.command_payload["command"],
            shell_type=msg.command_payload.get("shell_type", agent.shell_type),
            message_id=str(msg.id),
        )
        msg.exec_status = "executed"
        msg.exec_result = result
    except Exception as e:
        msg.exec_status = "failed"
        msg.exec_result = {"error": str(e)}

    await db.commit()
    await db.refresh(msg)
    return msg


# ── Cancel pending command ────────────────────────────────────────────────────

@router.post("/cancel/{message_id}", response_model=ChatMessageOut)
async def cancel_command(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg_result = await db.execute(
        select(ChatMessage)
        .join(ChatSession)
        .where(
            ChatMessage.id == message_id,
            ChatSession.user_id == current_user.id,
            ChatMessage.exec_status == "pending",
        )
    )
    msg = msg_result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Pending message not found")

    msg.exec_status = "cancelled"
    await db.commit()
    await db.refresh(msg)
    return msg
