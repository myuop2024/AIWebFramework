import { Card } from "@/components/ui/card";

export function CommunicationCenterFixed() {
  return (
    <Card className="h-full border-none shadow-none">
      <div className="p-4">
        <p>Communication Center (Temporarily Disabled)</p>
      </div>
    </Card>
  );
}

// Export alias for backward compatibility
export const CommunicationCenter = CommunicationCenterFixed;