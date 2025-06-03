
import React from 'react';
import { cn } from '@/lib/utils';

interface IOSSafeAreaProps {
  children: React.ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

export function IOSSafeArea({ 
  children, 
  className, 
  top = true, 
  bottom = true, 
  left = true, 
  right = true 
}: IOSSafeAreaProps) {
  return (
    <div 
      className={cn(
        "w-full h-full",
        top && "pt-safe-top",
        bottom && "pb-safe-bottom", 
        left && "pl-safe-left",
        right && "pr-safe-right",
        className
      )}
      style={{
        paddingTop: top ? 'env(safe-area-inset-top)' : undefined,
        paddingBottom: bottom ? 'env(safe-area-inset-bottom)' : undefined,
        paddingLeft: left ? 'env(safe-area-inset-left)' : undefined,
        paddingRight: right ? 'env(safe-area-inset-right)' : undefined,
      }}
    >
      {children}
    </div>
  );
}
