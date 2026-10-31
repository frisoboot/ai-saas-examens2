/**
 * Single serverless function that serves the general API endpoints.
 *
 * The Vercel Hobby plan allows at most 12 serverless functions per
 * deployment, so instead of one function per endpoint we route
 * `/api/<name>` to the matching handler in `api/_handlers/`.
 * Folders starting with `_` are not turned into functions by Vercel.
 * The public URLs stay exactly the same.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import activateCode from './_handlers/activate-code.js';
import cancelSubscription from './_handlers/cancel-subscription.js';
import checkPaymentStatus from './_handlers/check-payment-status.js';
import checkSubscription from './_handlers/check-subscription.js';
import createCheckout from './_handlers/create-checkout.js';
import forgotPassword from './_handlers/forgot-password.js';
import registerWithCode from './_handlers/register-with-code.js';
import resubscribe from './_handlers/resubscribe.js';
import submitFeedback from './_handlers/submit-feedback.js';
import waitlist from './_handlers/waitlist.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

const routes: Record<string, Handler> = {
  'activate-code': activateCode,
  'cancel-subscription': cancelSubscription,
  'check-payment-status': checkPaymentStatus,
  'check-subscription': checkSubscription,
  'create-checkout': createCheckout,
  'forgot-password': forgotPassword,
  'register-with-code': registerWithCode,
  'resubscribe': resubscribe,
  'submit-feedback': submitFeedback,
  'waitlist': waitlist,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = String(req.query.route ?? '');
  const target = Object.prototype.hasOwnProperty.call(routes, route) ? routes[route] : undefined;
  if (!target) {
    return res.status(404).json({ error: 'Not found' });
  }
  // Remove the routing param so handlers see the same query as before
  delete (req.query as Record<string, unknown>).route;
  return target(req, res);
}
