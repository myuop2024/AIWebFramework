import { useState } from "react";
import TopNavigation from "./top-navigation";
import Sidebar from "./sidebar";
import Footer from "./footer";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <TopNavigation toggleSidebar={toggleSidebar} />
        
        <main className="flex-1">
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}