import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function QRCode() {
  const { user } = useAuth();
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  
  const { data: qrData, isLoading, error } = useQuery({
    queryKey: ['/api/users/qrcode'],
    enabled: !!user,
  });

  useEffect(() => {
    if (qrData?.observerId) {
      // In a real application, this would use a QR code generation library
      // Here we're using a simple SVG placeholder based on observer ID
      generatePlaceholderQR(qrData.observerId);
    }
  }, [qrData]);

  // This is a placeholder function - in production, use a proper QR library
  const generatePlaceholderQR = (observerId: string) => {
    // Create a deterministic pattern based on observer ID
    const svg = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect x="10" y="10" width="80" height="80" fill="none" stroke="black" stroke-width="1" />
        <g fill="black">
          <rect x="15" y="15" width="5" height="5" />
          <rect x="20" y="15" width="5" height="5" />
          <rect x="25" y="15" width="5" height="5" />
          <rect x="35" y="15" width="5" height="5" />
          <rect x="45" y="15" width="5" height="5" />
          ${observerId.split('').map((digit, index) => {
            const x = 15 + ((index * 7) % 60);
            const y = 15 + Math.floor((index * 7) / 60) * 7;
            return `<rect x="${x}" y="${y}" width="5" height="5" />`;
          }).join('')}
        </g>
      </svg>
    `;
    setQrSvg(svg);
  };

  const handleDownload = () => {
    // In a real application, this would create and download a PDF ID card
    alert("ID Card download would be implemented here");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Your Observer ID</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col items-center">
          <Skeleton className="w-48 h-48 mb-4" />
          <div className="text-center">
            <Skeleton className="h-4 w-32 mx-auto mb-2" />
            <Skeleton className="h-8 w-24 mx-auto mb-2" />
            <Skeleton className="h-3 w-48 mx-auto mb-4" />
          </div>
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Your Observer ID</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-red-500 mb-4">Error loading QR code. Please try again later.</p>
          <p className="text-3xl font-bold tracking-wide text-gray-800">
            {user?.observerId || 'Unknown'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-medium">Your Observer ID</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex flex-col items-center">
        <div className="w-48 h-48 bg-gray-100 flex items-center justify-center border border-gray-200 rounded-md mb-4">
          {qrSvg ? (
            <div 
              className="w-40 h-40 bg-white p-2"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="text-gray-400 text-sm text-center">
              QR code will appear here
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Your Observer ID</p>
          <p className="text-3xl font-bold tracking-wide text-gray-800">
            {user?.observerId || qrData?.observerId || 'Unknown'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Use this ID to identify yourself to election officials
          </p>
        </div>
        <Button 
          className="mt-4"
          onClick={handleDownload}
        >
          Download ID Card
        </Button>
      </CardContent>
    </Card>
  );
}
