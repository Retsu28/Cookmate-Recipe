import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the first character of a full name, uppercased.
 * Used to render avatar placeholders when no profile picture is set.
 * Falls back to '?' when the name is empty / nullish.
 */
export function getInitial(name?: string | null): string {
  const trimmed = (name ?? "").trim()
  if (!trimmed) return "?"
  return trimmed.charAt(0).toUpperCase()
}
