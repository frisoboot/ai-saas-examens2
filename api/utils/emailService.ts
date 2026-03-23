/**
 * Email Service - Resend
 *
 * Verstuurt transactionele emails via Resend.
 * Configureer RESEND_API_KEY en RESEND_FROM_EMAIL in je omgevingsvariabelen.
 */

import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is niet geconfigureerd');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AI Examentrainer <noreply@ai-examentrainer.nl>';
const APP_URL = process.env.VITE_APP_URL || 'https://ai-examentrainer.nl';

// ============================================================================
// WELCOME EMAIL - Na succesvolle registratie
// ============================================================================
export async function sendWelcomeEmail(
  email: string,
  level: string,
  trialEndDate: Date
): Promise<void> {
  const resend = getResendClient();

  const trialEndStr = trialEndDate.toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const levelLabels: Record<string, string> = {
    'VMBO-TL': 'VMBO-TL',
    HAVO: 'HAVO',
    VWO: 'VWO',
  };

  const levelLabel = levelLabels[level] || level;

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welkom bij AI Examentrainer!</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">AI Examentrainer</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Jouw persoonlijke examencoach</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:600;">Welkom! Je account is klaar 🎉</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Je proefperiode is gestart. Je hebt tot en met <strong>${trialEndStr}</strong> gratis toegang tot alle functies van AI Examentrainer voor <strong>${levelLabel}</strong>.
              </p>

              <table cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:24px;margin-bottom:28px;width:100%;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;color:#1e293b;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Wat je kunt doen:</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;color:#475569;font-size:14px;">✅ &nbsp;Oefen met echte examenopgaven</td></tr>
                      <tr><td style="padding:4px 0;color:#475569;font-size:14px;">✅ &nbsp;AI-gegenereerde oefenvragen</td></tr>
                      <tr><td style="padding:4px 0;color:#475569;font-size:14px;">✅ &nbsp;Flashcards per vak</td></tr>
                      <tr><td style="padding:4px 0;color:#475569;font-size:14px;">✅ &nbsp;AI-tutor chat voor uitleg</td></tr>
                      <tr><td style="padding:4px 0;color:#475569;font-size:14px;">✅ &nbsp;Voortgang bijhouden per vak</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.2px;">
                      Direct inloggen →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
                Je inloggegevens zijn het e-mailadres waarmee je je hebt geregistreerd en het wachtwoord dat je hebt aangemaakt.
              </p>
              <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                Vragen? Stuur een e-mail naar <a href="mailto:support@ai-examentrainer.nl" style="color:#4f46e5;">support@ai-examentrainer.nl</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                © ${new Date().getFullYear()} AI Examentrainer · <a href="${APP_URL}" style="color:#94a3b8;">ai-examentrainer.nl</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Welkom bij AI Examentrainer – je proefperiode is gestart!',
    html,
  });

  if (error) {
    throw new Error(`Resend fout bij welcome email: ${error.message}`);
  }
}

// ============================================================================
// SUBSCRIPTION RENEWED EMAIL - Na succesvolle verlenging
// ============================================================================
export async function sendSubscriptionRenewedEmail(
  email: string,
  plan: string,
  nextBillingDate: Date
): Promise<void> {
  const resend = getResendClient();

  const nextBillingStr = nextBillingDate.toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const planLabels: Record<string, string> = {
    monthly: 'Maandelijks',
    quarterly: 'Kwartaal',
    yearly: 'Jaarlijks',
  };

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Abonnement verlengd</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">AI Examentrainer</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;font-weight:600;">Abonnement succesvol verlengd ✓</h2>
              <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
                Je <strong>${planLabels[plan] || plan}</strong> abonnement is verlengd. Volgende afschrijving: <strong>${nextBillingStr}</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                      Naar dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#64748b;font-size:13px;">
                Abonnement beheren? Ga naar <a href="${APP_URL}/settings" style="color:#4f46e5;">Instellingen</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} AI Examentrainer</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Abonnement verlengd – AI Examentrainer',
    html,
  });

  if (error) {
    throw new Error(`Resend fout bij renewal email: ${error.message}`);
  }
}

// ============================================================================
// PAYMENT FAILED EMAIL - Bij mislukte betaling
// ============================================================================
export async function sendPaymentFailedEmail(email: string): Promise<void> {
  const resend = getResendClient();

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Betaling mislukt</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">AI Examentrainer</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#dc2626;font-size:20px;font-weight:600;">Betaling mislukt ⚠️</h2>
              <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
                We konden je abonnementsbetaling niet verwerken. Je toegang is tijdelijk onderbroken.
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Controleer je betaalgegevens via je Mollie-account of neem contact op via <a href="mailto:support@ai-examentrainer.nl" style="color:#4f46e5;">support@ai-examentrainer.nl</a>.
              </p>
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/settings" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                      Betaalgegevens bekijken →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} AI Examentrainer</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Actie vereist: betaling mislukt – AI Examentrainer',
    html,
  });

  if (error) {
    throw new Error(`Resend fout bij payment failed email: ${error.message}`);
  }
}
