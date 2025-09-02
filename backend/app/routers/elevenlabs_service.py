import os
import httpx
import aiofiles
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class ElevenLabsService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.voice_id = os.getenv("ELEVENLABS_VOICE_ID", "TC0Zp7WVFzhA8zpTlRqV")  # Use env var
        self.base_url = "https://api.elevenlabs.io/v1"
        self.audio_dir = Path("audio_recordings/tts")
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        
    async def text_to_speech(self, text: str, session_id: str) -> Optional[str]:
        """Generate speech from text using ElevenLabs API"""
        if not self.api_key:
            logger.warning("ElevenLabs API key not configured")
            return None
            
        try:
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.api_key
            }
            
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/text-to-speech/{self.voice_id}",
                    json=data,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    filename = f"tts_{session_id}_{hash(text) % 10000}.mp3"
                    file_path = self.audio_dir / filename
                    
                    async with aiofiles.open(file_path, 'wb') as f:
                        await f.write(response.content)
                    
                    logger.info(f"TTS audio saved: {file_path}")
                    return str(file_path)
                else:
                    logger.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"ElevenLabs TTS error: {e}")
            return None

elevenlabs_service = ElevenLabsService()
