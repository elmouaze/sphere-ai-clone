from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import uuid
from datetime import datetime
import base64
import wave

app = Flask(__name__)
# Allow all origins for Codespaces compatibility
CORS(app, origins="*")

# Create recordings directory
RECORDINGS_DIR = "recordings"
if not os.path.exists(RECORDINGS_DIR):
    os.makedirs(RECORDINGS_DIR)

# Store active recordings
active_recordings = {}

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
        
        # Generate unique recording ID
        recording_id = str(uuid.uuid4())
        
        # Create recording metadata
        recording_info = {
            "id": recording_id,
            "model": model,
            "start_time": datetime.now().isoformat(),
            "status": "recording",
            "chunks": [],
            "filename": f"recording_{recording_id}.wav"
        }
        
        active_recordings[recording_id] = recording_info
        
        return jsonify({
            "success": True,
            "recording_id": recording_id,
            "message": "Recording started"
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/recording/chunk', methods=['POST'])
def upload_chunk():
    try:
        data = request.get_json()
        recording_id = data.get('recording_id')
        audio_data = data.get('audio_data')  # Base64 encoded audio
        
        if recording_id not in active_recordings:
            return jsonify({"success": False, "error": "Recording not found"}), 404
        
        # Store the audio chunk
        active_recordings[recording_id]["chunks"].append(audio_data)
        
        return jsonify({
            "success": True,
            "message": "Chunk uploaded",
            "chunks_count": len(active_recordings[recording_id]["chunks"])
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

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
        
        # Combine all chunks and save as WAV file
        filename = recording_info["filename"]
        filepath = os.path.join(RECORDINGS_DIR, filename)
        
        # For now, create a simple placeholder file
        # In a real implementation, you'd combine the audio chunks properly
        with open(filepath, 'wb') as f:
            # Write a minimal WAV header (44 bytes) + some silence
            # This is just a placeholder - you'd normally process the actual audio data
            wav_header = create_wav_header(duration_seconds=len(recording_info["chunks"]))
            f.write(wav_header)
            
            # Write silence data (you'd replace this with actual audio processing)
            silence_data = b'\x00' * (44100 * 2 * len(recording_info["chunks"]))  # 1 second per chunk
            f.write(silence_data)
        
        # Calculate duration
        start_time = datetime.fromisoformat(recording_info["start_time"])
        end_time = datetime.fromisoformat(recording_info["end_time"])
        duration = (end_time - start_time).total_seconds()
        
        recording_info["duration"] = duration
        recording_info["file_size"] = os.path.getsize(filepath)
        
        return jsonify({
            "success": True,
            "recording_id": recording_id,
            "filename": filename,
            "duration": duration,
            "file_size": recording_info["file_size"],
            "download_url": f"/download/{recording_id}"
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
            mimetype='audio/wav'
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

if __name__ == '__main__':
    print("Starting Audio Recording Backend...")
    print("Recordings will be saved in:", os.path.abspath(RECORDINGS_DIR))
    app.run(host='0.0.0.0', port=3001, debug=True)
