import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import AdminLayout from '@/components/layout/admin-layout';

export default function AnalyticsPage() {
  return (
    <AdminLayout title="Analytics Dashboard">
      <AnalyticsDashboard />
    </AdminLayout>
  );
}