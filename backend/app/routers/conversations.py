# Updated conversations.py with direct conversation start and data extraction

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import httpx
import os
import uuid
import aiofiles
import re
from pathlib import Path
from app import crud, schemas, models
from app.database import get_db
from dotenv import load_dotenv
load_dotenv()

router = APIRouter(prefix="/conversations", tags=["conversations"])

# Audio storage configuration
AUDIO_STORAGE_PATH = Path("audio_recordings")
AUDIO_STORAGE_PATH.mkdir(exist_ok=True)

# Cerebras API configuration
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "csk-ymtphj83pp5p9x42cwycj8rrxv9dw2d664fdjxmvv2p88n4")
CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1"

class ConversationManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.conversation_states: Dict[str, Dict] = {}  # Track data collection state
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        # Initialize conversation state for data collection
        self.conversation_states[session_id] = {
            'collected_data': {},
            'collection_step': 'name',  # name -> age -> gender -> location -> topic -> complete
            'step_order': ['name', 'age', 'gender', 'location', 'topic']
        }
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.conversation_states:
            del self.conversation_states[session_id]

manager = ConversationManager()

def extract_participant_data_from_message(message: str, expected_field: str) -> Optional[str]:
    """Extract specific participant data from their response"""
    message_lower = message.lower().strip()
    
    if expected_field == 'name':
        # Extract name - look for common patterns
        patterns = [
            r"my name is ([a-zA-Z\s]+)",
            r"i'm ([a-zA-Z\s]+)",
            r"i am ([a-zA-Z\s]+)",
            r"call me ([a-zA-Z\s]+)",
            r"^([a-zA-Z\s]+)$"  # Just the name alone
        ]
        for pattern in patterns:
            match = re.search(pattern, message_lower)
            if match:
                name = match.group(1).strip().title()
                if len(name) > 1 and len(name) < 50:  # Reasonable name length
                    return name
        
        # If no pattern match, check if it's likely just a name
        words = message.split()
        if len(words) <= 3 and all(word.isalpha() for word in words):
            return message.strip().title()
    
    elif expected_field == 'age':
        # Extract age - look for numbers
        age_match = re.search(r'\b(\d{1,3})\b', message)
        if age_match:
            age = int(age_match.group(1))
            if 1 <= age <= 120:  # Reasonable age range
                return str(age)
        
        # Look for written numbers
        age_words = {
            'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
            'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70'
        }
        for word, num in age_words.items():
            if word in message_lower:
                return num
    
    elif expected_field == 'gender':
        # Extract gender
        if any(word in message_lower for word in ['male', 'man', 'boy', 'he', 'him']):
            return 'male'
        elif any(word in message_lower for word in ['female', 'woman', 'girl', 'she', 'her']):
            return 'female'
        elif any(word in message_lower for word in ['non-binary', 'non binary', 'nonbinary', 'enby']):
            return 'non-binary'
        elif any(word in message_lower for word in ['other', 'different', 'prefer not']):
            return 'other'
        elif 'prefer not to say' in message_lower or 'rather not say' in message_lower:
            return 'prefer_not_to_say'
    
    elif expected_field == 'location':
        # Extract location - this is more complex, look for city/country patterns
        # Remove common words
        clean_message = re.sub(r'\b(i live in|i am from|from|in|at|the|a|an)\b', '', message_lower).strip()
        
        # Look for location patterns
        if clean_message and len(clean_message) > 1:
            # Capitalize properly
            location = ' '.join(word.capitalize() for word in clean_message.split())
            if len(location) < 100:  # Reasonable location length
                return location
    
    elif expected_field == 'topic':
        # Extract what they want to discuss
        return message.strip()
    
    return None

async def get_ai_response_with_data_collection(agent, conversation_history, user_message, session_id):
    """Enhanced AI response that handles data collection"""
    try:
        # Get conversation state
        state = manager.conversation_states.get(session_id, {})
        current_step = state.get('collection_step', 'name')
        collected_data = state.get('collected_data', {})
        step_order = state.get('step_order', ['name', 'age', 'gender', 'location', 'topic'])
        
        # Try to extract data from user message if we're in collection mode
        if current_step != 'complete':
            extracted_data = extract_participant_data_from_message(user_message, current_step)
            
            if extracted_data:
                collected_data[current_step] = extracted_data
                
                # Move to next step
                current_step_index = step_order.index(current_step)
                if current_step_index < len(step_order) - 1:
                    next_step = step_order[current_step_index + 1]
                    manager.conversation_states[session_id]['collection_step'] = next_step
                else:
                    manager.conversation_states[session_id]['collection_step'] = 'complete'
                
                manager.conversation_states[session_id]['collected_data'] = collected_data
        
        # Create dynamic system prompt based on collection state
        if current_step == 'complete':
            # All data collected, proceed with normal conversation
            system_prompt = f"""
{agent.system_prompt}

PARTICIPANT DATA COLLECTED:
- Name: {collected_data.get('name', 'Unknown')}
- Age: {collected_data.get('age', 'Unknown')}
- Gender: {collected_data.get('gender', 'Unknown')}
- Location: {collected_data.get('location', 'Unknown')}
- Topic: {collected_data.get('topic', 'Unknown')}

Now proceed with normal conversation about {agent.purpose}. Use their name naturally and discuss the topic they mentioned: {collected_data.get('topic', agent.purpose)}.
"""
        else:
            # Still collecting data
            next_questions = {
                'name': f"Hello! I'm {agent.name}. To get started, could you please tell me your name?",
                'age': f"Nice to meet you, {collected_data.get('name', 'there')}! Could you please tell me your age?",
                'gender': f"Thank you! Could you please tell me your gender? You can say male, female, non-binary, other, or prefer not to say.",
                'location': f"Great! Where are you located? Please tell me your city and country.",
                'topic': f"Perfect! Finally, what specific topic about {agent.purpose} would you like to discuss today?"
            }
            
            system_prompt = f"""
You are {agent.name}, a data collection agent for {agent.purpose}.

CURRENT TASK: You are collecting participant information. 

COLLECTION STATUS:
{' '.join([f'✓ {k}: {v}' for k, v in collected_data.items()])}
Currently collecting: {current_step}

INSTRUCTIONS:
- If the user just provided their {current_step}, acknowledge it positively and ask the next question
- Be natural and conversational, not robotic
- If they didn't provide clear {current_step} information, politely ask again
- Use the exact question: "{next_questions[current_step]}"

Your knowledge: {agent.knowledge}
"""
        
        if not CEREBRAS_API_KEY or CEREBRAS_API_KEY == "your-cerebras-api-key":
            print("Warning: Cerebras API key not configured, using fallback response")
            if current_step != 'complete':
                return next_questions[current_step]
            else:
                return generate_specialized_fallback_response(agent, user_message)
        
        # Build messages for API
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add recent conversation history
        for msg in conversation_history[-5:]:
            messages.append({
                "role": "user" if msg["sender"] == "user" else "assistant",
                "content": msg["message"]
            })
        
        messages.append({"role": "user", "content": user_message})
        
        headers = {
            "Authorization": f"Bearer {CEREBRAS_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama3.1-8b",
            "messages": messages,
            "max_tokens": 150,
            "temperature": 0.7,
            "stream": False
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{CEREBRAS_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_message = result["choices"][0]["message"]["content"]
                return ai_message
            else:
                print(f"❌ Cerebras API error: {response.status_code}")
                if current_step != 'complete':
                    return next_questions[current_step]
                else:
                    return generate_specialized_fallback_response(agent, user_message)
                
    except Exception as e:
        print(f"💥 Error in AI response: {e}")
        if current_step != 'complete':
            next_questions = {
                'name': f"Hello! I'm {agent.name}. To get started, could you please tell me your name?",
                'age': f"Nice to meet you! Could you please tell me your age?",
                'gender': f"Thank you! Could you please tell me your gender?",
                'location': f"Great! Where are you located?",
                'topic': f"Perfect! What would you like to discuss about {agent.purpose}?"
            }
            return next_questions.get(current_step, "Could you please provide that information?")
        else:
            return generate_specialized_fallback_response(agent, user_message)

def generate_specialized_fallback_response(agent, user_message):
    """Generate fallback responses when AI API is not available"""
    responses = {
        'general': [
            f"That's really interesting! Could you tell me more about how that relates to {agent.purpose}?",
            f"Thank you for sharing. What other experiences do you have with {agent.purpose}?",
            f"I appreciate your response. What specific aspects of {agent.purpose} interest you most?"
        ]
    }
    import random
    return random.choice(responses['general'])

async def save_participant_data_to_db(session_id: str, db: Session):
    """Save collected participant data to database"""
    try:
        state = manager.conversation_states.get(session_id, {})
        collected_data = state.get('collected_data', {})
        
        if not collected_data or state.get('collection_step') != 'complete':
            return
        
        # Find conversation by session_id
        conversation = db.query(models.Conversation).filter(
            models.Conversation.session_id == session_id
        ).first()
        
        if conversation:
            # Update conversation with collected data
            conversation.participant_name = collected_data.get('name', 'Unknown')
            conversation.participant_age = int(collected_data.get('age', 0)) if collected_data.get('age', '0').isdigit() else 0
            conversation.participant_gender = collected_data.get('gender', 'unknown')
            conversation.participant_location = collected_data.get('location', 'Unknown')
            
            # Store discussion topic in participant_info
            if not conversation.participant_info:
                conversation.participant_info = {}
            conversation.participant_info['discussion_topic'] = collected_data.get('topic', '')
            
            db.commit()
            print(f"✅ Saved participant data for session {session_id}")
        
    except Exception as e:
        print(f"❌ Error saving participant data: {e}")

# NEW ENDPOINT: Start conversation directly without form
@router.post("/start-direct/{agent_link}")
async def start_conversation_direct(
    agent_link: str,
    db: Session = Depends(get_db)
):
    """Start conversation directly without participant form"""
    agent = crud.get_agent_by_link(db=db, agent_link=agent_link)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if not agent.is_active:
        raise HTTPException(status_code=404, detail="Agent is not active")
    
    # Create conversation with empty participant data (will be collected during chat)
    session_id = str(uuid.uuid4())
    
    db_conversation = models.Conversation(
        session_id=session_id,
        agent_id=agent.id,
        participant_name="Collecting...",  # Will be updated during conversation
        participant_age=0,  # Will be updated during conversation
        participant_gender="unknown",  # Will be updated during conversation
        participant_location="Unknown",  # Will be updated during conversation
        participant_info={},
        full_conversation=[],
        key_terms={}
    )
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    
    # Generate welcome message for data collection
    welcome_message = f"Hello! I'm {agent.name}, and I'm here to learn about your experiences with {agent.purpose}. To get started, could you please tell me your name?"
    
    initial_conversation_history = [{
        "sender": "agent",
        "message": welcome_message,
        "timestamp": datetime.utcnow().isoformat(),
        "type": "welcome"
    }]
    
    crud.update_conversation(
        db=db,
        conversation_id=db_conversation.id,
        messages=initial_conversation_history
    )
    
    return {
        "session_id": session_id,
        "agent_name": agent.name,
        "initial_message": welcome_message,
        "message": "Conversation started successfully"
    }

@router.post("/start/{agent_link}")
async def start_conversation(
    agent_link: str,
    participant_data: schemas.ParticipantFormData,
    db: Session = Depends(get_db)
):
    """Legacy endpoint: Start conversation with participant form (keeping for compatibility)"""
    agent = crud.get_agent_by_link(db=db, agent_link=agent_link)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    conversation = crud.create_conversation(
        db=db,
        agent_id=agent.id,
        participant_data=participant_data
    )
    
    welcome_message = f"Hello {participant_data.name}! I'm {agent.name}, and I'm excited to learn about your experiences with {agent.purpose}. What would you like to discuss today?"
    
    initial_conversation_history = [{
        "sender": "agent",
        "message": welcome_message,
        "timestamp": datetime.utcnow().isoformat(),
        "type": "welcome"
    }]
    
    crud.update_conversation(
        db=db,
        conversation_id=conversation.id,
        messages=initial_conversation_history
    )
    
    return {
        "session_id": conversation.session_id,
        "agent_name": agent.name,
        "initial_message": welcome_message,
        "participant_name": participant_data.name
    }

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """Enhanced WebSocket endpoint with data collection"""
    await manager.connect(websocket, session_id)
    
    from app.database import SessionLocal
    db = SessionLocal()
    
    try:
        conversation = db.query(models.Conversation).filter(
            models.Conversation.session_id == session_id
        ).first()
        
        if not conversation:
            await websocket.send_text(json.dumps({"error": "Conversation not found"}))
            return
            
        agent = conversation.agent
        conversation_history = conversation.full_conversation or []
        
        # Send connection info
        await websocket.send_text(json.dumps({
            "agent_name": agent.name,
            "agent_purpose": agent.purpose,
            "participant_name": conversation.participant_name if conversation.participant_name != "Collecting..." else None,
            "conversation_id": conversation.id,
            "type": "connection_info"
        }))
        
        # Send welcome message if it exists
        if conversation_history and conversation_history[0].get("type") == "welcome":
            welcome_msg = conversation_history[0]
            await websocket.send_text(json.dumps({
                "message": welcome_msg["message"],
                "sender": "agent",
                "type": "welcome",
                "timestamp": welcome_msg.get("timestamp")
            }))
        
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            user_message = message_data.get("message", "").strip()
            message_type = message_data.get("type", "text")
            
            if not user_message:
                continue
            
            # Add user message to history
            user_msg = {
                "sender": "user",
                "message": user_message,
                "timestamp": datetime.utcnow().isoformat(),
                "type": message_type
            }
            conversation_history.append(user_msg)
            
            # Get AI response with data collection
            ai_response = await get_ai_response_with_data_collection(agent, conversation_history, user_message, session_id)
            
            # Add AI response to history
            agent_msg = {
                "sender": "agent",
                "message": ai_response,
                "timestamp": datetime.utcnow().isoformat(),
                "type": "text"
            }
            conversation_history.append(agent_msg)
            
            # Update conversation in database
            crud.update_conversation(
                db=db,
                conversation_id=conversation.id,
                messages=conversation_history
            )
            
            # Check if we completed data collection and save to DB
            state = manager.conversation_states.get(session_id, {})
            if state.get('collection_step') == 'complete':
                await save_participant_data_to_db(session_id, db)
            
            # Send AI response
            await websocket.send_text(json.dumps({
                "message": ai_response,
                "sender": "agent",
                "type": "text",
                "timestamp": agent_msg["timestamp"]
            }))
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        
        # Save final data and generate summary on disconnect
        if 'conversation' in locals() and len(conversation_history) > 1:
            try:
                # Save any remaining participant data
                await save_participant_data_to_db(session_id, db)
                
                # Generate summary
                state = manager.conversation_states.get(session_id, {})
                collected_data = state.get('collected_data', {})
                
                participant_data = {
                    'name': collected_data.get('name', 'Unknown'),
                    'age': collected_data.get('age', 'Unknown'),
                    'location': collected_data.get('location', 'Unknown')
                }
                
                summary = await generate_conversation_summary(
                    conversation_history, participant_data, agent
                )
                
                conversation.completed_at = datetime.utcnow()
                conversation.summary = summary
                db.commit()
                
                print(f"Conversation {session_id} completed and summarized")
                
            except Exception as e:
                print(f"Error saving conversation summary: {e}")
        
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(session_id)
    finally:
        db.close()

async def generate_conversation_summary(conversation_history, participant_data, agent_data):
    """Generate AI-powered conversation summary"""
    try:
        if not conversation_history:
            return "No conversation data available."
        
        user_messages = [msg["message"] for msg in conversation_history if msg["sender"] == "user"]
        agent_messages = [msg["message"] for msg in conversation_history if msg["sender"] == "agent"]
        
        if not user_messages:
            return "No participant responses recorded."
        
        return f"""
Conversation Summary:
- Agent: {agent_data.name} ({agent_data.purpose})
- Participant: {participant_data.get('name', 'Anonymous')}
- Age: {participant_data.get('age', 'N/A')}
- Location: {participant_data.get('location', 'N/A')}
- Total exchanges: {len(conversation_history)}
- Participant responses: {len(user_messages)}
- Topics covered: {agent_data.purpose} related discussions
- Engagement level: {'High' if len(user_messages) > 5 else 'Moderate' if len(user_messages) > 2 else 'Low'}
- Data collection: Automated through conversation flow
"""
    
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Summary generation failed. Conversation data preserved."

# Keep existing endpoints for compatibility
@router.post("/upload-audio/{session_id}")
async def upload_audio(
    session_id: str,
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and store voice recordings"""
    try:
        if not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        conversation = db.query(models.Conversation).filter(
            models.Conversation.session_id == session_id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        file_extension = audio_file.filename.split('.')[-1] if '.' in audio_file.filename else 'wav'
        unique_filename = f"{session_id}_{uuid.uuid4()}.{file_extension}"
        file_path = AUDIO_STORAGE_PATH / unique_filename
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await audio_file.read()
            await f.write(content)
        
        if not conversation.audio_recording_path:
            conversation.audio_recording_path = str(file_path)
        else:
            existing_files = conversation.audio_recording_path.split(',') if conversation.audio_recording_path else []
            existing_files.append(str(file_path))
            conversation.audio_recording_path = ','.join(existing_files)
        
        db.commit()
        
        return {
            "message": "Audio uploaded successfully",
            "file_path": str(file_path),
            "file_size": len(content)
        }
        
    except Exception as e:
        print(f"Error uploading audio: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload audio file")

@router.get("/{conversation_id}/summary")
async def get_conversation_summary(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    """Get conversation summary and statistics"""
    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = conversation.full_conversation or []
    user_messages = [msg for msg in messages if msg.get("sender") == "user"]
    agent_messages = [msg for msg in messages if msg.get("sender") == "agent"]
    
    duration_minutes = 0
    if conversation.created_at and conversation.completed_at:
        duration = conversation.completed_at - conversation.created_at
        duration_minutes = round(duration.total_seconds() / 60, 1)
    
    all_user_text = " ".join([msg.get("message", "") for msg in user_messages]).lower()
    common_words = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
    words = [word for word in all_user_text.split() if len(word) > 3 and word not in common_words]
    
    word_freq = {}
    for word in words:
        word_freq[word] = word_freq.get(word, 0) + 1
    
    key_topics = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "conversation_id": conversation.id,
        "session_id": conversation.session_id,
        "participant_name": conversation.participant_name,
        "agent_name": conversation.agent.name,
        "duration_minutes": duration_minutes,
        "total_messages": len(messages),
        "user_messages": len(user_messages),
        "agent_messages": len(agent_messages),
        "start_time": conversation.created_at.isoformat() if conversation.created_at else None,
        "end_time": conversation.completed_at.isoformat() if conversation.completed_at else None,
        "summary": conversation.summary,
        "key_topics": [{"topic": topic, "frequency": freq} for topic, freq in key_topics],
        "has_audio": bool(conversation.audio_recording_path),
        "participant_info": {
            "age": conversation.participant_age,
            "gender": conversation.participant_gender,
            "location": conversation.participant_location
        }
    }

@router.get("/{agent_id}/conversations", response_model=List[schemas.ConversationResponse])
def get_agent_conversations(
    agent_id: int,
    db: Session = Depends(get_db)
):
    """Get all conversations for an agent with enhanced data"""
    conversations = crud.get_conversations_by_agent(db=db, agent_id=agent_id)
    return conversations