import GamificationDashboard from '@/components/gamification/GamificationDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminGamificationPage() {
  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Gamification (Admin)</CardTitle>
      </CardHeader>
      <CardContent>
        <GamificationDashboard />
      </CardContent>
    </Card>
  );
} 