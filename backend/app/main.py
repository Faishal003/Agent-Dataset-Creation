from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os

# Load environment variables FIRST (before any other imports)
load_dotenv()

from .database import engine, get_db
from . import models
from .routers import auth, agents, conversations, analytics

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Data Collection Agents API",
    description="API for creating and managing data collection agents with voice/text interactions",
    version="1.0.0"
)

# Add CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(conversations.router)
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {
        "message": "Data Collection Agents API",
        "version": "1.0.0",
        "documentation": "/docs"
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Simple database connectivity check
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# WebSocket test endpoint
@app.websocket("/test-ws")
async def websocket_test_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print("WebSocket disconnected")

# Add this to your main.py temporarily for testing

@app.get("/test-ai")
async def test_ai_connection():
    """Test endpoint to check AI service connection"""
    try:
        import os
        from datetime import datetime
        
        # Check environment variable
        api_key = os.getenv("CEREBRAS_API_KEY", "csk-ymtphj83pp5p9x42cwycj8rrxv9dw2d664fdjxmvv2p88n4")
        
        if api_key == "csk-ymtphj83pp5p9x42cwycj8rrxv9dw2d664fdjxmvv2p88n4":
            return {
                "status": "error",
                "message": "Cerebras API key not configured",
                "solution": "Set CEREBRAS_API_KEY environment variable"
            }
        
        # Test API connection
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama3.3-70b",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello and confirm you're working."}
            ],
            "max_tokens": 100,
            "temperature": 0.7
        }
        
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.cerebras.ai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": "success",
                    "message": "Cerebras API is working",
                    "response": result["choices"][0]["message"]["content"],
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "status": "error",
                    "message": f"API returned status {response.status_code}",
                    "details": response.text,
                    "api_key_present": bool(api_key and api_key != "your-cerebras-api-key")
                }
                
    except Exception as e:
        return {
            "status": "error",
            "message": f"Exception occurred: {str(e)}",
            "type": type(e).__name__
        }