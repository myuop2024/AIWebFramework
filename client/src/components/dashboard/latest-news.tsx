import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { type News } from '@shared/schema';

export default function LatestNews() {
  const { data: news, isLoading, error } = useQuery<News[]>({
    queryKey: ['/api/news/latest'],
    queryFn: async () => {
      // Fetch a limited number of news items for the dashboard
      const response = await fetch('/api/news/latest?limit=3'); 
      if (!response.ok) {
        throw new Error('Network response was not ok when fetching latest news');
      }
      return response.json();
    },
    // Optional: Add staleTime, e.g., staleTime: 10 * 60 * 1000 (10 minutes)
  });

  const formatDate = (dateInput: Date | string | undefined) => {
    if (!dateInput) return "Unknown date";
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get badge color based on category
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
          <CardTitle className="text-lg font-medium">Latest News</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-200">
          {[1, 2].map(i => (
            <div key={i} className="p-6 animate-pulse">
              <Skeleton className="h-5 w-20 mb-2" />
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <Skeleton className="h-4 w-32" />
        </CardFooter>
      </Card>
    );
  }

  if (error) {
    const axiosError = error as any;
    const errorMsg = axiosError?.response?.data?.error || axiosError?.data?.error || axiosError?.message || "Please try again later.";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Latest News</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading news: {errorMsg}</p>
        </CardContent>
      </Card>
    );
  }

  // No news items
  if (!news || news.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Latest News</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-gray-500">No news items available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-medium">Latest News</CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-gray-200">
        {Array.isArray(news) && news.length > 0 ? (
          news.map((item: News) => (
            <div key={item.id} className="p-6">
              {item.category && getCategoryBadge(item.category)}
              <h4 className="font-medium text-gray-900 mt-2">{item.title || "Untitled"}</h4>
              <p className="text-sm text-gray-500 mt-1">{item.content || "No content available"}</p>
              <div className="flex items-center mt-3 text-xs text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">No news items available.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <Link href="/news" className="text-sm font-medium text-primary hover:text-primary-dark">
          View all news
        </Link>
      </CardFooter>
    </Card>
  );
}
