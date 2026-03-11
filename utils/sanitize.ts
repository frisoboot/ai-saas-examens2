/**
 * Sanitize user input to prevent XSS attacks by stripping HTML tags,
 * javascript: protocol handlers, and inline event handlers.
 */
export const sanitizeText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '');
};
