/**
 * Sanitize user input to prevent XSS attacks by stripping HTML tags.
 */
export const sanitizeText = (text: string): string => {
  return text.replace(/<[^>]*>/g, '');
};
