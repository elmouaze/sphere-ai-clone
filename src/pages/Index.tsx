import Sidebar from "@/components/Sidebar";
import TopNavigation from "@/components/TopNavigation";
import MainInterface from "@/components/MainInterface";

const Index = () => {
  return (
    <div className="min-h-screen bg-bg-gradient flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <TopNavigation />
        <MainInterface />
      </div>
    </div>
  );
};

export default Index;
