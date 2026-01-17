/**
 * Admin utility functions for server-side API endpoints
 *
 * Admin status is determined by checking if the user's email
 * is in the VITE_ADMIN_EMAILS environment variable.
 */

/**
 * Check of een email adres een admin is
 * Admin emails worden geconfigureerd via VITE_ADMIN_EMAILS environment variable
 */
export const isAdminEmail = (email: string): boolean => {
  const adminEmails = process.env.VITE_ADMIN_EMAILS || '';
  const adminList = adminEmails.split(',').map((e: string) => e.toLowerCase().trim()).filter(Boolean);
  return adminList.includes(email.toLowerCase().trim());
};
