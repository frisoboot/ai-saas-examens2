/**
 * Email Service - Resend Integration
 *
 * Centrale service voor alle email functionaliteit.
 * Gebruikt Resend voor betrouwbare email delivery.
 */

import { Resend } from 'resend';

// Initialize Resend client
const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured - emails will be skipped');
    return null;
  }
  return new Resend(apiKey);
};

// Email configuratie
const EMAIL_FROM = process.env.EMAIL_FROM || 'AI Examentrainer <noreply@ai-examentrainer.nl>';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@ai-examentrainer.nl';
const APP_URL = process.env.VITE_APP_URL || 'https://ai-examentrainer.nl';

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Welkom email template
 */
function getWelcomeEmailHtml(name: string, email: string, level: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welkom bij AI Examentrainer</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">AI Examentrainer</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Welkom${name && name !== email ? `, ${name}` : ''}!</h2>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Je account voor de AI Examentrainer is succesvol aangemaakt. Je bent klaar om te beginnen met oefenen voor je examens!
              </p>

              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Account details:</p>
                <p style="margin: 0 0 4px; color: #1f2937; font-size: 16px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0; color: #1f2937; font-size: 16px;"><strong>Niveau:</strong> ${level}</p>
              </div>

              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Je hebt nu toegang tot alle oefenvragen en AI-gegenereerde examens. Start direct met oefenen om je kennis te verbeteren!
              </p>

              <a href="${APP_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Start met oefenen
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #9ca3af; font-size: 14px;">
                Vragen? Neem contact op via <a href="mailto:info@ai-examentrainer.nl" style="color: #3b82f6; text-decoration: none;">info@ai-examentrainer.nl</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                AI Examentrainer - Slim oefenen voor je examens
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Betaling geslaagd email template
 */
function getPaymentSuccessEmailHtml(email: string, amount: string, trialEnds: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Betaling ontvangen</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Betaling ontvangen</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 60px; height: 60px; background-color: #d1fae5; border-radius: 50%; line-height: 60px; font-size: 30px;">
                  &#10003;
                </div>
              </div>

              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Je betaling is gelukt!</h2>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We hebben je verificatiebetaling van <strong>${amount}</strong> ontvangen. Je proefperiode is nu gestart!
              </p>

              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #166534; font-size: 14px; font-weight: 600;">Proefperiode details:</p>
                <p style="margin: 0 0 4px; color: #1f2937; font-size: 16px;"><strong>Duur:</strong> 3 dagen gratis</p>
                <p style="margin: 0; color: #1f2937; font-size: 16px;"><strong>Eindigt op:</strong> ${trialEnds}</p>
              </div>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Na de proefperiode wordt je abonnement automatisch verlengd voor <strong>&euro;12,50 per maand</strong>.
                Je kunt op elk moment opzeggen via je accountinstellingen.
              </p>

              <div style="text-align: center;">
                <a href="${APP_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Ga naar je account
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                AI Examentrainer - Slim oefenen voor je examens
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Proefperiode bijna voorbij email template
 */
function getTrialEndingEmailHtml(name: string, email: string, trialEnds: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proefperiode eindigt morgen</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Proefperiode eindigt morgen</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Hoi${name && name !== email ? ` ${name}` : ''}!</h2>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Je gratis proefperiode bij AI Examentrainer eindigt morgen op <strong>${trialEnds}</strong>.
              </p>

              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">Wat gebeurt er daarna?</p>
                <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.5;">
                  Je abonnement wordt automatisch verlengd voor <strong>&euro;12,50 per maand</strong>.
                  Zo kun je onbeperkt blijven oefenen voor je examens!
                </p>
              </div>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Wil je toch niet doorgaan? Geen probleem! Je kunt op elk moment opzeggen via je accountinstellingen.
              </p>

              <div style="text-align: center;">
                <a href="${APP_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Ga naar je account
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                AI Examentrainer - Slim oefenen voor je examens
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Abonnement verlengd email template
 */
function getSubscriptionRenewedEmailHtml(email: string, amount: string, nextPayment: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Abonnement verlengd</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Abonnement verlengd</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 60px; height: 60px; background-color: #dbeafe; border-radius: 50%; line-height: 60px; font-size: 30px;">
                  &#10003;
                </div>
              </div>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Je maandelijkse betaling van <strong>${amount}</strong> voor AI Examentrainer is succesvol verwerkt.
              </p>

              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 4px; color: #1f2937; font-size: 16px;"><strong>Bedrag:</strong> ${amount}</p>
                <p style="margin: 0; color: #1f2937; font-size: 16px;"><strong>Volgende betaling:</strong> ${nextPayment}</p>
              </div>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Bedankt dat je AI Examentrainer blijft gebruiken. Succes met oefenen!
              </p>

              <div style="text-align: center;">
                <a href="${APP_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Verder oefenen
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                AI Examentrainer - Slim oefenen voor je examens
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Abonnement geannuleerd email template
 */
function getSubscriptionCancelledEmailHtml(email: string, accessUntil: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Abonnement opgezegd</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Abonnement opgezegd</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Je abonnement bij AI Examentrainer is succesvol opgezegd.
              </p>

              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Belangrijk:</p>
                <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.5;">
                  Je hebt nog toegang tot alle functies tot <strong>${accessUntil}</strong>.
                  Daarna wordt je account gedeactiveerd.
                </p>
              </div>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We vinden het jammer dat je weggaat! Je kunt altijd terugkomen door opnieuw een abonnement af te sluiten.
              </p>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Heb je feedback voor ons? We horen graag wat we beter kunnen doen.
                Mail ons op <a href="mailto:info@ai-examentrainer.nl" style="color: #3b82f6; text-decoration: none;">info@ai-examentrainer.nl</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                AI Examentrainer - Slim oefenen voor je examens
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Admin notificatie: nieuwe aanmelding
 */
function getAdminNewUserEmailHtml(userEmail: string, userName: string, level: string, source: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nieuwe student aangemeld</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Nieuwe student!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px;">
                Er heeft zich een nieuwe student aangemeld bij AI Examentrainer.
              </p>

              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 16px 0;">
                <p style="margin: 0 0 8px; color: #1f2937; font-size: 15px;"><strong>Email:</strong> ${userEmail}</p>
                <p style="margin: 0 0 8px; color: #1f2937; font-size: 15px;"><strong>Naam:</strong> ${userName}</p>
                <p style="margin: 0 0 8px; color: #1f2937; font-size: 15px;"><strong>Niveau:</strong> ${level}</p>
                <p style="margin: 0; color: #1f2937; font-size: 15px;"><strong>Bron:</strong> ${source}</p>
              </div>

              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 14px;">
                Bekijk het admin dashboard voor meer details.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================================================
// EMAIL SEND FUNCTIONS
// ============================================================================

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Verstuur welkom email naar nieuwe gebruiker
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  level: string
): Promise<EmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Welkom bij AI Examentrainer!',
      html: getWelcomeEmailHtml(name, email, level),
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    console.log('Welcome email sent to:', email, 'messageId:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Error sending welcome email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Verstuur betaling geslaagd email
 */
export async function sendPaymentSuccessEmail(
  email: string,
  amountCents: number,
  trialEndsAt: Date
): Promise<EmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const amount = `\u20AC${(amountCents / 100).toFixed(2).replace('.', ',')}`;
    const trialEnds = trialEndsAt.toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Betaling ontvangen - Je proefperiode is gestart!',
      html: getPaymentSuccessEmailHtml(email, amount, trialEnds),
    });

    if (error) {
      console.error('Failed to send payment success email:', error);
      return { success: false, error: error.message };
    }

    console.log('Payment success email sent to:', email);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Error sending payment success email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Verstuur proefperiode bijna voorbij email
 */
export async function sendTrialEndingEmail(
  email: string,
  name: string,
  trialEndsAt: Date
): Promise<EmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const trialEnds = trialEndsAt.toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Je proefperiode eindigt morgen',
      html: getTrialEndingEmailHtml(name, email, trialEnds),
    });

    if (error) {
      console.error('Failed to send trial ending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Trial ending email sent to:', email);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Error sending trial ending email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Verstuur abonnement verlengd email
 */
export async function sendSubscriptionRenewedEmail(
  email: string,
  amountCents: number,
  nextPaymentDate: Date
): Promise<EmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const amount = `\u20AC${(amountCents / 100).toFixed(2).replace('.', ',')}`;
    const nextPayment = nextPaymentDate.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Je abonnement is verlengd',
      html: getSubscriptionRenewedEmailHtml(email, amount, nextPayment),
    });

    if (error) {
      console.error('Failed to send subscription renewed email:', error);
      return { success: false, error: error.message };
    }

    console.log('Subscription renewed email sent to:', email);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Error sending subscription renewed email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Verstuur abonnement geannuleerd email
 */
export async function sendSubscriptionCancelledEmail(
  email: string,
  accessUntil: Date | null
): Promise<EmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const accessUntilStr = accessUntil
      ? accessUntil.toLocaleDateString('nl-NL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'onbekend';

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Je abonnement is opgezegd',
      html: getSubscriptionCancelledEmailHtml(email, accessUntilStr),
    });

    if (error) {
      console.error('Failed to send subscription cancelled email:', error);
      return { success: false, error: error.message };
    }

    console.log('Subscription cancelled email sent to:', email);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Error sending subscription cancelled email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Verstuur admin notificatie voor nieuwe gebruiker
 */
export async function sendAdminNewUserNotification(
  userEmail: string,
  userName: string,
  level: string,
  source: 'payment' | 'admin'
): Promise<EmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const sourceText = source === 'payment' ? 'Zelf aangemeld (betaling)' : 'Aangemaakt door admin';

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: ADMIN_EMAIL,
      subject: `Nieuwe student: ${userEmail}`,
      html: getAdminNewUserEmailHtml(userEmail, userName, level, sourceText),
    });

    if (error) {
      console.error('Failed to send admin notification:', error);
      return { success: false, error: error.message };
    }

    console.log('Admin notification sent for new user:', userEmail);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Error sending admin notification:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
