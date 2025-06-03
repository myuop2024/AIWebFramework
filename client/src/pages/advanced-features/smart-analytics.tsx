import { SmartAnalytics } from '@/components/advanced/smart-analytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminSmartAnalyticsPage() {
  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Smart Analytics (Admin)</CardTitle>
      </CardHeader>
      <CardContent>
        <SmartAnalytics className="mt-4" />
      </CardContent>
    </Card>
  );
} 