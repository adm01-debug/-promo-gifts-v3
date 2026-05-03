import { z } from "zod";

/**
 * Shared validation schemas and sanitization logic.
 */

/**
 * Sanitizes a string for safe rendering in HTML.
 * Note: React already escapes dynamic content in JSX, but this is a secondary
 * defense for data stored in JSON or used in dangerouslySetInnerHTML (which should be avoided).
 */
export function sanitizeString(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Standard Zod transformer that trims and sanitizes strings.
 */
export const safeString = z.string().trim().transform(sanitizeString);

/**
 * UUID Schema
 */
export const uuidSchema = z.string().uuid();

/**
 * Email Schema
 */
export const emailSchema = z.string().email();

/**
 * Common User Schema for validation
 */
export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  full_name: z.string().min(1).max(255).optional(),
});
