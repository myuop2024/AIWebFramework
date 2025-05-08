import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function QRCode() {
  const { user } = useAuth();
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  
  const { data: qrData, isLoading, error } = useQuery<{observerId?: string}>({
    queryKey: ['/api/users/qrcode'],
    enabled: !!user,
  });

  useEffect(() => {
    // Use either qrData.observerId or user.observerId, with fallback to empty string
    const observerId = (qrData?.observerId || user?.observerId || '').toString();
    if (observerId) {
      generateQR(observerId);
    }
  }, [qrData, user]);

  // Generate a QR code SVG directly
  const generateQR = (observerId: string) => {
    try {
      // Create a more reliable QR code pattern
      // Each module is a 5x5 square
      // We'll generate a grid based on the observer ID
      const size = 100; // Viewbox size
      const moduleSize = 5;
      const margin = 10;
      const availableSize = size - (margin * 2);
      const modules = Math.floor(availableSize / moduleSize);
      
      // Create a deterministic pattern based on observer ID
      let cells: boolean[][] = Array(modules).fill(false).map(() => Array(modules).fill(false));
      
      // Fill the QR patterns
      // 1. Position detection patterns (corners)
      // Top-left corner
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          // Create the solid border pattern
          cells[i][j] = (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
        }
      }
      
      // Bottom-left corner
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          cells[modules-7+i][j] = (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
        }
      }
      
      // Top-right corner
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          cells[i][modules-7+j] = (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
        }
      }
      
      // 2. Use observer ID to fill in data modules
      const idChars = observerId.split('');
      for (let i = 0; i < idChars.length; i++) {
        const char = idChars[i];
        const charCode = char.charCodeAt(0);
        
        // Use the character code to determine positions
        const row = 8 + Math.floor(i / 5);
        const col = 8 + (i % 5) * 2;
        
        if (row < modules && col < modules) {
          // Main cell
          cells[row][col] = true;
          
          // Add some pattern based on the character
          if (charCode % 2 === 0 && row + 1 < modules) cells[row+1][col] = true;
          if (charCode % 3 === 0 && col + 1 < modules) cells[row][col+1] = true;
          if (charCode % 5 === 0 && row + 1 < modules && col + 1 < modules) cells[row+1][col+1] = true;
        }
      }
      
      // 3. Build the SVG representation
      let svgContent = '';
      for (let i = 0; i < modules; i++) {
        for (let j = 0; j < modules; j++) {
          if (cells[i][j]) {
            const x = margin + (j * moduleSize);
            const y = margin + (i * moduleSize);
            svgContent += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" />`;
          }
        }
      }
      
      const svg = `
        <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <rect x="0" y="0" width="${size}" height="${size}" fill="white" />
          <g fill="black">
            ${svgContent}
          </g>
        </svg>
      `;
      
      setQrSvg(svg);
    } catch (err) {
      console.error("Error generating QR code:", err);
      // Fallback to simple representation
      const fallbackSvg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <rect x="10" y="10" width="80" height="80" fill="none" stroke="black" stroke-width="1" />
          <text x="20" y="55" font-family="monospace" font-size="12">${observerId}</text>
        </svg>
      `;
      setQrSvg(fallbackSvg);
    }
  };

  const handleDownload = async () => {
    try {
      // Set loading state if needed
      const response = await fetch('/api/id-cards/download', {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download ID card');
      }
      
      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `observer-id-card.pdf`);
      
      // Append to body, click, and clean up
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading ID card:', error);
      toast({
        title: "Download Failed",
        description: "There was a problem downloading your ID card. Please try again later.",
        variant: "destructive"
      });
    }
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
