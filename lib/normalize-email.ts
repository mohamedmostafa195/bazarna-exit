/** Normalize emails for storage and lookup (case-insensitive). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
