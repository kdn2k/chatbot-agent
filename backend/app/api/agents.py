from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import AgentServer
from app.schemas.schemas import AgentServerOut, AgentServerCreate
from app.services.agent_service import ping_agent
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/", response_model=list[AgentServerOut])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(AgentServer).where(AgentServer.is_active == True))
    return result.scalars().all()


@router.post("/", response_model=AgentServerOut)
async def create_agent(
    body: AgentServerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    agent = AgentServer(**body.model_dump())
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.get("/{agent_id}/ping")
async def ping(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(AgentServer).where(AgentServer.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    alive = await ping_agent(agent)
    if alive:
        agent.last_seen = datetime.now(timezone.utc)
        await db.commit()

    return {"alive": alive, "agent_id": str(agent_id)}
