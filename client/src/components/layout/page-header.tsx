import { ReactNode } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  backButton?: {
    href: string;
    label?: string;
  };
  tabs?: Array<{
    label: string;
    href: string;
    active?: boolean;
  }>;
}

export default function PageHeader({
  title,
  description,
  actions,
  backButton,
  tabs,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {backButton && (
            <div className="mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-foreground pl-1"
                asChild
              >
                <Link href={backButton.href}>
                  <ArrowLeft className="h-4 w-4" />
                  {backButton.label || "Back"}
                </Link>
              </Button>
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {tabs && tabs.length > 0 && (
        <div className="flex border-b">
          {tabs.map((tab, index) => (
            <Link key={index} href={tab.href}>
              <a
                className={`inline-flex items-center gap-1 border-b-2 px-4 py-2 text-sm font-medium ${
                  tab.active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.href.startsWith("http") && (
                  <ExternalLink className="h-3 w-3" />
                )}
              </a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}