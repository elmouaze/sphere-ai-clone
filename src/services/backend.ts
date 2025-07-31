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
  transcription_enabled?: boolean;
  transcription?: string[];
  transcript_available?: boolean;
  openai_response?: {
    bedtime_story: string;
    call_summary: string;
    story_output_text: string;
    error?: string;
  };
  chat_message?: string;
}

export interface TranscriptionResponse {
  success: boolean;
  recording_id?: string;
  current_text?: string;
  full_transcription?: string[];
  last_update?: string;
  is_active?: boolean;
  error?: string;
}

class BackendService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentRecordingId: string | null = null;
  private transcriptionInterval: NodeJS.Timeout | null = null;
  private speechRecognition: any = null; // For Web Speech API
  private isListening: boolean = false;
  
  // Continuous recording system
  private audioQueue: Blob[] = []; // Thread-safe-like queue for audio chunks
  private processingInterval: NodeJS.Timeout | null = null;
  private accumulatedAudio: Blob[] = []; // Accumulates audio until phrase complete
  private lastProcessTime: number = 0;
  private phraseTimeout: number = 3000; // 3 seconds phrase timeout

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

  // Setup Web Speech API for speech detection
  private setupSpeechRecognition() {
    try {
      // Check if Web Speech API is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('⚠️ Web Speech API not available, using fallback chunking only');
        return false;
      }

      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';

      // When speech starts
      this.speechRecognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        this.isListening = true;
      };

      // When speech is detected/ends
        this.speechRecognition.onresult = (event) => {
          const results = Array.from(event.results);
          let finalTranscript = '';
          
          for (const result of results) {
            if ((result as SpeechRecognitionResult).isFinal) {
              finalTranscript += (result as SpeechRecognitionResult)[0].transcript;
            }
          }
          
          if (finalTranscript.trim()) {
            console.log('🎤 Final speech detected:', finalTranscript);
            // Speech detected - send accumulated audio
            this.sendAccumulatedAudio(finalTranscript);
          }
        };      // Handle speech recognition errors
      this.speechRecognition.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.warn('⚠️ Speech recognition not allowed, relying on fallback chunking');
        }
      };

      // When speech recognition ends, restart it
      this.speechRecognition.onend = () => {
        console.log('🔄 Speech recognition ended');
        if (this.isListening && this.currentRecordingId) {
          setTimeout(() => {
            try {
              if (this.speechRecognition && this.isListening) {
                this.speechRecognition.start();
                console.log('🔄 Speech recognition restarted');
              }
            } catch (error) {
              console.warn('⚠️ Failed to restart speech recognition:', error);
            }
          }, 100);
        }
      };

      // Start speech recognition
      this.speechRecognition.start();
      console.log('✅ Speech recognition setup complete');
      return true;

    } catch (error) {
      console.error('❌ Failed to setup speech recognition:', error);
      console.warn('⚠️ Falling back to time-based chunking');
      return false;
    }
  }

  // Send buffered audio when speech ends or timeout occurs
  private async sendAccumulatedAudio(trigger: string = 'timeout') {
    if (this.accumulatedAudio.length === 0 || !this.currentRecordingId) {
      console.log('⚪ No accumulated audio to send');
      return;
    }

    try {
      console.log(`📤 Sending accumulated audio chunks: ${this.accumulatedAudio.length} (trigger: ${trigger})`);
      
      // Combine all accumulated chunks into one blob
      const combinedBlob = new Blob(this.accumulatedAudio, { type: 'audio/webm' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        try {
          console.log('📤 Uploading accumulated audio to backend...', base64Data.length, 'chars');
          const response = await this.makeRequest('/recording/chunk', {
            method: 'POST',
            body: JSON.stringify({
              recording_id: this.currentRecordingId,
              audio_data: base64Data,
              detected_speech: trigger,
              chunk_count: this.accumulatedAudio.length
            }),
          });
          console.log('✅ Accumulated audio uploaded successfully:', response);
          
          // Clear the accumulated audio after successful upload
          this.accumulatedAudio = [];
          
        } catch (error) {
          console.error('❌ Failed to upload accumulated audio:', error);
        }
      };
      reader.readAsDataURL(combinedBlob);
      
    } catch (error) {
      console.error('❌ Error sending accumulated audio:', error);
    }
  }

  // Continuous audio processing loop (like the Python version)
  private startContinuousProcessing() {
    console.log('🔄 Starting continuous audio processing...');
    
    this.processingInterval = setInterval(async () => {
      try {
        const now = Date.now();
        
        // Check if we have audio chunks in the queue
        if (this.audioQueue.length > 0) {
          console.log(`📦 Processing ${this.audioQueue.length} queued audio chunks`);
          
          // Process all available chunks at once (like data_queue.queue)
          const allQueuedChunks = [...this.audioQueue];
          this.audioQueue = []; // Clear the queue
          
          // Add to accumulated audio
          this.accumulatedAudio.push(...allQueuedChunks);
          
          // Check if enough time has passed for phrase completion
          const timeSinceLastProcess = now - this.lastProcessTime;
          
          if (timeSinceLastProcess > this.phraseTimeout) {
            // Phrase timeout - send accumulated audio
            console.log(`⏰ Phrase timeout (${timeSinceLastProcess}ms), sending accumulated audio`);
            await this.sendAccumulatedAudio('phrase_timeout');
          }
          
          this.lastProcessTime = now;
        } else {
          // No audio in queue - check for phrase timeout
          const timeSinceLastProcess = now - this.lastProcessTime;
          if (this.accumulatedAudio.length > 0 && timeSinceLastProcess > this.phraseTimeout) {
            console.log(`⏰ Idle timeout (${timeSinceLastProcess}ms), sending accumulated audio`);
            await this.sendAccumulatedAudio('idle_timeout');
          }
        }
        
      } catch (error) {
        console.error('❌ Error in continuous processing:', error);
      }
    }, 250); // Process every 250ms (like the Python version's 0.25s sleep)
  }

  private stopContinuousProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('⏹️ Continuous processing stopped');
    }
  }

  // Real-time transcription methods
  private startTranscriptionPolling() {
    if (!this.currentRecordingId) return;
    
    console.log('📝 Starting transcription polling...');
    this.transcriptionInterval = setInterval(async () => {
      try {
        await this.getTranscription();
      } catch (error) {
        console.error('❌ Transcription polling error:', error);
      }
    }, 1000); // Poll every second
  }

  private stopTranscriptionPolling() {
    if (this.transcriptionInterval) {
      clearInterval(this.transcriptionInterval);
      this.transcriptionInterval = null;
      console.log('⏹️ Stopped transcription polling');
    }
  }

  async getTranscription(): Promise<TranscriptionResponse> {
    if (!this.currentRecordingId) {
      throw new Error('No active recording');
    }

    try {
      const response = await this.makeRequest<TranscriptionResponse>(
        `/transcription/${this.currentRecordingId}`
      );
      
      if (response.success && response.current_text) {
        console.log('📝 Current transcription:', response.current_text);
        
        // Dispatch custom event for real-time updates
        window.dispatchEvent(new CustomEvent('transcription-update', {
          detail: response
        }));
      }
      
      return response;
    } catch (error) {
      console.error('❌ Failed to get transcription:', error);
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
  async startRecording(model: string, enableTranscription: boolean = true): Promise<RecordingResponse> {
    try {
      console.log('🎤 Starting recording request...');
      
      // Start recording on backend first
      const startResponse = await this.makeRequest<RecordingResponse>('/recording/start', {
        method: 'POST',
        body: JSON.stringify({ 
          model, 
          enable_transcription: enableTranscription 
        }),
      });

      console.log('✅ Backend recording started:', startResponse);

      if (startResponse.success && startResponse.recording_id) {
        this.currentRecordingId = startResponse.recording_id;
        this.audioChunks = [];
        
        // Initialize continuous recording state
        this.audioQueue = [];
        this.accumulatedAudio = [];
        this.lastProcessTime = Date.now();

        // Start transcription polling if enabled
        if (enableTranscription && startResponse.transcription_enabled) {
          this.startTranscriptionPolling();
        }

        // Request microphone access
        console.log('🎤 Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000  // Add sample rate for better compatibility
          } 
        });

        console.log('✅ Microphone access granted');

        // Set up Web Speech API for speech detection
        this.setupSpeechRecognition();

        // Set up MediaRecorder for continuous audio capture
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm';
        
        console.log('🎵 Using MIME type:', mimeType);
        
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });

        // Set up continuous audio capture (smaller chunks for queue-based processing)
        this.mediaRecorder.ondataavailable = async (event) => {
          console.log('📦 Audio data available, size:', event.data.size);
          if (event.data.size > 0) {
            // Add to continuous queue (thread-safe equivalent)
            this.audioQueue.push(event.data);
            this.audioChunks.push(event.data); // Keep for final file
            console.log('📦 Added to queue, total queue chunks:', this.audioQueue.length);
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

        // Start recording with small chunks for continuous processing (250ms like Python)
        this.mediaRecorder.start(250);
        console.log('🎤 MediaRecorder started with 250ms chunks for continuous processing');
        
        // Start continuous processing loop (like Python thread)
        this.startContinuousProcessing();
        
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

      // Stop continuous processing first
      this.stopContinuousProcessing();

      // Stop speech recognition first
      if (this.speechRecognition) {
        this.isListening = false;
        try {
          this.speechRecognition.stop();
          console.log('⏹️ Speech recognition stopped');
        } catch (error) {
          console.log('⚠️ Speech recognition was already stopped');
        }
      }

      // Send any remaining accumulated audio
      if (this.accumulatedAudio.length > 0) {
        console.log('📤 Sending final accumulated audio...');
        await this.sendAccumulatedAudio('Final chunk');
      }

      // Stop transcription polling
      this.stopTranscriptionPolling();

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

      if (stopResponse.transcription && stopResponse.transcription.length > 0) {
        console.log('📝 Final transcription:', stopResponse.transcription);
      }

      // Clean up
      this.mediaRecorder = null;
      this.currentRecordingId = null;
      this.audioQueue = [];
      this.accumulatedAudio = [];
      this.speechRecognition = null;

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
      link.download = `recording_${recordingId}.mp3`;
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

  // Test OpenAI API integration
  async testOpenAI(prompt: string = 'Write a one-sentence bedtime story about Morocco.'): Promise<any> {
    try {
      const response = await this.makeRequest('/ai/test', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      console.log('🤖 OpenAI API test response:', response);
      return response;
    } catch (error) {
      console.error('❌ OpenAI API test failed:', error);
      throw error;
    }
  }

  // Get bedtime story from OpenAI
  async getBedtimeStory(location: string = 'Morocco'): Promise<any> {
    try {
      const response = await this.makeRequest(`/ai/bedtime-story?location=${encodeURIComponent(location)}`);
      console.log('🌙 Bedtime story response:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to get bedtime story:', error);
      throw error;
    }
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

  const startRecording = async (model: string, enableTranscription: boolean = true) => {
    try {
      const result = await backendService.startRecording(model, enableTranscription);
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

  const getTranscription = async () => {
    try {
      const result = await backendService.getTranscription();
      return result;
    } catch (error) {
      console.error('Failed to get transcription:', error);
      throw error;
    }
  };

  return {
    sendChatMessage,
    startRecording,
    stopRecording,
    downloadRecording,
    getRecordings,
    getTranscription,
    healthCheck: backendService.healthCheck,
  };
};
