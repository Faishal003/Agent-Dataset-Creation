from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import crud, schemas, auth, models
from app.database import get_db

router = APIRouter(prefix="/agents", tags=["agents"])

@router.post("/", response_model=schemas.AgentResponse)
def create_agent(
    agent: schemas.AgentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.create_agent(db=db, agent=agent, owner_id=current_user.id)

@router.get("/", response_model=List[schemas.AgentResponse])
def get_user_agents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.get_agents_by_user(db=db, user_id=current_user.id)

@router.get("/{agent_id}", response_model=schemas.AgentResponse)
def get_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    agent = crud.get_agent_by_id(db=db, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Check if user owns the agent
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return agent

@router.get("/public/{agent_link}")
def get_agent_by_link(agent_link: str, db: Session = Depends(get_db)):
    agent = crud.get_agent_by_link(db=db, agent_link=agent_link)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if not agent.is_active:
        raise HTTPException(status_code=404, detail="Agent is not active")
    
    # Return public agent info (without sensitive data)
    return {
        "id": agent.id,
        "name": agent.name,
        "purpose": agent.purpose,
        "agent_link": agent.agent_link
    }