from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app import crud, schemas, auth, models
from app.database import get_db
import pandas as pd
from io import StringIO, BytesIO
from fastapi.responses import StreamingResponse
import json

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard/{agent_id}", response_model=schemas.AnalyticsResponse)
def get_analytics_dashboard(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Verify agent ownership
    agent = crud.get_agent_by_id(db=db, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Get analytics data
    conversations = crud.get_conversations_by_agent(db=db, agent_id=agent_id)
    total_conversations = len(conversations)
    
    age_distribution = crud.get_age_distribution(db=db, agent_id=agent_id)
    gender_breakdown = crud.get_gender_breakdown(db=db, agent_id=agent_id)
    location_data = crud.get_location_data(db=db, agent_id=agent_id)
    
    return schemas.AnalyticsResponse(
        total_conversations=total_conversations,
        age_distribution=[schemas.AgeDistribution(**item) for item in age_distribution],
        gender_breakdown=[schemas.GenderBreakdown(**item) for item in gender_breakdown],
        location_data=[schemas.LocationData(**item) for item in location_data]
    )

def extract_conversation_summary(conversation_history):
    """Extract key themes and topics from conversation history"""
    if not conversation_history:
        return "No conversation data available"
    
    # Extract all user messages
    user_messages = [msg.get("message", "") for msg in conversation_history if msg.get("sender") == "user"]
    agent_messages = [msg.get("message", "") for msg in conversation_history if msg.get("sender") == "agent"]
    
    if not user_messages:
        return "No user responses recorded"
    
    # Simple keyword extraction and theme identification
    all_text = " ".join(user_messages).lower()
    
    # Common themes based on agent purposes
    themes = {
        "health": ["health", "medical", "doctor", "hospital", "medicine", "treatment", "symptoms"],
        "agriculture": ["farm", "crop", "farming", "agriculture", "harvest", "soil", "plant"],
        "education": ["school", "learn", "education", "teacher", "student", "study", "knowledge"],
        "technology": ["computer", "software", "digital", "internet", "app", "technology"],
        "finance": ["money", "bank", "investment", "finance", "budget", "income", "expense"],
        "social": ["family", "community", "social", "friends", "society", "culture", "relationship"]
    }
    
    identified_themes = []
    for theme, keywords in themes.items():
        if any(keyword in all_text for keyword in keywords):
            identified_themes.append(theme)
    
    # Create summary
    summary_parts = []
    summary_parts.append(f"Conversation with {len(user_messages)} user responses")
    
    if identified_themes:
        summary_parts.append(f"Main themes: {', '.join(identified_themes)}")
    
    # Add key points from first and last user messages
    if len(user_messages) > 0:
        first_msg = user_messages[0][:100] + "..." if len(user_messages[0]) > 100 else user_messages[0]
        summary_parts.append(f"Opening topic: {first_msg}")
    
    if len(user_messages) > 1:
        last_msg = user_messages[-1][:100] + "..." if len(user_messages[-1]) > 100 else user_messages[-1]
        summary_parts.append(f"Closing topic: {last_msg}")
    
    return " | ".join(summary_parts)

@router.get("/export/{agent_id}/csv")
def export_all_conversations_csv(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Export all conversations for an agent to CSV"""
    
    # Verify agent ownership
    agent = crud.get_agent_by_id(db=db, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    conversations = crud.get_conversations_by_agent(db=db, agent_id=agent_id)
    
    if not conversations:
        raise HTTPException(status_code=404, detail="No conversations found")
    
    # Prepare CSV data
    csv_data = []
    for conversation in conversations:
        # Extract conversation summary and themes
        conversation_summary = extract_conversation_summary(conversation.full_conversation)
        
        # Count messages
        total_messages = len(conversation.full_conversation) if conversation.full_conversation else 0
        user_messages = len([msg for msg in conversation.full_conversation if msg.get("sender") == "user"]) if conversation.full_conversation else 0
        agent_messages = len([msg for msg in conversation.full_conversation if msg.get("sender") == "agent"]) if conversation.full_conversation else 0
        
        # Extract first user message and last agent response for context
        first_user_msg = ""
        last_agent_msg = ""
        
        if conversation.full_conversation:
            user_msgs = [msg.get("message", "") for msg in conversation.full_conversation if msg.get("sender") == "user"]
            agent_msgs = [msg.get("message", "") for msg in conversation.full_conversation if msg.get("sender") == "agent"]
            
            if user_msgs:
                first_user_msg = user_msgs[0][:200] + "..." if len(user_msgs[0]) > 200 else user_msgs[0]
            if agent_msgs:
                last_agent_msg = agent_msgs[-1][:200] + "..." if len(agent_msgs[-1]) > 200 else agent_msgs[-1]
        
        row = {
            "conversation_id": conversation.id,
            "session_id": conversation.session_id,
            "participant_name": conversation.participant_name,
            "participant_age": conversation.participant_age,
            "participant_gender": conversation.participant_gender,
            "participant_location": conversation.participant_location,
            "conversation_date": conversation.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "completed_date": conversation.completed_at.strftime("%Y-%m-%d %H:%M:%S") if conversation.completed_at else "Not completed",
            "agent_name": agent.name,
            "agent_purpose": agent.purpose,
            "agent_segment": agent.segment,
            "conversation_summary": conversation_summary,
            "manual_summary": conversation.summary or "No manual summary",
            "total_messages": total_messages,
            "user_messages_count": user_messages,
            "agent_messages_count": agent_messages,
            "first_user_response": first_user_msg,
            "last_agent_response": last_agent_msg,
            "conversation_duration_minutes": (
                (conversation.completed_at - conversation.created_at).total_seconds() / 60
                if conversation.completed_at else "Ongoing"
            )
        }
        
        # Add additional participant info
        if conversation.participant_info:
            for key, value in conversation.participant_info.items():
                row[f"additional_{key}"] = str(value)
        
        # Add key terms as separate columns
        if conversation.key_terms:
            for key, value in conversation.key_terms.items():
                row[f"key_term_{key}"] = str(value)
        
        # Add full conversation as JSON (optional - can be large)
        row["full_conversation_json"] = json.dumps(conversation.full_conversation) if conversation.full_conversation else ""
        
        csv_data.append(row)
    
    # Create DataFrame and convert to CSV
    df = pd.DataFrame(csv_data)
    
    # Create CSV content
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False, encoding='utf-8')
    csv_content = csv_buffer.getvalue()
    
    # Convert to bytes for streaming
    csv_bytes = BytesIO(csv_content.encode('utf-8'))
    
    return StreamingResponse(
        csv_bytes,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=agent_{agent_id}_conversations_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )

@router.get("/heatmap/{agent_id}")
def get_location_heatmap_data(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get location data formatted for heatmap visualization"""
    
    # Verify agent ownership
    agent = crud.get_agent_by_id(db=db, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    location_data = crud.get_location_data(db=db, agent_id=agent_id)
    
    # TODO: Add geocoding service integration to convert location names to coordinates
    # For now, return basic location data
    heatmap_data = []
    for location in location_data:
        heatmap_data.append({
            "location": location["location"],
            "count": location["count"],
            "latitude": 0,  # TODO: Implement geocoding
            "longitude": 0,  # TODO: Implement geocoding
            "intensity": location["count"]
        })
    
    return heatmap_data