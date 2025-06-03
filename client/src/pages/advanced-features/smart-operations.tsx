import SmartOperationsDashboard from '@/components/smart-operations/SmartOperationsDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminSmartOperationsPage() {
  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Smart Operations (Admin)</CardTitle>
      </CardHeader>
      <CardContent>
        <SmartOperationsDashboard />
      </CardContent>
    </Card>
  );
} 