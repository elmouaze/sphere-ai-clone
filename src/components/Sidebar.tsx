import {
  MessageSquare,
  FolderOpen,
  FileText,
  Users,
  Settings,
  LogIn,
  UserPlus,
  Crown,
  Plus,
  Edit,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Sidebar = () => {
  const navigationItems = [
    { icon: MessageSquare, label: "Chat UI", active: true },
    { icon: FolderOpen, label: "My Projects", pro: true },
    { icon: FileText, label: "Templates", pro: true },
  ];

  const otherPages = [
    { icon: FileText, label: "Prompt Page", pro: true },
    { icon: UserPlus, label: "Register" },
    { icon: LogIn, label: "Sign in" },
  ];

  const adminPages = [
    { icon: FileText, label: "All Templates", pro: true },
    { icon: Plus, label: "New Template" },
    { icon: Edit, label: "Edit Template" },
    { icon: BarChart3, label: "Users Overview" },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">SphereAI</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-6">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigationItems.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? "active" : "sidebar"}
              size="sidebar"
              className="relative"
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.pro && (
                <Badge variant="secondary" className="text-xs bg-gradient-primary text-white border-0">
                  PRO
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Other Pages */}
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Other Pages
          </h3>
          {otherPages.map((item, index) => (
            <Button
              key={index}
              variant="sidebar"
              size="sidebar"
              className="relative"
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.pro && (
                <Badge variant="secondary" className="text-xs bg-gradient-primary text-white border-0">
                  PRO
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Admin Pages */}
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Admin Pages
          </h3>
          {adminPages.map((item, index) => (
            <Button
              key={index}
              variant="sidebar"
              size="sidebar"
              className="relative"
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.pro && (
                <Badge variant="secondary" className="text-xs bg-gradient-primary text-white border-0">
                  PRO
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* PRO Promotion Card */}
        <div className="bg-gradient-primary rounded-xl p-4 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
              <Crown className="w-6 h-6" />
            </div>
            <h4 className="font-semibold mb-2">Go unlimited with PRO</h4>
            <p className="text-sm text-white/80 mb-4">
              Get your AI Project to another level and start doing more with Horizon AI Template PRO!
            </p>
            <Button variant="glass" size="sm" className="w-full">
              Get started with PRO
            </Button>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">AM</span>
          </div>
          <span className="text-sm font-medium text-sidebar-foreground">Ahmad Murrar</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
