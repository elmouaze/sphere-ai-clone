# Sphere AI Clone - Audio Recording System

A React-based application with real-time audio recording capabilities, featuring a Flask backend for audio processing and a modern frontend interface.

## 🎯 Project Overview

This project implements a comprehensive audio recording system with:
- **Real-time audio capture** with WebRTC MediaRecorder API
- **Continuous recording** with thread-safe queue system
- **Speech recognition integration** for intelligent audio chunking
- **Flask backend** for audio processing and storage
- **Modern React frontend** with shadcn/ui components

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Port**: 8080 (Vite development server)
- **Main Components**: Merged call interface with chat panel
- **Audio Service**: `src/services/backend.ts` - Handles audio recording logic

### Backend (Flask + Python)
- **Port**: 3001 (Flask development server)
- **Main File**: `backend/app.py` - Audio processing endpoints
- **Storage**: `recordings/` directory for audio files

## 🎵 Audio Recording System

### Frontend Audio Components

#### `src/services/backend.ts` - Main Audio Service
Implements continuous recording with thread-safe queue system:

```typescript
class BackendService {
  // Continuous recording properties
  private audioQueue: Blob[] = [];           // Thread-safe queue equivalent
  private accumulatedAudio: Blob[] = [];     // Processed audio buffer
  private processingInterval: number | null = null; // Continuous processing loop
  private phraseTimeout: number = 3000;      // 3 second phrase timeout
  private lastProcessTime: number = 0;       // Timestamp tracking
}
```

**Key Features:**
- **🔄 Continuous Queue Processing**: Runs every 250ms to process audio chunks
- **🎤 Speech Recognition Integration**: Uses Web Speech API for natural phrase boundaries  
- **⚡ MediaRecorder Management**: Handles real-time audio capture from microphone
- **📤 Intelligent Upload**: Batches audio chunks based on speech detection or timeout
- **🛡️ Error Prevention**: Prevents audio chunk loss through continuous buffering

#### Core Methods:

```typescript
// Start continuous recording with queue system
async startRecording(enableTranscription?: boolean): Promise<boolean>

// Stop recording and send final accumulated audio  
async stopRecording(): Promise<RecordingResponse>

// Continuous processing loop (like Python thread)
private startContinuousProcessing(): void

// Send accumulated audio when speech ends or timeout occurs
private sendAccumulatedAudio(trigger: string): Promise<void>
```

### Backend Audio Processing

#### `backend/app.py` - Flask Audio Server
Handles audio chunk processing and file generation:

**Key Endpoints:**
- `POST /recording/start` - Initialize new recording session
- `POST /recording/chunk` - Process incoming audio chunks
- `POST /recording/stop` - Finalize recording and generate file
- `GET /recording/<id>/download` - Download processed audio file

**Audio Processing Features:**
- **📦 Chunk Validation**: Validates base64 audio data integrity
- **🔧 MP3 Generation**: Converts WebM chunks to MP3 format using ffmpeg
- **📝 Detailed Logging**: Comprehensive audio processing logs
- **💾 File Management**: Automatic cleanup and storage management

```python
@app.route('/recording/chunk', methods=['POST'])
def upload_chunk():
    # Receive and validate audio chunk
    # Store in recording session
    # Provide detailed processing feedback
```

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- Python 3.x
- **ffmpeg** (for MP3 conversion)
- Modern web browser with microphone access

### Installation & Setup

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd sphere-ai-clone
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
pip install flask flask-cors
# Install ffmpeg for MP3 conversion
sudo apt-get install ffmpeg  # Ubuntu/Debian
# or brew install ffmpeg     # macOS
```

4. **Start the backend server**
```bash
python backend/app.py
```
Backend will run on: `http://localhost:3001`

5. **Start the frontend development server**
```bash
npm run dev
```
Frontend will run on: `http://localhost:8080`

### Configuration

The Vite configuration automatically proxies API calls:
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

## 🎤 Audio Recording Workflow

### 1. Recording Initialization
```typescript
// Frontend starts recording
const success = await backendService.startRecording(true);
// Backend creates recording session and returns recording_id
```

### 2. Continuous Audio Capture
```typescript
// MediaRecorder generates 250ms chunks
mediaRecorder.start(250);
// Chunks are added to audioQueue continuously
audioQueue.push(audioChunk);
```

### 3. Queue Processing Loop
```typescript
// Every 250ms, process queued chunks
setInterval(() => {
  // Move audioQueue chunks to accumulatedAudio
  // Check for speech detection or timeout
  // Send accumulated audio when appropriate
}, 250);
```

### 4. Smart Audio Upload  
```typescript
// Send audio on speech completion or timeout
await sendAccumulatedAudio('speech_detected');
// Backend processes and stores audio chunks
```

### 5. Recording Finalization
```typescript
// Stop recording and get final MP3 file
const response = await backendService.stopRecording();
// Download processed MP3 audio file
```

## 🔧 Technical Features

### Continuous Recording System
- **Thread-Safe Queue**: JavaScript equivalent of Python's `queue.Queue()`
- **Phrase Timeout**: 3-second timeout for natural speech boundaries
- **Chunk Batching**: Intelligent combining of audio chunks before upload
- **Loss Prevention**: No audio data lost during network delays or processing

### Speech Recognition Integration
- **Web Speech API**: Real-time speech detection for natural chunking
- **Fallback Timeout**: Ensures audio is sent even without speech detection
- **Transcript Capture**: Optional transcription of detected speech

### Error Handling & Logging
- **Comprehensive Logging**: Detailed logs for debugging audio issues
- **Error Recovery**: Graceful handling of microphone/network failures
- **Data Validation**: Thorough validation of audio chunk integrity

## 📁 Project Structure

```
sphere-ai-clone/
├── src/
│   ├── services/
│   │   └── backend.ts          # Main audio recording service
│   ├── components/
│   │   ├── CallInterface.tsx   # Recording UI components
│   │   └── ChatPanel.tsx       # Chat interface
│   └── pages/
│       └── Index.tsx           # Main application page
├── backend/
│   └── app.py                  # Flask audio processing server
├── recordings/                 # Audio file storage directory
├── vite.config.ts             # Frontend build configuration
└── package.json               # Frontend dependencies
```

## 🛠️ Development

### Running in Development Mode
1. Backend: `python backend/app.py` (Port 3001)
2. Frontend: `npm run dev` (Port 8080)
3. Access application: `http://localhost:8080`

### Testing Audio Recording
1. Open browser and allow microphone access
2. Click "Start Recording" button
3. Speak into microphone
4. Click "Stop Recording" to finalize
5. Download processed MP3 audio file

## 🚀 Deployment

### Frontend Deployment
```bash
npm run build
# Deploy dist/ folder to your hosting service
```

### Backend Deployment  
```bash
# Use production WSGI server like Gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:3001 backend.app:app
```

## 🔍 Troubleshooting

### Common Issues
- **Microphone Access**: Ensure HTTPS in production for microphone access
- **CORS Issues**: Backend includes CORS headers for cross-origin requests
- **Audio Quality**: 16kHz sample rate optimized for speech recognition
- **File Size**: Audio chunks are efficiently batched to minimize file size

### Debug Logging
Enable detailed audio logging by checking browser console:
- 📦 Audio chunk information
- 🎤 Speech recognition status  
- 📤 Upload progress and responses
- ⚡ Continuous processing status

## 📋 Technologies Used

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build and development
- **shadcn/ui** - Modern component library
- **Tailwind CSS** - Utility-first styling
- **WebRTC MediaRecorder** - Audio capture
- **Web Speech API** - Speech recognition

### Backend  
- **Flask** - Python web framework
- **Flask-CORS** - Cross-origin resource sharing
- **Python 3.x** - Server-side processing
- **ffmpeg** - Audio format conversion (WebM to MP3)
- **Base64 Encoding** - Audio data transmission

## 📞 Support

For issues related to:
- **Audio Recording**: Check browser console for detailed logs
- **Backend Connection**: Verify both servers are running on correct ports
- **Microphone Access**: Ensure proper permissions in browser settings

---

Built with ❤️ using modern web technologies for reliable audio recording.
