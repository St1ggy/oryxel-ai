import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type { ClassDictionary, ClassValue } from 'clsx'

// Joins class values and normalizes conflicts via `tailwind-merge`.
//
// Conditional classes are supported through **clsx** objects (key = class, value = flag).
//
// @example
// cn('base', { active: isActive, 'text-red-500': hasError, hidden: !visible })
//
// @example
// cn('flex', [gapClass, paddingClass], { 'opacity-50': disabled })
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs))
}
