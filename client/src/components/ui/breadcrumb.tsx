import * as React from "react"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

export function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {showHome && (
          <>
            <li>
              <a
                href="/"
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
              </a>
            </li>
            {items.length > 0 && (
              <li>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </li>
            )}
          </>
        )}
        
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <li>
              {item.current ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {item.label}
                </a>
              )}
            </li>
            {index < items.length - 1 && (
              <li>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb
