from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import uuid
from datetime import datetime, timedelta
import base64
import wave
import threading
import time
import subprocess
import tempfile

# Import configuration handler
from config import config

# Import OpenAI service
from openai_service import openai_service

app = Flask(__name__)
# Allow configured origins for CORS
CORS(app, origins=config.get_cors_origins())

# Create recordings directory
RECORDINGS_DIR = config.get_recordings_dir()
if not os.path.exists(RECORDINGS_DIR):
    os.makedirs(RECORDINGS_DIR)

# Store active recordings and transcription sessions
active_recordings = {}
active_transcriptions = {}  # New: track real-time transcription sessions

class SimpleTranscriber:
    """Simple transcription service that processes audio chunks"""
    
    def __init__(self, recording_id):
        self.recording_id = recording_id
        self.transcription = ['']
        self.is_running = False
        self.last_update = datetime.now()
        
    def start_transcription(self):
        """Start transcription session"""  
        self.is_running = True
        print(f"📝 Started transcription for recording {self.recording_id}")
        return True
    
    def process_audio_chunk(self, audio_data_b64):
        """Process an audio chunk for transcription"""
        try:
            current_time = datetime.now()  
            
            # Always try to process the chunk (remove size restriction for debugging)
            simulated_text = self._simulate_transcription_api(audio_data_b64)
            
            if simulated_text:
                # Update current phrase or add new one based on timing
                time_since_last = (current_time - self.last_update).total_seconds()
                
                if time_since_last > 2:  # Reduced to 2 seconds for more responsive updates
                    self.transcription.append(simulated_text)
                    print(f"📝 NEW PHRASE: {simulated_text}")
                else:
                    # Update current phrase
                    self.transcription[-1] = simulated_text
                    print(f"📝 UPDATED PHRASE: {simulated_text}")
                
                self.last_update = current_time
                return simulated_text
            else:
                # Even if no transcription, log that we received the chunk
                try:
                    chunk_size = len(base64.b64decode(audio_data_b64))
                    print(f"📦 Processed chunk: {chunk_size} bytes (no transcription generated)")
                except:
                    print(f"📦 Processed chunk: invalid base64")
            
        except Exception as e:
            print(f"❌ Error processing chunk for transcription: {e}")
        
        return None
    
    def process_speech_detected_chunk(self, audio_data_b64, detected_speech):
        """Process an audio chunk that was detected to contain speech"""
        try:
            current_time = datetime.now()
            
            # For speech-detected chunks, we can use the detected speech directly
            # or still process through the transcription API for verification
            print(f"🗣️ Processing speech-detected chunk: '{detected_speech}'")
            
            # Option 1: Use the detected speech directly (faster)
            if detected_speech and detected_speech not in ["Speech detected", "Final chunk"]:
                transcribed_text = detected_speech.strip()
            else:
                # Option 2: Still process through API for better accuracy
                transcribed_text = self._simulate_transcription_api(audio_data_b64)
            
            if transcribed_text:
                # Always add as new phrase for speech-detected chunks
                # since they represent complete speech segments
                self.transcription.append(transcribed_text)
                self.last_update = current_time
                print(f"📝 NEW SPEECH PHRASE: {transcribed_text}")
                return transcribed_text
            else:
                print(f"⚪ No transcription from speech-detected chunk")
                
        except Exception as e:
            print(f"❌ Error processing speech-detected chunk: {e}")
        
        return None
    
    def _simulate_transcription_api(self, audio_data_b64):
        """Simulate transcription API call"""
        # This is a placeholder - replace with actual API call
        # Example: OpenAI Whisper API, Google Speech-to-Text, etc.
        
        try:
            # Decode the audio data (just to check if it's valid)
            audio_bytes = base64.b64decode(audio_data_b64)
            
            # Simulate API response based on audio data size
            if len(audio_bytes) > 100:  # Lowered threshold - process smaller chunks too
                # Simulate different responses
                sample_phrases = [
                    "Hello, how are you doing today?",
                    "This is a test of the transcription system.",
                    "The weather is really nice outside.",
                    "I'm testing the real-time speech recognition.",
                    "This system is working quite well.",
                    "Yes, I can hear you clearly.",
                    "The audio quality sounds good.",
                    "Let me process that for you."
                ]
                
                # Return a random phrase (in real implementation, this would be actual transcription)
                import random
                return sample_phrases[random.randint(0, len(sample_phrases) - 1)]
            
        except Exception as e:
            print(f"❌ Simulation error: {e}")
            
        return None
    
    def stop_transcription(self):
        """Stop transcription and return final result"""
        self.is_running = False
        print(f"⏹️ Stopped transcription for recording {self.recording_id}")
        return self.transcription
    
    def get_current_transcription(self):
        """Get current transcription state"""
        return {
            'current_text': self.transcription[-1] if self.transcription else '',
            'full_transcription': self.transcription.copy(),
            'last_update': self.last_update.isoformat(),
            'is_active': self.is_running
        }

@app.route('/')
def home():
    return {"message": "Audio Recording Backend", "status": "running"}

@app.route('/health')
def health():
    return {"status": "healthy", "service": "audio-backend"}

@app.route('/recording/start', methods=['POST'])
def start_recording():
    try:
        data = request.get_json()
        model = data.get('model', 'default')
        enable_transcription = data.get('enable_transcription', True)  # New option
        
        # Generate unique recording ID
        recording_id = str(uuid.uuid4())
        
        # Create recording metadata
        recording_info = {
            "id": recording_id,
            "model": model,
            "start_time": datetime.now().isoformat(),
            "status": "recording",
            "chunks": [],
            "filename": f"recording_{recording_id}.mp3",
            "transcription_enabled": enable_transcription
        }
        
        active_recordings[recording_id] = recording_info
        
        # Start real-time transcription if enabled
        transcription_started = False
        if enable_transcription:
            try:
                transcriber = SimpleTranscriber(recording_id)
                if transcriber.start_transcription():
                    active_transcriptions[recording_id] = {
                        'transcriber': transcriber,
                        'current_text': '',
                        'full_transcription': [''],
                        'last_update': datetime.now().isoformat()
                    }
                    transcription_started = True
            except Exception as e:
                print(f"❌ Failed to start transcription: {e}")
        
        return jsonify({
            "success": True,
            "recording_id": recording_id,
            "message": "Recording started",
            "transcription_enabled": transcription_started
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/recording/chunk', methods=['POST'])
def upload_chunk():
    try:
        data = request.get_json()
        recording_id = data.get('recording_id')
        audio_data = data.get('audio_data')  # Base64 encoded audio
        detected_speech = data.get('detected_speech')  # Optional: detected speech text
        
        if recording_id not in active_recordings:
            return jsonify({"success": False, "error": "Recording not found"}), 404
        
        if not audio_data:
            return jsonify({"success": False, "error": "No audio data provided"}), 400
        
        # Store the audio chunk
        active_recordings[recording_id]["chunks"].append(audio_data)
        chunk_count = len(active_recordings[recording_id]["chunks"])
        
        # Decode and check the chunk size for debugging FIRST
        chunk_size = 0
        try:
            decoded_chunk = base64.b64decode(audio_data)
            chunk_size = len(decoded_chunk)
            
            # Log with speech detection info if available
            if detected_speech:
                print(f"�️ SPEECH-DETECTED chunk {chunk_count} for recording {recording_id}: {chunk_size} bytes - '{detected_speech}'")
            else:
                print(f"�📦 Received chunk {chunk_count} for recording {recording_id}: {chunk_size} bytes")
            
            # Also log first few bytes to see if it's valid audio data
            if chunk_size > 10:
                header_bytes = decoded_chunk[:10].hex()
                print(f"🔍 Chunk header: {header_bytes}")
                
        except Exception as decode_error:
            print(f"❌ Error decoding chunk: {decode_error}")
        
        # Process chunk for transcription if enabled
        transcription_result = None
        if recording_id in active_transcriptions:
            try:
                transcriber = active_transcriptions[recording_id].get('transcriber')
                if transcriber and transcriber.is_running:
                    if detected_speech:
                        print(f"🎤 Processing SPEECH-DETECTED chunk {chunk_count} for transcription ({chunk_size} bytes)")
                        # Priority processing for speech-detected chunks
                        transcribed_text = transcriber.process_speech_detected_chunk(audio_data, detected_speech)
                    else:
                        print(f"🎤 Processing regular chunk {chunk_count} for transcription ({chunk_size} bytes)")
                        transcribed_text = transcriber.process_audio_chunk(audio_data)
                    
                    if transcribed_text:
                        # Update the active transcription data
                        transcription_data = transcriber.get_current_transcription()
                        active_transcriptions[recording_id].update(transcription_data)
                        transcription_result = transcribed_text
                        print(f"✅ Transcription result: {transcribed_text}")
                    else:
                        print(f"⚪ No transcription generated for chunk {chunk_count}")
            except Exception as e:
                print(f"❌ Error processing transcription for chunk: {e}")
        
        return jsonify({
            "success": True,
            "message": "Chunk uploaded",
            "chunks_count": chunk_count,
            "chunk_size": chunk_size,
            "transcription_result": transcription_result,
            "speech_detected": bool(detected_speech)
        })
        
    except Exception as e:
        print(f"❌ Error uploading chunk: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/transcription/<recording_id>', methods=['GET'])
def get_transcription(recording_id):
    """Get current transcription for a recording"""
    try:
        if recording_id not in active_transcriptions:
            return jsonify({"success": False, "error": "Transcription not found"}), 404
        
        transcription_data = active_transcriptions[recording_id]
        
        return jsonify({
            "success": True,
            "recording_id": recording_id,
            "current_text": transcription_data.get('current_text', ''),
            "full_transcription": transcription_data.get('full_transcription', ['']),
            "last_update": transcription_data.get('last_update', ''),
            "is_active": recording_id in active_recordings and 
                        active_recordings[recording_id]['status'] == 'recording'
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/transcription/stream/<recording_id>', methods=['GET'])
def stream_transcription(recording_id):
    """Stream transcription updates (Server-Sent Events)"""
    def generate_transcription_stream():
        while (recording_id in active_transcriptions and 
               recording_id in active_recordings and 
               active_recordings[recording_id]['status'] == 'recording'):
            
            transcription_data = active_transcriptions.get(recording_id, {})
            yield f"data: {json.dumps(transcription_data)}\n\n"
            time.sleep(0.5)  # Update every 500ms
    
    return jsonify({"message": "Use GET with Accept: text/event-stream header for streaming"})

@app.route('/recording/stop', methods=['POST'])
def stop_recording():
    try:
        data = request.get_json()
        recording_id = data.get('recording_id')
        
        if recording_id not in active_recordings:
            return jsonify({"success": False, "error": "Recording not found"}), 404
        
        recording_info = active_recordings[recording_id]
        recording_info["end_time"] = datetime.now().isoformat()
        recording_info["status"] = "completed"
        
        # Stop transcription if it was running
        final_transcription = []
        if recording_id in active_transcriptions:
            try:
                transcriber = active_transcriptions[recording_id].get('transcriber')
                if transcriber:
                    final_transcription = transcriber.stop_transcription()
                    print(f"📝 Final transcription: {final_transcription}")
                
                # Store final transcription in recording info
                recording_info["transcription"] = final_transcription
                
                # Clean up transcription session
                del active_transcriptions[recording_id]
            except Exception as e:
                print(f"❌ Error stopping transcription: {e}")
        
        # Combine all chunks and save audio file
        filename = recording_info["filename"]
        filepath = os.path.join(RECORDINGS_DIR, filename)
        
        # Process the actual audio chunks
        total_chunks = len(recording_info["chunks"])
        print(f"🎵 Processing {total_chunks} audio chunks for recording {recording_id}")
        
        if recording_info["chunks"]:
            try:
                # Combine all base64 audio chunks
                all_audio_data = b''
                valid_chunks = 0
                
                for i, chunk_b64 in enumerate(recording_info["chunks"]):
                    try:
                        chunk_data = base64.b64decode(chunk_b64)
                        all_audio_data += chunk_data
                        valid_chunks += 1
                        print(f"✅ Processed chunk {i+1}: {len(chunk_data)} bytes")
                    except Exception as chunk_error:
                        print(f"❌ Failed to process chunk {i+1}: {chunk_error}")
                
                print(f"📊 Successfully processed {valid_chunks}/{total_chunks} chunks, total size: {len(all_audio_data)} bytes")
                
                if len(all_audio_data) > 0:
                    # Save the combined audio data as temporary WebM file
                    temp_webm_path = filepath  # Keep original WebM temporarily
                    with open(temp_webm_path, 'wb') as f:
                        f.write(all_audio_data)
                    
                    print(f"✅ Saved temporary WebM file: {temp_webm_path} ({len(all_audio_data)} bytes)")
                    
                    # Convert to MP3
                    mp3_filename = filename.replace('.webm', '.mp3')
                    mp3_filepath = os.path.join(RECORDINGS_DIR, mp3_filename)
                    
                    if convert_webm_to_mp3(temp_webm_path, mp3_filepath):
                        # Update recording info to point to MP3 file
                        recording_info["filename"] = mp3_filename
                        filepath = mp3_filepath
                        
                        # Verify MP3 file was created
                        if os.path.exists(mp3_filepath):
                            mp3_size = os.path.getsize(mp3_filepath)
                            print(f"🎵 MP3 file created successfully: {mp3_filepath} ({mp3_size} bytes)")
                            
                            # Clean up temporary WebM file
                            try:
                                os.remove(temp_webm_path)
                                print(f"🗑️ Cleaned up temporary WebM file")
                            except Exception as cleanup_error:
                                print(f"⚠️ Could not clean up temporary file: {cleanup_error}")
                        else:
                            print(f"❌ MP3 file creation failed, keeping WebM")
                    else:
                        print(f"❌ MP3 conversion failed, keeping WebM file")
                    
                    # Verify the final file exists
                    if os.path.exists(filepath):
                        actual_size = os.path.getsize(filepath)
                        print(f"📁 Final file verification: {filepath} exists, size: {actual_size} bytes")
                    else:
                        print(f"❌ Final file verification failed: {filepath} does not exist")
                else:
                    print(f"⚠️ No valid audio data to save")
                    # Create error file
                    with open(filepath, 'w') as f:
                        f.write("No valid audio data processed")
                
                # Also save transcription as text file
                if final_transcription:
                    transcript_filename = f"transcript_{recording_id}.txt"
                    transcript_filepath = os.path.join(RECORDINGS_DIR, transcript_filename)
                    with open(transcript_filepath, 'w', encoding='utf-8') as f:
                        f.write('\n'.join(final_transcription))
                    print(f"✅ Saved transcript: {transcript_filepath}")
                    recording_info["transcript_filename"] = transcript_filename
                
            except Exception as audio_error:
                print(f"❌ Error processing audio chunks: {audio_error}")
                # Fallback: create a minimal file indicating an error
                with open(filepath, 'w') as f:
                    f.write("Error processing audio chunks")
        else:
            # No chunks received, create empty file
            print("⚠️ No audio chunks received")
            with open(filepath, 'w') as f:
                f.write("No audio data received")
        
        # Calculate duration
        start_time = datetime.fromisoformat(recording_info["start_time"])
        end_time = datetime.fromisoformat(recording_info["end_time"])
        duration = (end_time - start_time).total_seconds()
        
        recording_info["duration"] = duration
        recording_info["file_size"] = os.path.getsize(filepath)
        
        # Generate OpenAI response after call ends
        openai_response = None
        try:
            print("🤖 Generating OpenAI response after call completion...")
            
            # Generate bedtime story about Morocco as requested
            bedtime_story = openai_service.generate_bedtime_story("Morocco")
            
            # Also generate a call summary
            call_summary = openai_service.generate_call_summary(duration, final_transcription)
            
            openai_response = {
                "bedtime_story": bedtime_story,
                "call_summary": call_summary,
                "story_output_text": bedtime_story  # This is the response.output_text equivalent
            }
            
            print(f"🌙 Bedtime Story: {bedtime_story}")
            print(f"📋 Call Summary: {call_summary}")
            
        except Exception as e:
            print(f"❌ Error generating OpenAI response: {e}")
            openai_response = {
                "error": str(e),
                "bedtime_story": "Error generating bedtime story",
                "call_summary": f"Call completed successfully (duration: {duration:.1f}s)"
            }
        
        return jsonify({
            "success": True,
            "recording_id": recording_id,
            "filename": filename,
            "duration": duration,
            "file_size": recording_info["file_size"],
            "download_url": f"/download/{recording_id}",
            "transcription": final_transcription,
            "transcript_available": bool(final_transcription),
            "openai_response": openai_response,
            "chat_message": openai_response.get("story_output_text") if openai_response else None
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/download/<recording_id>')
def download_recording(recording_id):
    try:
        if recording_id not in active_recordings:
            return jsonify({"error": "Recording not found"}), 404
        
        recording_info = active_recordings[recording_id]
        filepath = os.path.join(RECORDINGS_DIR, recording_info["filename"])
        
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=recording_info["filename"],
            mimetype='audio/mpeg'  # Correct MIME type for MP3 audio
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/recordings', methods=['GET'])
def list_recordings():
    try:
        recordings = []
        for recording_id, info in active_recordings.items():
            if info["status"] == "completed":
                recordings.append({
                    "id": recording_id,
                    "filename": info["filename"],
                    "model": info["model"],
                    "start_time": info["start_time"],
                    "duration": info.get("duration", 0),
                    "file_size": info.get("file_size", 0),
                    "download_url": f"/download/{recording_id}"
                })
        
        return jsonify({"recordings": recordings})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/ai/test', methods=['POST'])
def test_openai():
    """Test endpoint for OpenAI integration"""
    try:
        data = request.get_json()
        prompt = data.get('prompt', 'Write a one-sentence bedtime story about Morocco.')
        
        if not openai_service.is_available():
            return jsonify({
                "success": False, 
                "error": "OpenAI service not available. Check API key configuration."
            }), 400
        
        response_text = openai_service.generate_custom_response(prompt)
        
        return jsonify({
            "success": True,
            "prompt": prompt,
            "response": response_text,
            "output_text": response_text,  # Equivalent to response.output_text
            "model": config.get_openai_model()
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/ai/bedtime-story', methods=['GET'])
def get_bedtime_story():
    """Get a bedtime story about Morocco"""
    try:
        location = request.args.get('location', 'Morocco')
        
        if not openai_service.is_available():
            return jsonify({
                "success": False, 
                "error": "OpenAI service not available. Check API key configuration."
            }), 400
        
        story = openai_service.generate_bedtime_story(location)
        
        return jsonify({
            "success": True,
            "location": location,
            "story": story,
            "output_text": story  # Equivalent to response.output_text
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def create_wav_header(sample_rate=44100, channels=2, duration_seconds=1):
    """Create a basic WAV file header"""
    data_size = sample_rate * channels * 2 * duration_seconds  # 16-bit samples
    file_size = data_size + 36
    
    header = bytearray(44)
    
    # RIFF header
    header[0:4] = b'RIFF'
    header[4:8] = file_size.to_bytes(4, 'little')
    header[8:12] = b'WAVE'
    
    # fmt chunk
    header[12:16] = b'fmt '
    header[16:20] = (16).to_bytes(4, 'little')  # fmt chunk size
    header[20:22] = (1).to_bytes(2, 'little')   # audio format (PCM)
    header[22:24] = channels.to_bytes(2, 'little')
    header[24:28] = sample_rate.to_bytes(4, 'little')
    header[28:32] = (sample_rate * channels * 2).to_bytes(4, 'little')  # byte rate
    header[32:34] = (channels * 2).to_bytes(2, 'little')  # block align
    header[34:36] = (16).to_bytes(2, 'little')  # bits per sample
    
    # data chunk
    header[36:40] = b'data'
    header[40:44] = data_size.to_bytes(4, 'little')
    
    return bytes(header)

def convert_webm_to_mp3(webm_filepath, mp3_filepath):
    """Convert WebM audio file to MP3 using ffmpeg"""
    try:
        # Check if ffmpeg is available
        result = subprocess.run(['which', 'ffmpeg'], capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ ffmpeg not found. Installing ffmpeg...")
            # Try to install ffmpeg
            install_result = subprocess.run(['apt-get', 'update', '&&', 'apt-get', 'install', '-y', 'ffmpeg'], 
                                          shell=True, capture_output=True, text=True)
            if install_result.returncode != 0:
                raise Exception("Could not install ffmpeg. Please install it manually.")
        
        # Convert WebM to MP3 using ffmpeg
        cmd = [
            'ffmpeg', 
            '-i', webm_filepath,           # Input WebM file
            '-acodec', 'mp3',              # Audio codec: MP3
            '-ab', '128k',                 # Audio bitrate: 128 kbps
            '-ar', '44100',                # Sample rate: 44.1 kHz
            '-y',                          # Overwrite output file
            mp3_filepath                   # Output MP3 file
        ]
        
        print(f"🔄 Converting {webm_filepath} to MP3...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Successfully converted to MP3: {mp3_filepath}")
            return True
        else:
            print(f"❌ ffmpeg conversion failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error converting to MP3: {e}")
        return False

if __name__ == '__main__':
    print("🚀 Starting Sphere AI Clone Audio Recording Backend...")
    print("📁 Recordings will be saved in:", os.path.abspath(RECORDINGS_DIR))
    
    # Print configuration summary
    print("\n⚙️ Configuration Summary:")
    config_summary = config.get_config_summary()
    for section, settings in config_summary.items():
        print(f"  {section.upper()}:")
        for key, value in settings.items():
            print(f"    {key}: {value}")
    
    # Check API key availability
    ai_providers = config.get_available_ai_providers()
    available_providers = [provider for provider, available in ai_providers.items() if available]
    if available_providers:
        print(f"\n🔑 Available AI providers: {', '.join(available_providers)}")
    else:
        print("\n⚠️ No AI API keys configured. Add your API keys to .env.local")
    
    print(f"\n🌐 Server starting on http://{config.get_flask_host()}:{config.get_flask_port()}")
    
    app.run(
        host=config.get_flask_host(), 
        port=config.get_flask_port(), 
        debug=config.get_flask_debug()
    )
