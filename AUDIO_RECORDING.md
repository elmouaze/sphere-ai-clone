# Sphere AI Clone - Audio Recording Feature

This application now includes real audio recording functionality with a Python backend for processing and downloading recorded audio files.

## 🎤 Audio Recording Features

- **Real-time audio recording** during voice calls
- **Python backend** for audio processing and storage
- **Download recordings** as WAV files after calls
- **Visual feedback** with orb animation and audio levels
- **Backend connection status** indicator

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Microphone access (browser will request permission)

### Setup & Run

1. **Install Python dependencies:**
   ```bash
   npm run backend:install
   ```

2. **Start both backend and frontend:**
   ```bash
   npm run dev:full
   ```

   Or use the startup script:
   ```bash
   ./start.sh
   ```

   Or start them separately:
   ```bash
   # Terminal 1: Python backend
   npm run backend

   # Terminal 2: React frontend
   npm run dev
   ```

### Services
- **Frontend**: http://localhost:8082 (or 8080/8081)
- **Backend API**: http://localhost:3001
- **Recordings**: Saved in `backend/recordings/` folder

## 🎯 How to Use

1. **Start a call**: Click the phone button in the chat interface
2. **Begin recording**: Click the microphone button (browser will ask for mic permission)
3. **See live feedback**: The orb will react to your voice, showing audio levels
4. **Stop recording**: Click the microphone button again
5. **End call**: Click the red phone button
6. **Download**: A prominent download section will appear with:
   - Recording filename and duration
   - Big blue "Download Audio" button
   - Clear button (✕) to remove the download section
7. **Success feedback**: Chat messages confirm download completion

### Services
- **Frontend**: http://localhost:8081 (or 8080/8082)
- **Backend API**: http://localhost:3001
- **Recordings**: Saved in `backend/recordings/` folder

### Frontend Features
- **WebRTC MediaRecorder**: Captures audio in real-time
- **Chunked upload**: Sends audio data to backend in 1-second chunks
- **Visual feedback**: Orb animation responds to recording state
- **Status indicators**: Shows backend connection and call status

### Backend Features
- **Flask API**: Handles recording sessions and file management
- **WAV file generation**: Converts recorded chunks to downloadable WAV files
- **Session management**: Tracks multiple recording sessions
- **File serving**: Provides download endpoints for recordings

### API Endpoints
- `POST /recording/start` - Start a new recording session
- `POST /recording/chunk` - Upload audio chunk
- `POST /recording/stop` - End recording and generate file
- `GET /download/<id>` - Download recording file
- `GET /recordings` - List all recordings

## 🎨 UI Changes

When in a call, you'll see:
- **Small orb** in top-right corner (reacts to voice)
- **Call controls** overlaid on the orb (mic/end call buttons)
- **Call duration** badge above the orb
- **Audio level** bar below the orb
- **Call status** badge in the header

After ending a call with recording:
- **Prominent download section** with gradient background
- **Recording info** showing filename and duration
- **Large "Download Audio" button** for easy access
- **Clear button** to dismiss the download section
- **Chat notifications** about recording status
- **Success/error messages** for download attempts

## 🔊 Audio Permissions

The browser will request microphone permissions when you first start recording. Make sure to:
1. Allow microphone access when prompted
2. Check your browser's site permissions if recording doesn't work
3. Ensure your microphone is working in other applications

## 📁 File Storage

Recordings are saved as:
- **Location**: `backend/recordings/`
- **Format**: WAV files
- **Naming**: `recording_<uuid>.wav`
- **Cleanup**: Files persist until manually deleted

## 🐛 Troubleshooting

### Backend Connection Issues
- Check if Python backend is running on port 3001
- Verify Flask dependencies are installed
- Look for CORS errors in browser console

### Recording Issues
- Ensure microphone permissions are granted
- Check browser compatibility (Chrome/Firefox recommended)
- Verify audio input device is working

### Download Issues
- Wait for recording to complete before downloading
- Check if file exists in `backend/recordings/`
- Try refreshing the page if download doesn't start

## 🔧 Development

### Backend Development
```bash
cd backend
python app.py  # Start with auto-reload
```

### Frontend Development
```bash
npm run dev  # Start with hot reload
```

### Testing Audio Recording
1. Start both services
2. Open browser console to see debug logs
3. Test with short recordings first
4. Check `backend/recordings/` folder for files

## 📝 Next Steps

Potential enhancements:
- Speech-to-text transcription
- Audio quality settings
- Recording compression
- Cloud storage integration
- Real-time audio processing
- Voice activity detection
