import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import TopNavigation from "./top-navigation";
import Footer from "./footer";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen relative bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Top Navigation */}
        <TopNavigation toggleSidebar={toggleSidebar} />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
