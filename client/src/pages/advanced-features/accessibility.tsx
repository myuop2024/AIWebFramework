import AccessibilitySettingsComponent from '@/components/profile/accessibility-settings';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminAccessibilityPage() {
  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Accessibility (Admin)</CardTitle>
      </CardHeader>
      <CardContent>
        <AccessibilitySettingsComponent />
      </CardContent>
    </Card>
  );
} 