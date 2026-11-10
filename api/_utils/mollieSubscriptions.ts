/**
 * Mollie-abonnementen stoppen voordat er een nieuw abonnement wordt aangemaakt.
 *
 * Een klant mag bij Mollie maar één lopend abonnement hebben. Deze helper zoekt
 * daarom ALLE lopende abonnementen van de klant op (niet alleen het ID dat in
 * onze database staat) en stopt ze. Lukt dat niet, dan gooit hij een fout zodat
 * de aanroeper géén nieuw abonnement aanmaakt.
 */

/** Statussen waarbij Mollie (nu of later) nog kan afschrijven. */
const RUNNING_STATUSES = new Set(['active', 'pending', 'suspended']);

/** Bovengrens voor het doorzoeken van Mollie-klanten op e-mailadres. */
export const MAX_CUSTOMERS_SCANNED = 5000;

interface MollieSubscriptionLike {
  id: string;
  status: string;
}

interface MollieCustomerLike {
  id: string;
  email?: string | null;
}

/** Het deel van de Mollie-client dat deze helper gebruikt (maakt testen eenvoudig). */
export interface MollieSubscriptionClient {
  customers: {
    iterate(): AsyncIterable<MollieCustomerLike>;
  };
  customerSubscriptions: {
    iterate(parameters: { customerId: string }): AsyncIterable<MollieSubscriptionLike>;
    get(id: string, parameters: { customerId: string }): Promise<MollieSubscriptionLike>;
    cancel(id: string, parameters: { customerId: string }): Promise<unknown>;
  };
}

export interface CancelledSubscription {
  customerId: string;
  subscriptionId: string;
}

/**
 * Zoekt alle Mollie-klant-ID's met dit e-mailadres. Elke checkout maakt een
 * nieuwe Mollie-klant aan, dus één e-mailadres kan meerdere klanten hebben.
 */
async function findCustomerIdsByEmail(
  mollie: MollieSubscriptionClient,
  email: string
): Promise<string[]> {
  const wanted = email.trim().toLowerCase();
  const ids: string[] = [];
  let scanned = 0;

  for await (const customer of mollie.customers.iterate()) {
    scanned++;
    if (customer.email && customer.email.trim().toLowerCase() === wanted) {
      ids.push(customer.id);
    }
    if (scanned >= MAX_CUSTOMERS_SCANNED) {
      console.warn(
        `[Mollie] Klantenlijst afgekapt na ${MAX_CUSTOMERS_SCANNED} klanten bij zoeken op e-mailadres; oudere klanten zijn niet gecontroleerd`
      );
      break;
    }
  }

  return ids;
}

/**
 * Stopt alle lopende Mollie-abonnementen van een klant.
 *
 * @param customerIds Bekende Mollie-klant-ID's (uit onze database en van de betaling)
 * @param email       E-mailadres waarmee ook andere Mollie-klanten worden opgezocht
 * @returns de gestopte abonnementen
 * @throws als opzoeken of stoppen mislukt — maak dan géén nieuw abonnement aan
 */
export async function cancelAllActiveMollieSubscriptions(
  mollie: MollieSubscriptionClient,
  { customerIds, email }: { customerIds: Array<string | null | undefined>; email?: string | null }
): Promise<CancelledSubscription[]> {
  const allCustomerIds = new Set<string>();
  for (const id of customerIds) {
    if (id) allCustomerIds.add(id);
  }
  if (email) {
    for (const id of await findCustomerIdsByEmail(mollie, email)) {
      allCustomerIds.add(id);
    }
  }

  const cancelled: CancelledSubscription[] = [];

  for (const customerId of allCustomerIds) {
    const running: MollieSubscriptionLike[] = [];
    for await (const subscription of mollie.customerSubscriptions.iterate({ customerId })) {
      if (RUNNING_STATUSES.has(subscription.status)) running.push(subscription);
    }

    for (const subscription of running) {
      try {
        await mollie.customerSubscriptions.cancel(subscription.id, { customerId });
      } catch (cancelError) {
        // Kan intussen al gestopt zijn. Controleer de echte status bij Mollie:
        // alleen als het abonnement aantoonbaar niet meer loopt gaan we verder.
        const current = await mollie.customerSubscriptions.get(subscription.id, { customerId });
        if (RUNNING_STATUSES.has(current.status)) throw cancelError;
      }
      console.log('[Mollie] Abonnement gestopt:', subscription.id, 'klant:', customerId);
      cancelled.push({ customerId, subscriptionId: subscription.id });
    }
  }

  return cancelled;
}
