/**
 * Betaling "claimen" vóór verwerking, zodat een dubbele webhook-aanroep van
 * Mollie (bijv. een retry terwijl de eerste aanroep nog loopt) niets dubbel doet.
 *
 * De claim is een regel in `payments` met status 'pending'. De kolom
 * `mollie_payment_id` is UNIQUE, dus van twee gelijktijdige aanroepen kan er
 * maar één de regel aanmaken. Na verwerking wordt de regel bijgewerkt naar
 * 'paid'; bij een afgebroken verwerking wordt hij weer verwijderd.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type ClaimResult = 'claimed' | 'already_processed' | 'in_progress';

/**
 * Een claim die langer dan dit openstaat is van een gecrashte aanroep en mag
 * worden overgenomen. Ruim boven de maximale looptijd van de webhook-functie.
 */
export const STALE_CLAIM_MS = 5 * 60 * 1000;

const UNIQUE_VIOLATION = '23505';

export async function claimPayment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  paymentId: string,
  amountCents: number
): Promise<ClaimResult> {
  const { error: insertError } = await supabase.from('payments').insert({
    mollie_payment_id: paymentId,
    amount_cents: amountCents,
    currency: 'EUR',
    status: 'pending',
    description: 'In verwerking',
  });

  if (!insertError) return 'claimed';
  if (insertError.code !== UNIQUE_VIOLATION) {
    throw new Error(`Could not claim payment ${paymentId}: ${insertError.message}`);
  }

  // Er bestaat al een regel: al verwerkt, of een andere aanroep is bezig.
  const { data: existing, error: selectError } = await supabase
    .from('payments')
    .select('status, created_at')
    .eq('mollie_payment_id', paymentId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Could not read payment claim ${paymentId}: ${selectError.message}`);
  }
  // Regel is tussen insert en select verwijderd (claim vrijgegeven): laat Mollie opnieuw proberen
  if (!existing) return 'in_progress';
  if (existing.status !== 'pending') return 'already_processed';

  const staleBeforeMs = Date.now() - STALE_CLAIM_MS;
  const staleBefore = new Date(staleBeforeMs).toISOString();
  if (existing.created_at && Date.parse(existing.created_at) < staleBeforeMs) {
    // Verlopen claim overnemen. De voorwaarden in de update maken dit atomair:
    // van twee aanroepen die tegelijk overnemen krijgt er maar één een regel terug.
    const { data: takenOver, error: takeoverError } = await supabase
      .from('payments')
      .update({ created_at: new Date().toISOString() })
      .eq('mollie_payment_id', paymentId)
      .eq('status', 'pending')
      .lt('created_at', staleBefore)
      .select('id');

    if (takeoverError) {
      throw new Error(`Could not take over payment claim ${paymentId}: ${takeoverError.message}`);
    }
    if (takenOver && takenOver.length > 0) return 'claimed';
  }

  return 'in_progress';
}

/** Geeft een claim vrij zodat een latere webhook-aanroep de betaling alsnog kan verwerken. */
export async function releasePaymentClaim(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  paymentId: string
): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('mollie_payment_id', paymentId)
    .eq('status', 'pending');

  if (error) {
    console.error('Could not release payment claim:', paymentId, error);
  }
}
