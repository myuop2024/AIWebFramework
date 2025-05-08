// Utility functions for the application
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format file size to human readable format
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Assignment status color mapping for the UI
 */
export const assignmentStatusColors = {
  'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'active': 'bg-green-100 text-green-800 border-green-300',
  'completed': 'bg-blue-100 text-blue-800 border-blue-300',
  'cancelled': 'bg-red-100 text-red-800 border-red-300',
  'scheduled': 'bg-purple-100 text-purple-800 border-purple-300',
  'default': 'bg-gray-100 text-gray-800 border-gray-300'
};