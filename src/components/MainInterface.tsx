import { useState, useEffect, useRef } from "react";
import { 
  Send, 
  RotateCcw, 
  Edit, 
  MoreHorizontal,
  Bot,
  ChevronDown,
  Phone,
  Mic, 
  MicOff, 
  PhoneOff,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Orb from "./Orb";
import { useBackend } from "@/services/backend";

const MainInterface = () => {
  // Chat state
  const [message, setMessage] = useState("The advantages of Artificial Intelligence");
  const [chatMessages, setChatMessages] = useState<Array<{id: number, text: string, isUser: boolean, timestamp: string}>>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Call state
  const [isInCall, setIsInCall] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  
  // Backend state
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [currentModel, setCurrentModel] = useState("GPT-3.5");
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [recordingInfo, setRecordingInfo] = useState<{filename?: string, duration?: number, download_url?: string} | null>(null);
  
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { sendChatMessage, startRecording, stopRecording, downloadRecording, healthCheck } = useBackend();

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck();
        setBackendStatus('connected');
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus('error');
      }
    };
    checkBackend();
  }, []);

  // Call duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isInCall) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }
    };
  }, [isInCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: message,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsTyping(true);

    try {
      const response = await sendChatMessage(message, currentModel);
      
      if (response.success && response.data) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.data.response,
          isUser: false,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I couldn't process your message right now. Please try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleStartCall = () => {
    setIsInCall(true);
    setCallDuration(0);
    // Clear any previous recording info when starting a new call
    setRecordingInfo(null);
    setCurrentRecordingId(null);
  };

  const handleClearRecording = () => {
    setRecordingInfo(null);
    setCurrentRecordingId(null);
    
    const clearMessage = {
      id: Date.now(),
      text: `🗑️ Recording cleared from interface.`,
      isUser: false,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, clearMessage]);
  };

  const handleEndCall = async () => {
    let finalRecordingInfo = recordingInfo;
    
    // Stop recording if active
    if (isRecording) {
      try {
        const result = await stopRecording();
        if (result.success) {
          finalRecordingInfo = {
            filename: result.filename,
            duration: result.duration,
            download_url: result.download_url
          };
          setRecordingInfo(finalRecordingInfo);
          setCurrentRecordingId(result.recording_id || null);
          console.log('Recording automatically saved on call end:', result);
        }
      } catch (error) {
        console.error('Failed to stop recording on call end:', error);
      }
    }
    
    // End the call but keep recording info available
    setIsInCall(false);
    setIsRecording(false);
    setAudioLevel(0);
    setCallDuration(0);
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
      simulationTimeoutRef.current = null;
    }
    
    // Show download notification if we have a recording
    if (finalRecordingInfo) {
      // Add a message to chat about recording availability
      const recordingMessage = {
        id: Date.now(),
        text: `📁 Call recording is ready! Duration: ${Math.round(finalRecordingInfo.duration || 0)}s. Click the download button below to save your recording.`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, recordingMessage]);
    }
  };

  const handleDownloadRecording = async () => {
    if (currentRecordingId) {
      try {
        await downloadRecording(currentRecordingId);
        
        // Show success message in chat
        const downloadMessage = {
          id: Date.now(),
          text: `✅ Recording downloaded successfully! The audio file has been saved to your downloads folder.`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatMessages(prev => [...prev, downloadMessage]);
        
        // Optional: Clear recording info after download
        // setRecordingInfo(null);
        // setCurrentRecordingId(null);
        
      } catch (error) {
        console.error('Failed to download recording:', error);
        
        // Show error message in chat
        const errorMessage = {
          id: Date.now(),
          text: `❌ Failed to download recording. Please try again or check if the backend is running.`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  const handleMicClick = async () => {
    console.log('🎤 Mic button clicked, isRecording:', isRecording);
    
    if (isRecording) {
      // Stop recording
      console.log('⏹️ Stopping recording...');
      setIsRecording(false);
      setAudioLevel(0);
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
        simulationTimeoutRef.current = null;
      }
      
      try {
        const result = await stopRecording();
        console.log('✅ Recording stopped successfully:', result);
        
        if (result.success) {
          setRecordingInfo({
            filename: result.filename,
            duration: result.duration,
            download_url: result.download_url
          });
          setCurrentRecordingId(result.recording_id || null);
          
          // Show success message in chat
          const successMessage = {
            id: Date.now(),
            text: `🎤 Recording completed! Duration: ${Math.round(result.duration || 0)}s`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString()
          };
          setChatMessages(prev => [...prev, successMessage]);
        }
      } catch (error) {
        console.error('❌ Failed to stop recording:', error);
        const errorMessage = {
          id: Date.now(),
          text: `❌ Failed to stop recording: ${error.message}`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } else {
      // Start recording
      console.log('▶️ Starting recording...');
      setIsRecording(true);
      setRecordingInfo(null);
      
      try {
        const result = await startRecording(currentModel);
        console.log('✅ Recording started successfully:', result);
        
        if (result.success) {
          setCurrentRecordingId(result.recording_id || null);
          
          // Show success message in chat
          const startMessage = {
            id: Date.now(),
            text: `🎤 Recording started! Speak into your microphone.`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString()
          };
          setChatMessages(prev => [...prev, startMessage]);
        }
      } catch (error) {
        console.error('❌ Failed to start recording:', error);
        setIsRecording(false);
        
        const errorMessage = {
          id: Date.now(),
          text: `❌ Failed to start recording: ${error.message}. Make sure to allow microphone access.`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
      
      // Simulate audio levels for visual effect
      const simulateAudio = () => {
        const level = Math.random() * 50 + 10;
        setAudioLevel(level);
        simulationTimeoutRef.current = setTimeout(simulateAudio, 100);
      };
      simulateAudio();
    }
  };

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isInCall) {
    // Call Interface View - REMOVED, we'll keep the same UI
  }

  // Chat Interface View - Always show this, but add call indicators when in call
  return (
    <div className="flex-1 flex flex-col h-screen relative">
      {/* Call Orb Overlay - Only show when in call */}
      {isInCall && (
        <div className="absolute top-6 right-6 z-10">
          <div className="relative">
            {/* Orb */}
            <div className="w-24 h-24">
              <Orb 
                hoverIntensity={isRecording ? audioLevel / 100 : 0.2}
                forceHoverState={isRecording}
                rotateOnHover={true}
                hue={isRecording ? 180 : 270}
              />
            </div>
            
            {/* Call controls overlay */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMicClick}
                className={`w-8 h-8 rounded-full p-0 ${isRecording ? 'bg-red-500/20 border border-red-400/50' : 'bg-black/20 border border-white/20'}`}
              >
                {isRecording ? (
                  <MicOff className="w-3 h-3 text-white" />
                ) : (
                  <Mic className="w-3 h-3 text-white" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEndCall}
                className="w-8 h-8 rounded-full p-0 bg-red-500/20 border border-red-400/50"
              >
                <PhoneOff className="w-3 h-3 text-white" />
              </Button>
            </div>
            
            {/* Call duration */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <Badge variant="glass" className="text-xs text-white border-white/20">
                {formatDuration(callDuration)}
              </Badge>
            </div>
            
            {/* Audio level indicator */}
            {audioLevel > 0 && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white/60 transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header with model selection */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button 
              variant={currentModel === "GPT-3.5" ? "default" : "ghost"}
              size="sm" 
              className={currentModel === "GPT-3.5" ? "bg-accent text-accent-foreground shadow-sm" : ""}
              onClick={() => handleModelChange("GPT-3.5")}
            >
              <Bot className="w-4 h-4 mr-2" />
              GPT-3.5
            </Button>
            <Button 
              variant={currentModel === "GPT-4" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleModelChange("GPT-4")}
            >
              <Bot className="w-4 h-4 mr-2" />
              GPT-4
            </Button>
            <Button 
              variant={currentModel === "Claude" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleModelChange("Claude")}
            >
              <Bot className="w-4 h-4 mr-2" />
              Claude
            </Button>
          </div>
          
          {/* Backend Status */}
          <Badge 
            variant="outline" 
            className={`text-xs ${
              backendStatus === 'connected' 
                ? 'text-green-600 border-green-300' 
                : backendStatus === 'error'
                ? 'text-red-600 border-red-300'
                : 'text-yellow-600 border-yellow-300'
            }`}
          >
            {backendStatus === 'connected' ? '● Connected' : 
             backendStatus === 'error' ? '● Error' : 
             '● Connecting...'}
          </Badge>
          
          {/* Call Status Badge */}
          {isInCall && (
            <Badge 
              variant="outline" 
              className="text-xs text-blue-600 border-blue-300 animate-pulse"
            >
              🔊 Voice Call Active
            </Badge>
          )}
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Start a conversation with AI or begin a voice call</p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                msg.isUser 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                <p className="text-sm">{msg.text}</p>
                <span className="text-xs opacity-70 mt-1 block">{msg.timestamp}</span>
              </div>
            </div>
          ))
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-6 border-t border-border">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[50px] max-h-[150px] resize-none"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            {/* Send message button */}
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim() || isTyping}
              className="h-[50px] px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
            
            {/* Start/End call button */}
            {isInCall ? (
              <Button 
                onClick={handleEndCall}
                variant="outline"
                className="h-[50px] px-4 border-red-300 text-red-600 hover:bg-red-50"
              >
                <PhoneOff className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleStartCall}
                variant="outline"
                className="h-[50px] px-4"
              >
                <Phone className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Recording download section - Show prominently when available */}
        {recordingInfo && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  🎤
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Recording Ready!</h4>
                  <p className="text-sm text-blue-700">
                    {recordingInfo.filename} • Duration: {Math.round(recordingInfo.duration || 0)}s
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleDownloadRecording}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Audio
                </Button>
                <Button 
                  onClick={handleClearRecording}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <Button variant="ghost" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MainInterface;
