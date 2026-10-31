/**
 * Single serverless function for all admin endpoints (`/api/admin/<action>`).
 * See api/[route].ts for why endpoints are bundled. URLs are unchanged.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import activationCodes from '../_handlers/admin/activation-codes.js';
import feedback from '../_handlers/admin/feedback.js';
import healthCheck from '../_handlers/admin/health-check.js';
import subscriptions from '../_handlers/admin/subscriptions.js';
import users from '../_handlers/admin/users.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

const routes: Record<string, Handler> = {
  'activation-codes': activationCodes,
  'feedback': feedback,
  'health-check': healthCheck,
  'subscriptions': subscriptions,
  'users': users,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action ?? '');
  const target = Object.prototype.hasOwnProperty.call(routes, action) ? routes[action] : undefined;
  if (!target) {
    return res.status(404).json({ error: 'Not found' });
  }
  delete (req.query as Record<string, unknown>).action;
  return target(req, res);
}
