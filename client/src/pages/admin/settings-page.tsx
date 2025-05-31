// client/src/pages/admin/settings-page.tsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AdminModal } from "@/components/admin/admin-modal";
import { SystemLogsPanel } from "@/components/admin/system-logs-panel";
import { Database, Server } from "lucide-react"; // Icons for cards

export default function SettingsPage() {
  const { toast } = useToast();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode | string>('');
  const [modalTitle, setModalTitle] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState(""); // Added search term state

  // Mock system stats for display - in a real app, this would come from a query
  const systemStats = {
    databaseUsage: "68%",
    mediaStorageUsage: "42%",
    systemMemoryUsage: "54%",
    systemUptime: "99.8%",
    activeSessions: 87,
    apiRequestsLast24h: 14382,
    lastBackup: "4 hours ago",
  };


  const openModal = (title: string, content: React.ReactNode | string) => {
    setModalTitle(title);
    setModalContent(content);
    setIsModalOpen(true);
  };

  const handleSaveSettings = (section: string) => {
    setIsActionLoading(true);
    setTimeout(() => {
      setIsActionLoading(false);
      toast({
        title: "Settings Updated",
        description: `${section} settings have been saved successfully.`,
      });
    }, 800);
  };

  const handleToggleMaintenance = () => {
    setIsActionLoading(true);
    setTimeout(() => {
      setIsActionLoading(false);
      toast({
        title: "Maintenance Mode Toggled",
        description: "System maintenance mode has been updated.",
      });
    }, 800);
  };

  const handleRunBackup = () => {
    setIsActionLoading(true);
    setTimeout(() => {
      setIsActionLoading(false);
      toast({
        title: "Backup Initiated",
        description: "System backup process has started.",
      });
    }, 800);
  };

  const handleViewLogs = () => {
    openModal("System Logs", <SystemLogsPanel />);
  };

  useEffect(() => {
    const settingsElements = document.querySelectorAll('[data-searchable-setting="true"]');
    let parentCardVisible = false; // To track if any child of System Configuration is visible

    settingsElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      const textContent = htmlElement.textContent?.toLowerCase() || "";
      const matches = textContent.includes(searchTerm);

      if (htmlElement.dataset.settingParent === "system-configuration-card") {
         // This is the System Configuration Card itself
        if (searchTerm === "") {
          htmlElement.style.display = "";
        } else {
          // Visibility will be determined by its children or its own content match
           if (matches && htmlElement.querySelectorAll('[data-searchable-setting="true"][style*="display: none;"]').length === htmlElement.querySelectorAll('[data-searchable-setting="true"]').length -1 && htmlElement.querySelectorAll('[data-searchable-setting="true"]').length > 1) {
             // only card title matches, but all children are hidden
           } else if(matches && htmlElement.dataset.isCard && !parentCardVisible){
             // If card itself matches and no children made it visible yet
           }
           // Actual visibility set after checking children
        }
      } else if (htmlElement.parentElement?.dataset.searchableSetting === "true" && htmlElement.parentElement?.dataset.settingParent === "system-configuration-card") {
        // This is a child setting of System Configuration card
        if (searchTerm === "") {
          htmlElement.style.display = "";
          parentCardVisible = true; // Mark parent as potentially visible
        } else {
          if (matches) {
            htmlElement.style.display = "";
            parentCardVisible = true; // Mark parent as visible
          } else {
            htmlElement.style.display = "none";
          }
        }
      } else { // For other cards like System Status
         if (searchTerm === "") {
            htmlElement.style.display = "";
          } else {
            htmlElement.style.display = matches ? "" : "none";
          }
      }
    });

    // Final check for the System Configuration Card based on children visibility
    const systemConfigCard = document.querySelector('[data-setting-parent="system-configuration-card"]') as HTMLElement | null;
    if(systemConfigCard) {
        if (searchTerm !== "" && !parentCardVisible) {
             // Also check if card title/desc itself matches
            const cardTextContent = systemConfigCard.querySelector('.lucid-react-database')?.parentElement?.textContent?.toLowerCase() || systemConfigCard.querySelector('p.text-muted-foreground')?.textContent?.toLowerCase() || "";
            if (!cardTextContent.includes(searchTerm)) {
                 systemConfigCard.style.display = "none";
            } else {
                systemConfigCard.style.display = ""; // Card title matches
            }
        } else {
            systemConfigCard.style.display = "";
        }
    }

  }, [searchTerm]);

  return (
    <AdminLayout title="Settings">
      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search settings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          className="max-w-sm"
        />
      </div>
      <div className="space-y-8">
        <Card data-searchable-setting="true" data-setting-parent="system-configuration-card" data-is-card="true">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              System Configuration
            </CardTitle>
            <CardDescription>Configure system-wide settings and operational parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-searchable-setting="true">
              <div className="space-y-2" data-searchable-setting="true">
                <Label htmlFor="system-name">System Name</Label>
                <Input id="system-name" defaultValue="CAFFE - Election Observer System" />
              </div>
              <div className="space-y-2" data-searchable-setting="true">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Input id="timezone" defaultValue="UTC-05:00 Eastern Time" />
              </div>
            </div>
            <div className="space-y-4 pt-2 border-t mt-6">
              <div className="flex items-center justify-between pt-4" data-searchable-setting="true">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-mode" className="text-base font-medium">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Temporarily disable user access for system maintenance.</p>
                </div>
                <Switch id="maintenance-mode" onCheckedChange={handleToggleMaintenance} />
              </div>
              <div className="flex items-center justify-between pt-4 border-t" data-searchable-setting="true">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor" className="text-base font-medium">Require Two-Factor Auth</Label>
                  <p className="text-sm text-muted-foreground">Enhance security for admin accounts by requiring 2FA.</p>
                </div>
                <Switch id="two-factor" defaultChecked /> {/* Add handler if needed */}
              </div>
              <div className="flex items-center justify-between pt-4 border-t" data-searchable-setting="true">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-logout" className="text-base font-medium">Auto Logout (Inactivity)</Label>
                  <p className="text-sm text-muted-foreground">Automatically log out users after 30 minutes of inactivity.</p>
                </div>
                <Switch id="auto-logout" defaultChecked /> {/* Add handler if needed */}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveSettings("System Configuration")} disabled={isActionLoading}>
              {isActionLoading ? "Saving..." : "Save System Configuration"}
            </Button>
          </CardFooter>
        </Card>

        <Card data-searchable-setting="true" data-is-card="true">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
               System Status & Actions
            </CardTitle>
            <CardDescription>View system health, statistics, and perform critical system actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                <div><Label className="text-sm font-medium text-muted-foreground">Database Storage</Label><p className="text-lg font-semibold">{systemStats.databaseUsage}</p></div>
                <div><Label className="text-sm font-medium text-muted-foreground">Media Storage</Label><p className="text-lg font-semibold">{systemStats.mediaStorageUsage}</p></div>
                <div><Label className="text-sm font-medium text-muted-foreground">Memory Usage</Label><p className="text-lg font-semibold">{systemStats.systemMemoryUsage}</p></div>
                <div><Label className="text-sm font-medium text-muted-foreground">System Uptime</Label><p className="text-lg font-semibold">{systemStats.systemUptime}</p></div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div><Label className="text-sm font-medium text-muted-foreground">Active Sessions</Label><p className="text-lg font-semibold">{systemStats.activeSessions}</p></div>
                <div><Label className="text-sm font-medium text-muted-foreground">API Requests (24h)</Label><p className="text-lg font-semibold">{systemStats.apiRequestsLast24h.toLocaleString()}</p></div>
                <div><Label className="text-sm font-medium text-muted-foreground">Last Backup</Label><p className="text-lg font-semibold">{systemStats.lastBackup}</p></div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2"> {/* Use flex-wrap for better responsiveness */}
            <Button variant="outline" onClick={handleRunBackup} disabled={isActionLoading}>
              {isActionLoading ? "Processing..." : "Run Backup"}
            </Button>
            <Button onClick={handleViewLogs} disabled={isActionLoading}>
              {isActionLoading ? "Loading..." : "View System Logs"}
            </Button>
          </CardFooter>
        </Card>
      </div>
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        content={modalContent}
        isLarge={true} // Make modal larger for logs
      />
    </AdminLayout>
  );
}
