# backend/app/__init__.py
"""
Data Collection Agents API

A FastAPI application for creating and managing AI-powered data collection agents
with voice and text interaction capabilities.
"""

__version__ = "1.0.0"
__author__ = "Your Name"

# backend/app/routers/__init__.py
"""
API Routers for the Data Collection Agents application.
"""
from app.routers.auth import router as auth_router
from app.routers.agents import router as agents_router
from app.routers.conversations import router as conversations_router
from app.routers.analytics import router as analytics_router

__all__ = ["auth_router", "agents_router", "conversations_router", "analytics_router"]