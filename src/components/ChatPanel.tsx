import { useState } from "react";
import { 
  Send, 
  RotateCcw, 
  Edit, 
  MoreHorizontal,
  Bot,
  ChevronDown 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const ChatPanel = () => {
  const [message, setMessage] = useState("The advantages of Artificial Intelligence");

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header with model selection */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button 
              variant="default" 
              size="sm" 
              className="bg-accent text-accent-foreground shadow-sm"
            >
              <Bot className="w-4 h-4 mr-2" />
              GPT-3.5
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground"
              disabled
            >
              GPT-4
            </Button>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="text-center mt-2">
          <span className="text-sm text-muted-foreground">No plugins enabled</span>
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* User message */}
          <div className="flex justify-end">
            <div className="bg-gradient-primary text-white px-4 py-2 rounded-2xl max-w-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">You</span>
              </div>
              <p>The advantages of Artificial Intelligence</p>
            </div>
          </div>

          {/* AI Response */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">The advantages of Artificial Intelligence</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="w-8 h-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="prose prose-sm max-w-none text-card-foreground">
                    <p className="mb-4">
                      Artificial Intelligence (AI) offers numerous advantages and has the potential to revolutionize various aspects of our lives. Here are some key advantages of AI:
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <strong>1. Automation:</strong> AI can automate repetitive and mundane tasks, saving time and effort for humans. It can handle large volumes of data, perform complex calculations, and execute tasks with precision and consistency. This automation leads to increased productivity and efficiency in various industries.
                      </div>
                      
                      <div>
                        <strong>2. Decision-making:</strong> AI systems can analyze vast amounts of data, identify patterns, and make informed decisions based on that analysis. This ability is particularly useful in complex scenarios where humans may struggle to process large datasets or where quick and accurate decisions are crucial.
                      </div>
                      
                      <div>
                        <strong>3. Improved accuracy:</strong> AI algorithms can achieve high levels of accuracy and precision in tasks such as image recognition, natural language processing, and data analysis. They can eliminate human errors caused by fatigue, distractions, or bias, leading to more reliable and consistent results.
                      </div>
                      
                      <div>
                        <strong>4. Continuous operation:</strong> AI systems can work tirelessly without the need for breaks, resulting in uninterrupted 24/7 operations. This capability is especially beneficial in applications like customer support chatbots, manufacturing processes, and surveillance systems.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="p-6 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerate response
            </Button>
          </div>

          {/* Message input */}
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="The advantages of Artificial Intelligence"
              className="min-h-[60px] pr-12 resize-none border-border"
            />
            <Button 
              size="icon" 
              variant="gradient"
              className="absolute bottom-2 right-2 w-8 h-8"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Footer text */}
          <p className="text-xs text-muted-foreground text-center">
            Free Research Preview. ChatGPT may produce inaccurate information about people, places, or facts. ChatGPT May 12 Version
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;