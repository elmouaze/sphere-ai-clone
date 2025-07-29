#!/bin/bash

echo "🚀 Starting Sphere AI Clone with Audio Recording Backend..."

# Check if Python requirements are installed
if [ ! -d "backend/venv" ]; then
    echo "📦 Installing Python dependencies..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Start both backend and frontend
echo "🎤 Starting audio recording backend on port 3001..."
echo "⚡ Starting React frontend on port 8082..."

npm run dev:full
