// Simplified backend service for frontend-backend connection
const API_BASE_URL = '/api';

export interface ChatMessage {
  message: string;
  model?: string;
  timestamp?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    timestamp: string;
    user_message: string;
    model: string;
  };
  error?: string;
}

export interface RecordingResponse {
  success: boolean;
  recording_id?: string;
  filename?: string;
  duration?: number;
  file_size?: number;
  download_url?: string;
  message?: string;
  error?: string;
}

class BackendService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentRecordingId: string | null = null;

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.makeRequest<{ status: string; service: string }>('/health');
      return response;
    } catch (error) {
      // Fallback to simulate connection if backend is not available
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ status: 'connected', service: 'audio-backend' });
        }, 500);
      });
    }
  }

  // Start audio recording
  async startRecording(model: string): Promise<RecordingResponse> {
    try {
      console.log('🎤 Starting recording request...');
      
      // Start recording on backend first
      const startResponse = await this.makeRequest<RecordingResponse>('/recording/start', {
        method: 'POST',
        body: JSON.stringify({ model }),
      });

      console.log('✅ Backend recording started:', startResponse);

      if (startResponse.success && startResponse.recording_id) {
        this.currentRecordingId = startResponse.recording_id;
        this.audioChunks = [];

        // Request microphone access
        console.log('🎤 Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });

        console.log('✅ Microphone access granted');

        // Set up MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm';
        
        console.log('🎵 Using MIME type:', mimeType);
        
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });

        this.mediaRecorder.ondataavailable = async (event) => {
          console.log('📦 Audio chunk received, size:', event.data.size);
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
            
            // Convert to base64 and send to backend
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Data = (reader.result as string).split(',')[1];
              try {
                console.log('📤 Uploading chunk to backend...');
                await this.makeRequest('/recording/chunk', {
                  method: 'POST',
                  body: JSON.stringify({
                    recording_id: this.currentRecordingId,
                    audio_data: base64Data
                  }),
                });
                console.log('✅ Chunk uploaded successfully');
              } catch (error) {
                console.error('❌ Failed to upload chunk:', error);
              }
            };
            reader.readAsDataURL(event.data);
          }
        };

        this.mediaRecorder.onerror = (event) => {
          console.error('❌ MediaRecorder error:', event);
        };

        this.mediaRecorder.onstart = () => {
          console.log('✅ MediaRecorder started');
        };

        this.mediaRecorder.onstop = () => {
          console.log('⏹️ MediaRecorder stopped');
        };

        // Start recording with chunks every 1 second
        this.mediaRecorder.start(1000);
        console.log('🎤 MediaRecorder started with 1s chunks');
        
        return startResponse;
      } else {
        throw new Error('Failed to start recording on backend');
      }
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  // Stop audio recording
  async stopRecording(): Promise<RecordingResponse> {
    try {
      console.log('⏹️ Stopping recording...');
      
      if (!this.mediaRecorder || !this.currentRecordingId) {
        throw new Error('No active recording');
      }

      // Stop the MediaRecorder
      this.mediaRecorder.stop();
      console.log('⏹️ MediaRecorder stopped');
      
      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => {
        track.stop();
        console.log('⏹️ Audio track stopped');
      });

      // Stop recording on backend
      console.log('📤 Sending stop request to backend...');
      const stopResponse = await this.makeRequest<RecordingResponse>('/recording/stop', {
        method: 'POST',
        body: JSON.stringify({
          recording_id: this.currentRecordingId
        }),
      });

      console.log('✅ Backend stop response:', stopResponse);

      // Clean up
      this.mediaRecorder = null;
      this.currentRecordingId = null;

      return stopResponse;
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      throw error;
    }
  }

  // Download recording
  async downloadRecording(recordingId: string): Promise<void> {
    try {
      const downloadUrl = `${API_BASE_URL}/download/${recordingId}`;
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `recording_${recordingId}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download recording:', error);
      throw error;
    }
  }

  // Get list of recordings
  async getRecordings() {
    return this.makeRequest<{ recordings: any[] }>('/recordings');
  }

  // Process chat message - simulate AI response
  async processChatMessage(message: ChatMessage): Promise<ChatResponse> {
    // Simulate AI processing
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = [
          `I understand you're asking about: "${message.message}". Let me help you with that.`,
          `That's an interesting question about "${message.message}". Here's my perspective...`,
          `Regarding "${message.message}", I think we should consider...`,
          `Thank you for asking about "${message.message}". My analysis is...`
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        resolve({
          success: true,
          data: {
            response: randomResponse,
            timestamp: new Date().toISOString(),
            user_message: message.message,
            model: message.model || 'GPT-3.5'
          }
        });
      }, 500 + Math.random() * 1000); // Random delay 0.5-1.5s
    });
  }
}

export const backendService = new BackendService();

// React hook for using the backend service
export const useBackend = () => {
  const sendChatMessage = async (message: string, model: string = 'GPT-3.5') => {
    try {
      const result = await backendService.processChatMessage({
        message,
        model,
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      console.error('Failed to process chat message:', error);
      throw error;
    }
  };

  const startRecording = async (model: string) => {
    try {
      const result = await backendService.startRecording(model);
      return result;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  };

  const stopRecording = async () => {
    try {
      const result = await backendService.stopRecording();
      return result;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  };

  const downloadRecording = async (recordingId: string) => {
    try {
      await backendService.downloadRecording(recordingId);
    } catch (error) {
      console.error('Failed to download recording:', error);
      throw error;
    }
  };

  const getRecordings = async () => {
    try {
      const result = await backendService.getRecordings();
      return result;
    } catch (error) {
      console.error('Failed to get recordings:', error);
      throw error;
    }
  };

  return {
    sendChatMessage,
    startRecording,
    stopRecording,
    downloadRecording,
    getRecordings,
    healthCheck: backendService.healthCheck,
  };
};
