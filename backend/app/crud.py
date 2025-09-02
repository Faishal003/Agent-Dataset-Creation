from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas
from passlib.context import CryptContext
import uuid
import json
from typing import List, Optional, Dict, Any

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# Agent CRUD
def create_agent(db: Session, agent: schemas.AgentCreate, owner_id: int):
    # Generate unique agent link
    agent_link = str(uuid.uuid4())
    
    db_agent = models.Agent(
        **agent.dict(),
        owner_id=owner_id,
        agent_link=agent_link
    )
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent

def get_agents_by_user(db: Session, user_id: int):
    return db.query(models.Agent).filter(models.Agent.owner_id == user_id).all()

def get_agent_by_link(db: Session, agent_link: str):
    return db.query(models.Agent).filter(models.Agent.agent_link == agent_link).first()

def get_agent_by_id(db: Session, agent_id: int):
    return db.query(models.Agent).filter(models.Agent.id == agent_id).first()

# Conversation CRUD
def create_conversation(db: Session, agent_id: int, participant_data: schemas.ParticipantFormData):
    session_id = str(uuid.uuid4())
    
    db_conversation = models.Conversation(
        session_id=session_id,
        agent_id=agent_id,
        participant_name=participant_data.name,
        participant_age=participant_data.age,
        participant_gender=participant_data.gender,
        participant_location=participant_data.location,
        participant_info=participant_data.additional_info,
        full_conversation=[],
        key_terms={}
    )
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation

def update_conversation(db: Session, conversation_id: int, messages: List[Dict], summary: str = None):
    conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if conversation:
        conversation.full_conversation = messages
        if summary:
            conversation.summary = summary
        db.commit()
        db.refresh(conversation)
    return conversation

def get_conversations_by_agent(db: Session, agent_id: int):
    return db.query(models.Conversation).filter(models.Conversation.agent_id == agent_id).all()

# Analytics CRUD
def get_age_distribution(db: Session, agent_id: int = None):
    query = db.query(models.Conversation)
    if agent_id:
        query = query.filter(models.Conversation.agent_id == agent_id)
    
    conversations = query.all()
    age_ranges = {
        "18-25": 0, "26-35": 0, "36-45": 0, "46-55": 0, "56+": 0
    }
    
    for conv in conversations:
        age = conv.participant_age
        if 18 <= age <= 25:
            age_ranges["18-25"] += 1
        elif 26 <= age <= 35:
            age_ranges["26-35"] += 1
        elif 36 <= age <= 45:
            age_ranges["36-45"] += 1
        elif 46 <= age <= 55:
            age_ranges["46-55"] += 1
        else:
            age_ranges["56+"] += 1
    
    return [{"age_range": k, "count": v} for k, v in age_ranges.items()]

def get_gender_breakdown(db: Session, agent_id: int = None):
    query = db.query(models.Conversation)
    if agent_id:
        query = query.filter(models.Conversation.agent_id == agent_id)
    
    gender_counts = {}
    total = 0
    
    for conv in query.all():
        gender = conv.participant_gender
        gender_counts[gender] = gender_counts.get(gender, 0) + 1
        total += 1
    
    result = []
    for gender, count in gender_counts.items():
        percentage = (count / total * 100) if total > 0 else 0
        result.append({
            "gender": gender,
            "count": count,
            "percentage": round(percentage, 2)
        })
    
    return result

def get_location_data(db: Session, agent_id: int = None):
    query = db.query(models.Conversation)
    if agent_id:
        query = query.filter(models.Conversation.agent_id == agent_id)
    
    location_counts = {}
    
    for conv in query.all():
        location = conv.participant_location
        location_counts[location] = location_counts.get(location, 0) + 1
    
    return [{"location": k, "count": v} for k, v in location_counts.items()]