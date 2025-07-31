"""
Environment Configuration Handler for Sphere AI Clone Backend
Handles loading and validation of environment variables and API keys
"""

import os
from dotenv import load_dotenv
from typing import Optional, Dict, Any
import warnings

class EnvironmentConfig:
    """Handles environment configuration and API key management"""
    
    def __init__(self):
        """Initialize environment configuration"""
        # Load environment variables from .env files
        self._load_environment()
        
        # Validate required configurations
        self._validate_config()
    
    def _load_environment(self):
        """Load environment variables from .env files"""
        try:
            # Get the project root directory (parent of backend)
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            
            # Load from .env.local first (highest priority - actual secrets)
            env_local_path = os.path.join(project_root, '.env.local')
            if os.path.exists(env_local_path):
                load_dotenv(env_local_path, override=True)
                print(f"✅ Loaded .env.local from {env_local_path}")
            
            # Load from .env (default configuration)
            env_path = os.path.join(project_root, '.env')
            if os.path.exists(env_path):
                load_dotenv(env_path, override=False)
                print(f"✅ Loaded .env from {env_path}")
            
            # Also load from backend/.env if it exists
            backend_env_path = os.path.join(os.path.dirname(__file__), '.env')
            if os.path.exists(backend_env_path):
                load_dotenv(backend_env_path, override=False)
                print(f"✅ Loaded backend .env from {backend_env_path}")
            
            print("✅ Environment variables loaded successfully")
            
        except Exception as e:
            print(f"⚠️ Warning: Could not load .env files: {e}")
    
    def _validate_config(self):
        """Validate that required environment variables are set"""
        missing_vars = []
        
        # Check for at least one AI API key
        ai_keys = [
            self.get_openai_api_key(),
            self.get_anthropic_api_key(),
            self.get_google_api_key()
        ]
        
        if not any(ai_keys):
            missing_vars.append("At least one AI API key (OpenAI, Anthropic, or Google)")
        
        if missing_vars:
            warning_msg = f"⚠️ Missing environment variables: {', '.join(missing_vars)}"
            warnings.warn(warning_msg)
            print(warning_msg)
    
    # =============================================================================
    # AI/LLM API KEY GETTERS
    # =============================================================================
    
    def get_openai_api_key(self) -> Optional[str]:
        """Get OpenAI API key"""
        return os.getenv('OPENAI_API_KEY')
    
    def get_openai_org_id(self) -> Optional[str]:
        """Get OpenAI Organization ID"""
        return os.getenv('OPENAI_ORG_ID')
    
    def get_openai_model(self) -> str:
        """Get OpenAI model name"""
        return os.getenv('OPENAI_MODEL', 'gpt-4')
    
    def get_anthropic_api_key(self) -> Optional[str]:
        """Get Anthropic API key"""
        return os.getenv('ANTHROPIC_API_KEY')
    
    def get_anthropic_model(self) -> str:
        """Get Anthropic model name"""
        return os.getenv('ANTHROPIC_MODEL', 'claude-3-sonnet-20240229')
    
    def get_google_api_key(self) -> Optional[str]:
        """Get Google API key"""
        return os.getenv('GOOGLE_API_KEY')
    
    def get_gemini_model(self) -> str:
        """Get Gemini model name"""
        return os.getenv('GEMINI_MODEL', 'gemini-pro')
    
    # =============================================================================
    # SPEECH & AUDIO API CONFIGURATION
    # =============================================================================
    
    def get_whisper_api_key(self) -> Optional[str]:
        """Get OpenAI Whisper API key (usually same as OpenAI API key)"""
        return os.getenv('OPENAI_WHISPER_API_KEY') or self.get_openai_api_key()
    
    def get_google_speech_api_key(self) -> Optional[str]:
        """Get Google Speech API key"""
        return os.getenv('GOOGLE_SPEECH_API_KEY') or self.get_google_api_key()
    
    def get_google_speech_project_id(self) -> Optional[str]:
        """Get Google Cloud Project ID for Speech-to-Text"""
        return os.getenv('GOOGLE_SPEECH_PROJECT_ID')
    
    def get_azure_speech_key(self) -> Optional[str]:
        """Get Azure Speech Services key"""
        return os.getenv('AZURE_SPEECH_KEY')
    
    def get_azure_speech_region(self) -> Optional[str]:
        """Get Azure Speech Services region"""
        return os.getenv('AZURE_SPEECH_REGION')
    
    # =============================================================================
    # SERVER CONFIGURATION
    # =============================================================================
    
    def get_flask_port(self) -> int:
        """Get Flask server port"""
        return int(os.getenv('FLASK_PORT', '3001'))
    
    def get_flask_host(self) -> str:
        """Get Flask server host"""
        return os.getenv('FLASK_HOST', '0.0.0.0')
    
    def get_flask_debug(self) -> bool:
        """Get Flask debug mode"""
        return os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    def get_recordings_dir(self) -> str:
        """Get recordings directory"""
        return os.getenv('RECORDINGS_DIR', 'recordings')
    
    def get_cors_origins(self) -> list:
        """Get CORS allowed origins"""
        origins = os.getenv('CORS_ORIGINS', 'http://localhost:8080,http://localhost:3000')
        return [origin.strip() for origin in origins.split(',')]
    
    # =============================================================================
    # AUDIO PROCESSING CONFIGURATION
    # =============================================================================
    
    def get_max_recording_duration(self) -> int:
        """Get maximum recording duration in seconds"""
        return int(os.getenv('MAX_RECORDING_DURATION', '300'))
    
    def get_audio_sample_rate(self) -> int:
        """Get audio sample rate"""
        return int(os.getenv('AUDIO_SAMPLE_RATE', '16000'))
    
    def get_audio_format(self) -> str:
        """Get audio output format"""
        return os.getenv('AUDIO_FORMAT', 'mp3')
    
    # =============================================================================
    # UTILITY METHODS
    # =============================================================================
    
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return os.getenv('DEV_MODE', 'true').lower() == 'true'
    
    def get_log_level(self) -> str:
        """Get logging level"""
        return os.getenv('LOG_LEVEL', 'INFO')
    
    def is_audio_debug_enabled(self) -> bool:
        """Check if audio debug logging is enabled"""
        return os.getenv('ENABLE_AUDIO_DEBUG', 'false').lower() == 'true'
    
    def get_available_ai_providers(self) -> Dict[str, bool]:
        """Get list of available AI providers based on API keys"""
        return {
            'openai': bool(self.get_openai_api_key()),
            'anthropic': bool(self.get_anthropic_api_key()),
            'google': bool(self.get_google_api_key()),
        }
    
    def get_config_summary(self) -> Dict[str, Any]:
        """Get a summary of current configuration (without exposing secrets)"""
        return {
            'server': {
                'host': self.get_flask_host(),
                'port': self.get_flask_port(),
                'debug': self.get_flask_debug(),
                'development': self.is_development()
            },
            'audio': {
                'format': self.get_audio_format(),
                'sample_rate': self.get_audio_sample_rate(),
                'max_duration': self.get_max_recording_duration(),
                'recordings_dir': self.get_recordings_dir()
            },
            'ai_providers': self.get_available_ai_providers(),
            'logging': {
                'level': self.get_log_level(),
                'audio_debug': self.is_audio_debug_enabled()
            }
        }

# Global configuration instance
config = EnvironmentConfig()

# Convenience functions for backward compatibility
def get_openai_api_key() -> Optional[str]:
    return config.get_openai_api_key()

def get_anthropic_api_key() -> Optional[str]:
    return config.get_anthropic_api_key()

def get_google_api_key() -> Optional[str]:
    return config.get_google_api_key()
