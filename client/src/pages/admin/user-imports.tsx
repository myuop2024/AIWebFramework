import React, { useState } from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { UserImport } from "@/components/admin/user-import";
import UserImportCSV from "@/components/admin/user-import-csv";
import { UsersIcon, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserImportsPage() {
  const [activeTab, setActiveTab] = useState<string>("standard");

  return (
    <AdminLayout title="User Imports">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <UsersIcon className="mr-2 h-8 w-8" />
          User Imports
        </h1>
        <p className="text-muted-foreground">
          Import multiple users at once via CSV files
        </p>
      </div>

      <Tabs defaultValue="standard" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard Import</TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center">
            <Sparkles className="h-4 w-4 mr-2" />
            AI-Enhanced Import
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard" className="pt-4">
          <UserImport />
        </TabsContent>
        
        <TabsContent value="ai" className="pt-4">
          <UserImportCSV />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}