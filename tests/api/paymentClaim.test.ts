import { describe, it, expect } from 'vitest';
import { claimPayment, releasePaymentClaim, STALE_CLAIM_MS } from '../../api/_utils/paymentClaim';

type Row = { mollie_payment_id: string; status: string; created_at: string; [k: string]: unknown };

/** Minimale nep-Supabase met een `payments`-tabel en UNIQUE(mollie_payment_id). */
function createFakeSupabase(rows: Row[] = []) {
  const builder = () => {
    let op: 'select' | 'update' | 'delete' = 'select';
    let patch: Partial<Row> = {};
    const filters: Array<(r: Row) => boolean> = [];
    const run = () => {
      const matched = rows.filter(r => filters.every(f => f(r)));
      if (op === 'update') matched.forEach(r => Object.assign(r, patch));
      if (op === 'delete') matched.forEach(r => rows.splice(rows.indexOf(r), 1));
      return matched;
    };
    const q: any = {
      insert: async (row: Row) => {
        if (rows.some(r => r.mollie_payment_id === row.mollie_payment_id)) {
          return { error: { code: '23505', message: 'duplicate key' } };
        }
        rows.push({ created_at: new Date().toISOString(), ...row });
        return { error: null };
      },
      select: () => q,
      update: (p: Partial<Row>) => { op = 'update'; patch = p; return q; },
      delete: () => { op = 'delete'; return q; },
      eq: (col: string, val: unknown) => { filters.push(r => r[col] === val); return q; },
      lt: (col: string, val: string) => {
        filters.push(r => Date.parse(r[col] as string) < Date.parse(val));
        return q;
      },
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: run(), error: null }),
    };
    return q;
  };
  return { client: { from: () => builder() } as any, rows };
}

describe('claimPayment', () => {
  it('claimt een nieuwe betaling met een pending-regel', async () => {
    const { client, rows } = createFakeSupabase();
    expect(await claimPayment(client, 'tr_1', 200)).toBe('claimed');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ mollie_payment_id: 'tr_1', status: 'pending', amount_cents: 200 });
  });

  it('laat van twee gelijktijdige aanroepen maar één door', async () => {
    const { client, rows } = createFakeSupabase();
    const results = await Promise.all([
      claimPayment(client, 'tr_1', 200),
      claimPayment(client, 'tr_1', 200),
    ]);
    expect(results.sort()).toEqual(['claimed', 'in_progress']);
    expect(rows).toHaveLength(1);
  });

  it('herkent een al verwerkte betaling', async () => {
    const { client } = createFakeSupabase([
      { mollie_payment_id: 'tr_1', status: 'paid', created_at: new Date().toISOString() },
    ]);
    expect(await claimPayment(client, 'tr_1', 200)).toBe('already_processed');
  });

  it('neemt een verlopen claim over, maar slechts één keer', async () => {
    const { client } = createFakeSupabase([
      {
        mollie_payment_id: 'tr_1',
        status: 'pending',
        created_at: new Date(Date.now() - STALE_CLAIM_MS - 1000).toISOString(),
      },
    ]);
    expect(await claimPayment(client, 'tr_1', 200)).toBe('claimed');
    expect(await claimPayment(client, 'tr_1', 200)).toBe('in_progress');
  });

  it('maakt de betaling na vrijgeven opnieuw claimbaar', async () => {
    const { client, rows } = createFakeSupabase();
    await claimPayment(client, 'tr_1', 200);
    await releasePaymentClaim(client, 'tr_1');
    expect(rows).toHaveLength(0);
    expect(await claimPayment(client, 'tr_1', 200)).toBe('claimed');
  });

  it('geeft een verwerkte betaling niet vrij', async () => {
    const { client, rows } = createFakeSupabase([
      { mollie_payment_id: 'tr_1', status: 'paid', created_at: new Date().toISOString() },
    ]);
    await releasePaymentClaim(client, 'tr_1');
    expect(rows).toHaveLength(1);
  });
});
