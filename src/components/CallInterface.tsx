import { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CallInterfaceProps {
  onEndCall: () => void;
  currentModel: string;
}

const CallInterface = ({ onEndCall, currentModel }: CallInterfaceProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Here you would typically save the audio or send it to your backend
        console.log('Audio recorded:', audioUrl);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Animate audio levels
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setAudioLevel(average / 255 * 100);
          
          if (isRecording) {
            requestAnimationFrame(updateAudioLevel);
          }
        }
      };
      updateAudioLevel();

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const handleEndCall = () => {
    stopRecording();
    onEndCall();
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-bg-gradient">
      {/* Header */}
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-white" />
          <Badge variant="glass" className="text-white border-white/20">
            {currentModel}
          </Badge>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">AI Voice Call Active</h2>
        <p className="text-white/80 text-sm">{formatDuration(callDuration)}</p>
      </div>

      {/* Circle Visualization */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-80 h-80">
          {/* Animated flowing sphere */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg 
              width="320" 
              height="320" 
              viewBox="0 0 320 320" 
              className="animate-spin"
              style={{ 
                animationDuration: isRecording ? '20s' : '40s',
                animationDirection: 'normal'
              }}
            >
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#EC4899" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#F97316" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#F97316" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              
              {/* Flowing curves */}
              {[...Array(12)].map((_, i) => {
                const rotation = (i * 30);
                const scale = 1 + (audioLevel / 100) * 0.3;
                return (
                  <g key={i} transform={`rotate(${rotation} 160 160)`}>
                    <path
                      d={`M 160 40 Q ${120 + Math.sin(i) * 20} 80, 160 120 Q ${200 + Math.cos(i) * 20} 80, 160 40`}
                      fill="none"
                      stroke="url(#gradient1)"
                      strokeWidth="1.5"
                      opacity={0.6 + (audioLevel / 300)}
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: '160px 160px',
                        transition: 'transform 0.1s ease-out'
                      }}
                    />
                  </g>
                );
              })}
              
              {/* Inner flowing lines */}
              {[...Array(8)].map((_, i) => {
                const rotation = (i * 45) + 22.5;
                const scale = 1 + (audioLevel / 150) * 0.2;
                return (
                  <g key={`inner-${i}`} transform={`rotate(${rotation} 160 160)`}>
                    <path
                      d={`M 160 80 Q ${140 + Math.cos(i) * 15} 110, 160 140 Q ${180 + Math.sin(i) * 15} 110, 160 80`}
                      fill="none"
                      stroke="url(#gradient2)"
                      strokeWidth="1"
                      opacity={0.4 + (audioLevel / 400)}
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: '160px 160px',
                        transition: 'transform 0.15s ease-out'
                      }}
                    />
                  </g>
                );
              })}
            </svg>
            
            {/* Counter-rotating outer ring */}
            <svg 
              width="320" 
              height="320" 
              viewBox="0 0 320 320" 
              className="absolute animate-spin"
              style={{ 
                animationDuration: isRecording ? '30s' : '60s',
                animationDirection: 'reverse'
              }}
            >
              {[...Array(6)].map((_, i) => {
                const rotation = (i * 60);
                return (
                  <g key={`outer-${i}`} transform={`rotate(${rotation} 160 160)`}>
                    <path
                      d={`M 160 20 Q ${100 + Math.sin(i * 2) * 30} 100, 160 180 Q ${220 + Math.cos(i * 2) * 30} 100, 160 20`}
                      fill="none"
                      stroke="url(#gradient1)"
                      strokeWidth="0.5"
                      opacity={0.3 + (audioLevel / 500)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          
          {/* Center core */}
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20"
            style={{
              background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 70%, transparent 100%)`,
              boxShadow: '0 0 30px rgba(139, 92, 246, 0.3), inset 0 0 20px rgba(255,255,255,0.1)',
              transform: `translate(-50%, -50%) scale(${1 + audioLevel / 400})`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            <Bot className="w-10 h-10 text-white" />
          </div>

          {/* Floating energy particles */}
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45) * (Math.PI / 180);
            const radius = 140 + Math.sin(Date.now() / 1000 + i) * 20;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            return (
              <div
                key={`particle-${i}`}
                className="absolute w-1 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.6 + Math.sin(Date.now() / 500 + i * 0.5) * 0.4,
                  animationDelay: `${i * 0.2}s`
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6">
        <div className="flex items-center justify-center gap-6">
          {/* Microphone toggle */}
          <Button
            variant="glass"
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-16 h-16 rounded-full ${isRecording ? 'bg-red-500/20 border-red-400/50' : ''}`}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>

          {/* End call */}
          <Button
            variant="glass"
            size="lg"
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-500/20 border-red-400/50 hover:bg-red-500/30"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        {/* Status */}
        <div className="text-center mt-6">
          <p className="text-white/80 text-sm">
            {isRecording ? 'Recording...' : 'Tap mic to start recording'}
          </p>
          {audioLevel > 0 && (
            <div className="mt-2 flex justify-center">
              <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/60 transition-all duration-100"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallInterface;