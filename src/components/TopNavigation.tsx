import { Search, Bell, Moon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TopNavigation = () => {
  return (
    <div className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      <div className="flex-1"></div>
      
      {/* Right side controls */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-10 w-64 bg-muted/50 border-0"
          />
        </div>
        
        {/* Notification */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
        </Button>
        
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Moon className="w-5 h-5" />
        </Button>
        
        {/* User avatar */}
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-gradient-primary text-white">
          <User className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default TopNavigation;