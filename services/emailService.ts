/**
 * Email Service - Send transactional emails
 *
 * Uses Resend for email delivery
 * In development mode, logs to console instead of sending
 */

interface WelcomeEmailData {
  name: string;
  email: string;
  trialEndDate: string;
}

interface TrialEndingEmailData {
  name: string;
  email: string;
  daysRemaining: number;
}

interface TrialExpiredEmailData {
  name: string;
  email: string;
}

/**
 * Send welcome email when user signs up
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  const { name, email, trialEndDate } = data;

  // In development: just log
  if (process.env.NODE_ENV === 'development' || !process.env.RESEND_API_KEY) {
    console.log('[DEV] Welcome email would be sent to:', email);
    console.log('Subject: Welkom bij Examentrainer.nl - Je 7 Dagen Trial is Gestart!');
    console.log('Body:', {
      name,
      trialEndDate,
      loginUrl: process.env.VITE_APP_URL || 'https://examentrainer.nl'
    });
    return;
  }

  // Production: send via Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Examentrainer.nl <noreply@examentrainer.nl>',
      to: email,
      subject: 'Welkom bij Examentrainer.nl - Je 7 Dagen Trial is Gestart!',
      html: generateWelcomeEmailHTML(name, trialEndDate)
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email verzenden mislukt: ${JSON.stringify(error)}`);
  }

  console.log('Welcome email sent to:', email);
}

/**
 * Send trial ending reminder (2 days before expiration)
 */
export async function sendTrialEndingEmail(data: TrialEndingEmailData): Promise<void> {
  const { name, email, daysRemaining } = data;

  if (process.env.NODE_ENV === 'development' || !process.env.RESEND_API_KEY) {
    console.log('[DEV] Trial ending email would be sent to:', email);
    console.log(`Subject: Je trial loopt over ${daysRemaining} dagen af`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Examentrainer.nl <noreply@examentrainer.nl>',
      to: email,
      subject: `Je trial loopt over ${daysRemaining} dagen af`,
      html: generateTrialEndingEmailHTML(name, daysRemaining)
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email verzenden mislukt: ${JSON.stringify(error)}`);
  }

  console.log('Trial ending email sent to:', email);
}

/**
 * Send trial expired notification
 */
export async function sendTrialExpiredEmail(data: TrialExpiredEmailData): Promise<void> {
  const { name, email } = data;

  if (process.env.NODE_ENV === 'development' || !process.env.RESEND_API_KEY) {
    console.log('[DEV] Trial expired email would be sent to:', email);
    console.log('Subject: Je trial is verlopen');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Examentrainer.nl <noreply@examentrainer.nl>',
      to: email,
      subject: 'Je trial is verlopen - Upgrade je account',
      html: generateTrialExpiredEmailHTML(name)
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email verzenden mislukt: ${JSON.stringify(error)}`);
  }

  console.log('Trial expired email sent to:', email);
}

// Email HTML templates
function generateWelcomeEmailHTML(name: string, trialEndDate: string): string {
  const loginUrl = process.env.VITE_APP_URL || 'https://examentrainer.nl';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welkom bij Examentrainer.nl</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welkom bij Examentrainer.nl!</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px;">Hoi ${name},</p>

      <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
        Je account is succesvol aangemaakt! Je kunt nu direct aan de slag met je <strong>7 dagen gratis trial</strong>.
      </p>

      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 8px;">
        <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #1e40af;">Je trial loopt tot:</p>
        <p style="margin: 0; font-size: 20px; font-weight: 700; color: #1e40af;">${new Date(trialEndDate).toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <h3 style="color: #1f2937; font-size: 18px; margin: 30px 0 15px;">Wat kun je nu doen?</h3>
      <ul style="color: #4b5563; font-size: 16px; line-height: 1.8; padding-left: 20px;">
        <li>Onbeperkt examenvragen oefenen voor je niveau</li>
        <li>Direct feedback krijgen van onze AI-coach</li>
        <li>Je voortgang bijhouden en zwakke punten ontdekken</li>
      </ul>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
          Start met Oefenen
        </a>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin: 30px 0 0; padding-top: 30px; border-top: 1px solid #e5e7eb;">
        Na je trial periode gaat je abonnement automatisch door voor 12,50 per maand. Je kunt op elk moment opzeggen in je accountinstellingen.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        Examentrainer.nl - Je Persoonlijke AI Examen Coach
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateTrialEndingEmailHTML(name: string, daysRemaining: number): string {
  const loginUrl = process.env.VITE_APP_URL || 'https://examentrainer.nl';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Je trial loopt bijna af</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Je trial loopt bijna af</h1>
    </div>

    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px;">Hoi ${name},</p>

      <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
        Je hebt nog <strong>${daysRemaining} ${daysRemaining === 1 ? 'dag' : 'dagen'}</strong> van je gratis trial over. Daarna gaat je abonnement automatisch door.
      </p>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 8px;">
        <p style="margin: 0; font-size: 16px; color: #92400e;">
          <strong>Wil je stoppen?</strong> Annuleer dan voor het einde van je trial in je account instellingen. Anders betaal je 12,50 per maand.
        </p>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px;">
          Ga naar je Account
        </a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function generateTrialExpiredEmailHTML(name: string): string {
  const loginUrl = process.env.VITE_APP_URL || 'https://examentrainer.nl';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Je trial is verlopen</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f7;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px;">Hoi ${name},</p>

      <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
        Je gratis trial is verlopen en we hebben geen betaling kunnen verwerken. Je account is tijdelijk gedeactiveerd.
      </p>

      <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
        Wil je doorgaan met Examentrainer.nl? Log in en voltooi je betaalgegevens om weer toegang te krijgen.
      </p>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px;">
          Activeer je Account
        </a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
