import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./sidebar";
import TopNavigation from "./top-navigation";
import Footer from "./footer";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  // Close sidebar on window resize if it becomes desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <TopNavigation toggleSidebar={toggleSidebar} />

        {/* Main Content */}
        <main 
          className={cn(
            "flex-1 overflow-auto",
            "transition-all duration-300 ease-in-out",
            "bg-gradient-to-br from-background/50 via-background/80 to-muted/20",
            "backdrop-blur-sm"
          )}
        >
          <div className="min-h-full relative">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}