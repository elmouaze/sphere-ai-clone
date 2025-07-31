"""
OpenAI API Integration for Sphere AI Clone
Handles OpenAI API calls for chat completion and text generation
Respects rate limits: 3 requests per minute
"""

from openai import OpenAI
from config import config
import logging
import time
from datetime import datetime, timedelta

class OpenAIService:
    """Service to handle OpenAI API interactions with rate limiting"""
    
    def __init__(self):
        """Initialize OpenAI client"""
        self.api_key = config.get_openai_api_key()
        self.client = None
        self.model = config.get_openai_model()
        
        # Rate limiting: 3 requests per minute
        self.max_requests_per_minute = 3
        self.request_timestamps = []
        
        if self.api_key:
            try:
                # Only include organization if it's explicitly set and valid
                org_id = config.get_openai_org_id()
                if org_id and org_id != "your_openai_org_id_here":
                    self.client = OpenAI(api_key=self.api_key, organization=org_id)
                    print(f"✅ OpenAI client initialized with organization: {org_id}")
                else:
                    self.client = OpenAI(api_key=self.api_key)
                    print("✅ OpenAI client initialized successfully (no organization)")
                    
            except Exception as e:
                print(f"❌ Failed to initialize OpenAI client: {e}")
                self.client = None
        else:
            print("⚠️ No OpenAI API key found in environment variables")
    
    def _can_make_request(self) -> bool:
        """Check if we can make a request without exceeding rate limit"""
        now = datetime.now()
        
        # Remove timestamps older than 1 minute
        self.request_timestamps = [
            timestamp for timestamp in self.request_timestamps 
            if now - timestamp < timedelta(minutes=1)
        ]
        
        # Check if we're under the limit
        can_request = len(self.request_timestamps) < self.max_requests_per_minute
        
        if not can_request:
            oldest_request = min(self.request_timestamps)
            wait_time = 60 - (now - oldest_request).total_seconds()
            print(f"⏰ Rate limit reached. Need to wait {wait_time:.1f} seconds")
        
        return can_request
    
    def _record_request(self):
        """Record that we made a request"""
        self.request_timestamps.append(datetime.now())
        remaining = self.max_requests_per_minute - len(self.request_timestamps)
        print(f"📊 Requests remaining this minute: {remaining}")
    
    def _wait_for_rate_limit(self):
        """Wait if necessary to respect rate limit"""
        if not self._can_make_request():
            now = datetime.now()
            oldest_request = min(self.request_timestamps)
            wait_time = 60 - (now - oldest_request).total_seconds()
            
            print(f"⏳ Waiting {wait_time:.1f} seconds for rate limit...")
            time.sleep(wait_time + 1)  # Add 1 second buffer
    
    def is_available(self) -> bool:
        """Check if OpenAI service is available"""
        return self.client is not None and self.api_key is not None
    
    def generate_bedtime_story(self, location: str = "Morocco") -> str:
        """Generate a one-sentence bedtime story about a specific location"""
        if not self.is_available():
            return "OpenAI service is not available. Please check your API key configuration."
        
        # Respect rate limit
        self._wait_for_rate_limit()
        
        try:
            prompt = f"Write a one-sentence bedtime story about {location}."
            
            print(f"🤖 Generating bedtime story about {location}... (respecting rate limit)")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a creative storyteller who writes beautiful, gentle bedtime stories. Create only one sentence that is magical and soothing."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                max_tokens=100,
                temperature=0.8
            )
            
            # Record the request
            self._record_request()
            
            story = response.choices[0].message.content.strip()
            print(f"✅ Generated story: {story}")
            return story
            
        except Exception as e:
            error_msg = f"Error generating bedtime story: {str(e)}"
            print(f"❌ {error_msg}")
            return error_msg
    
    def generate_call_summary(self, audio_file_name: str) -> str:
        """Generate a summary of what might have been discussed in the call"""
        if not self.is_available():
            return "OpenAI service is not available. Please check your API key configuration."
        
        # Respect rate limit
        self._wait_for_rate_limit()
        
        try:
            prompt = f"Generate a brief, creative summary of what might have been discussed in a phone call that was recorded as '{audio_file_name}'. Make it whimsical and imaginative."
            
            print(f"🤖 Generating call summary for {audio_file_name}... (respecting rate limit)")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a creative writer who imagines interesting conversations. Create brief, family-friendly summaries that are whimsical and positive."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                max_tokens=80,
                temperature=0.7
            )
            
            # Record the request
            self._record_request()
            
            summary = response.choices[0].message.content.strip()
            print(f"✅ Generated summary: {summary}")
            return summary
            
        except Exception as e:
            error_msg = f"Error generating call summary: {str(e)}"
            print(f"❌ {error_msg}")
            return error_msg
    
    def generate_custom_response(self, prompt: str, max_tokens: int = 150) -> str:
        """Generate a custom response based on user prompt"""
        if not self.is_available():
            return "OpenAI service is not available. Please check your API key configuration."
        
        try:
            print(f"🤖 Generating response for: {prompt[:50]}...")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a helpful and creative assistant."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                max_tokens=max_tokens,
                temperature=0.8
            )
            
            result = response.choices[0].message.content.strip()
            print(f"✅ Generated response: {result[:100]}...")
            return result
            
        except Exception as e:
            error_msg = f"Error generating response: {str(e)}"
            print(f"❌ {error_msg}")
            return error_msg

# Global instance
openai_service = OpenAIService()
