import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string): string {
  if (str.length === 0) return str;
  const first = str[0];
  if (first === undefined) return str;
  return first.toUpperCase() + str.slice(1);
}

export function truncate(str: string, length: number): string {
  if (length < 0) return str;
  if (str.length <= length) return str;
  if (length <= 3) return str.slice(0, length);
  return str.slice(0, length - 3) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
