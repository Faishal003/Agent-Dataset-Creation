from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship with agents
    agents = relationship("Agent", back_populates="owner")

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    purpose = Column(String)  # medical, agriculture, etc.
    segment = Column(String)
    knowledge = Column(Text)
    dataset_format = Column(JSON)  # JSON field for flexible structure
    system_prompt = Column(Text)
    user_prompt = Column(Text)
    agent_link = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Foreign key
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    owner = relationship("User", back_populates="agents")
    conversations = relationship("Conversation", back_populates="agent")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    
    # User information collected via form
    participant_name = Column(String)
    participant_age = Column(Integer)
    participant_gender = Column(String)
    participant_location = Column(String)
    participant_info = Column(JSON)  # Additional form data
    
    # Conversation data
    full_conversation = Column(JSON)  # Complete conversation history
    summary = Column(Text)  # AI-generated summary
    key_terms = Column(JSON)  # Extracted key terms for CSV
    audio_recording_path = Column(String)  # Path to recorded audio
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Foreign key
    agent_id = Column(Integer, ForeignKey("agents.id"))
    
    # Relationship
    agent = relationship("Agent", back_populates="conversations")

class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    sender = Column(String)  # 'agent' or 'user'
    message = Column(Text)
    audio_path = Column(String)  # Path to individual message audio
    timestamp = Column(DateTime(timezone=True), server_default=func.now())