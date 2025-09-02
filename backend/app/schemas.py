from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

# Agent Schemas
class AgentBase(BaseModel):
    name: str
    purpose: str
    segment: str
    knowledge: str
    dataset_format: Dict[str, Any]
    system_prompt: str
    user_prompt: str

class AgentCreate(AgentBase):
    pass

class AgentResponse(AgentBase):
    id: int
    agent_link: str
    created_at: datetime
    is_active: bool
    owner_id: int
    
    class Config:
        from_attributes = True

# Form Data Schema (for data collection)
class ParticipantFormData(BaseModel):
    name: str
    age: int
    gender: str
    location: str
    additional_info: Optional[Dict[str, Any]] = {}

# Conversation Schemas
class ConversationMessage(BaseModel):
    sender: str  # 'agent' or 'user'
    message: str
    timestamp: Optional[datetime] = None

class ConversationCreate(BaseModel):
    agent_link: str
    participant_data: ParticipantFormData

class ConversationResponse(BaseModel):
    id: int
    session_id: str
    participant_name: str
    participant_age: int
    participant_gender: str
    participant_location: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Analytics Schemas
class AgeDistribution(BaseModel):
    age_range: str
    count: int

class GenderBreakdown(BaseModel):
    gender: str
    count: int
    percentage: float

class LocationData(BaseModel):
    location: str
    count: int
    coordinates: Optional[List[float]] = None

class AnalyticsResponse(BaseModel):
    total_conversations: int
    age_distribution: List[AgeDistribution]
    gender_breakdown: List[GenderBreakdown]
    location_data: List[LocationData]

# Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None