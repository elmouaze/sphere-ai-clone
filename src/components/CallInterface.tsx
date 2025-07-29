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
        <div className="relative">
          {/* Main circle */}
          <div 
            className="w-64 h-64 rounded-full border-2 border-white/30 flex items-center justify-center relative overflow-hidden"
            style={{
              background: `radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, transparent 70%)`,
              boxShadow: '0 0 60px rgba(255,255,255,0.1), inset 0 0 60px rgba(255,255,255,0.05)'
            }}
          >
            {/* Animated rings based on audio level */}
            <div 
              className="absolute inset-0 rounded-full border border-white/20 animate-pulse"
              style={{
                transform: `scale(${1 + audioLevel / 200})`,
                transition: 'transform 0.1s ease-out'
              }}
            />
            <div 
              className="absolute inset-4 rounded-full border border-white/15 animate-pulse"
              style={{
                transform: `scale(${1 + audioLevel / 300})`,
                transition: 'transform 0.15s ease-out',
                animationDelay: '0.1s'
              }}
            />
            <div 
              className="absolute inset-8 rounded-full border border-white/10 animate-pulse"
              style={{
                transform: `scale(${1 + audioLevel / 400})`,
                transition: 'transform 0.2s ease-out',
                animationDelay: '0.2s'
              }}
            />
            
            {/* Center bot icon */}
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/40 rounded-full animate-pulse"
              style={{
                top: `${Math.sin((i * Math.PI) / 3) * 160 + 50}%`,
                left: `${Math.cos((i * Math.PI) / 3) * 160 + 50}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '2s'
              }}
            />
          ))}
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