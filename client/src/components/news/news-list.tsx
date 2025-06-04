import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { type News } from '@shared/schema';

function formatDate(dateInput: Date | string | undefined) {
  if (!dateInput) return "Unknown date";
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NewsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/news'],
    queryFn: async () => {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('Failed to fetch news');
      return res.json();
    },
  });
  const news = data?.news || [];

  const getCategoryBadge = (category: string) => {
    const categoryLower = category.toLowerCase();
    switch (categoryLower) {
      case 'announcement':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{category}</Badge>;
      case 'training':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{category}</Badge>;
      case 'alert':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{category}</Badge>;
      case 'update':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">{category}</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">News</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-200">
          {[1,2,3].map(i => (
            <div key={i} className="p-6 animate-pulse">
              <Skeleton className="h-5 w-20 mb-2" />
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const axiosError = error as any;
    const errorMsg = axiosError?.response?.data?.error || axiosError?.data?.error || axiosError?.message || 'Please try again later.';
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">News</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading news: {errorMsg}</p>
        </CardContent>
      </Card>
    );
  }

  if (!news || news.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">News</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-gray-500">No news items available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">News</CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-gray-200">
        {news.map((item: any) => (
          <div key={item.id} className="p-6">
            {item.category && getCategoryBadge(item.category)}
            <h4 className="font-medium text-gray-900 mt-2">{item.title || 'Untitled'}</h4>
            <p className="text-sm text-gray-500 mt-1">{item.content || 'No content available'}</p>
            <div className="flex items-center mt-3 text-xs text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatDate(item.createdAt)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
