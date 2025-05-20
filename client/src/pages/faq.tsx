import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

import FaqList from "@/components/faq/faq-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, MessageSquare } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function Faq() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  return (
    <AuthGuard>
      <div className="container mx-auto py-6 space-y-6">
        {/* FAQs */}
        <FaqList />
        
        {/* Help & Support Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
            <CardDescription>
              Our support team is ready to assist you with any questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 border rounded-md p-6 text-center">
                <HelpCircle className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Contact Support</h3>
                <p className="text-gray-600 mb-4">
                  Get in touch with our support team for technical assistance or questions about your observer duties.
                </p>
                <div className="text-sm text-gray-500 mb-4">
                  <p>Email: support@caffe.org</p>
                  <p>Phone: (876) 555-0123</p>
                  <p>Hours: 8:00 AM - 8:00 PM EST</p>
                </div>
                <Button variant="outline">Send Email</Button>
              </div>
              
              <div className="flex-1 border rounded-md p-6 text-center">
                <MessageSquare className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Live Chat Support</h3>
                <p className="text-gray-600 mb-4">
                  Connect with a support agent instantly through our live chat service.
                </p>
                <Button onClick={() => navigate("/chat")}>
                  Start Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
