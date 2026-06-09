from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import datetime
import uuid


# ── Auth ──────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    full_name: Optional[str]
    is_admin: bool

    model_config = {"from_attributes": True}


# ── Agent Servers ──────────────────────────────────────
class AgentServerOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    host: str
    port: int
    os_type: str
    shell_type: str
    is_active: bool
    last_seen: Optional[datetime]

    model_config = {"from_attributes": True}


class AgentServerCreate(BaseModel):
    name: str
    description: Optional[str] = None
    host: str
    port: int = 5001
    api_key: Optional[str] = None
    os_type: str = "linux"
    shell_type: str = "bash"


# ── Chat ──────────────────────────────────────────────
class ChatMessageOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    command_payload: Optional[dict] = None
    exec_result: Optional[dict] = None
    exec_status: Optional[str] = None
    agent_server_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionOut(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str
    session_id: Optional[uuid.UUID] = None  # None = new session


class ExecuteCommandRequest(BaseModel):
    message_id: uuid.UUID
    agent_server_id: uuid.UUID


class CommandPayload(BaseModel):
    command: str
    shell_type: str
    description: str
    suggested_agent: Optional[str] = None
    risk_level: str = "low"   # low | medium | high
    params: dict = {}
