import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { type Faq } from '@shared/schema';

// Group FAQs by category
const groupByCategory = (faqs: Faq[]) => {
  const grouped = faqs.reduce((acc, faq) => {
    const category = faq.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {});

  return Object.entries(grouped).map(([category, items]) => ({
    category,
    items,
  }));
};

export default function FaqList() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch FAQs
  const { data: faqs, isLoading, error } = useQuery({
    queryKey: ['/api/faqs'],
  });

  // Filter FAQs based on search query
  const filteredFaqs = searchQuery.trim() === "" 
    ? faqs 
    : faqs?.filter((faq: Faq) => {
        const query = searchQuery.toLowerCase();
        return (
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query) ||
          faq.category.toLowerCase().includes(query)
        );
      });

  // Group filtered FAQs by category
  const groupedFaqs = filteredFaqs ? groupByCategory(filteredFaqs) : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          <div className="relative mt-4">
            <Skeleton className="h-10 w-full" />
          </div>
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((category) => (
            <div key={category} className="mb-8">
              <Skeleton className="h-6 w-32 mb-4" />
              {[1, 2, 3].map((item) => (
                <div key={item} className="mb-4">
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading FAQs. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-5 w-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search FAQ"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {groupedFaqs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-500">
              {searchQuery.trim() === "" 
                ? "No FAQs available."
                : `No results found for "${searchQuery}".`
              }
            </p>
          </div>
        ) : (
          groupedFaqs.map(({ category, items }) => (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-medium mb-4">{category}</h3>
              <Accordion type="single" collapsible className="space-y-4">
                {items.map((faq: Faq) => (
                  <AccordionItem key={faq.id} value={faq.id.toString()} className="border rounded-md">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <span className="text-left font-medium">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-1 text-gray-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
