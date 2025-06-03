import { AIAssistant } from '@/components/advanced/ai-assistant';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminAIAssistantPage() {
  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>AI Assistant (Admin)</CardTitle>
      </CardHeader>
      <CardContent>
        <AIAssistant context="admin" />
      </CardContent>
    </Card>
  );
} 