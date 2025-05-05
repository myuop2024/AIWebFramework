import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map of assignment status to tailwind class names for styling
export const assignmentStatusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  missed: 'bg-yellow-100 text-yellow-800'
}

// Generate a consistent avatar color based on a string (like a user's name)
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 95%)`;
}

// Format a date in a consistent way
export function formatDateRange(startDate: Date, endDate: Date): string {
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: startDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  };
  
  if (sameDay) {
    return `${startDate.toLocaleDateString('en-US', options)} ${formatTime(startDate)} - ${formatTime(endDate)}`;
  } else {
    return `${startDate.toLocaleDateString('en-US', options)} ${formatTime(startDate)} - ${endDate.toLocaleDateString('en-US', options)} ${formatTime(endDate)}`;
  }
}

// Format a time consistently
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}
