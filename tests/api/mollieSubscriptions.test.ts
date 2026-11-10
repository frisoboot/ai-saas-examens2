import { describe, it, expect, vi } from 'vitest';
import {
  cancelAllActiveMollieSubscriptions,
  type MollieSubscriptionClient,
} from '../../api/_utils/mollieSubscriptions';

type Sub = { id: string; status: string };

async function* asyncIter<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) yield item;
}

function createMollie(
  customers: Array<{ id: string; email?: string | null }>,
  subsByCustomer: Record<string, Sub[]>
) {
  const cancel = vi.fn(async (id: string, { customerId }: { customerId: string }) => {
    const sub = subsByCustomer[customerId]?.find(s => s.id === id);
    if (sub) sub.status = 'canceled';
  });
  const mollie: MollieSubscriptionClient = {
    customers: { iterate: () => asyncIter(customers) },
    customerSubscriptions: {
      iterate: ({ customerId }) => asyncIter(subsByCustomer[customerId] || []),
      get: async (id, { customerId }) => subsByCustomer[customerId].find(s => s.id === id)!,
      cancel,
    },
  };
  return { mollie, cancel };
}

describe('cancelAllActiveMollieSubscriptions', () => {
  it('stopt alle lopende abonnementen, ook die niet in de database staan', async () => {
    const { mollie, cancel } = createMollie([], {
      cst_1: [
        { id: 'sub_AAA', status: 'active' },
        { id: 'sub_BBB', status: 'active' },
        { id: 'sub_old', status: 'canceled' },
        { id: 'sub_new', status: 'pending' },
      ],
    });

    const result = await cancelAllActiveMollieSubscriptions(mollie, { customerIds: ['cst_1'] });

    expect(result.map(r => r.subscriptionId)).toEqual(['sub_AAA', 'sub_BBB', 'sub_new']);
    expect(cancel).toHaveBeenCalledTimes(3);
    expect(cancel).not.toHaveBeenCalledWith('sub_old', expect.anything());
  });

  it('vindt ook andere Mollie-klanten met hetzelfde e-mailadres', async () => {
    const { mollie, cancel } = createMollie(
      [
        { id: 'cst_1', email: 'Klant@Example.nl' },
        { id: 'cst_2', email: 'klant@example.nl' },
        { id: 'cst_other', email: 'iemand@anders.nl' },
        { id: 'cst_noemail', email: null },
      ],
      {
        cst_1: [{ id: 'sub_1', status: 'active' }],
        cst_2: [{ id: 'sub_2', status: 'active' }],
        cst_other: [{ id: 'sub_other', status: 'active' }],
      }
    );

    const result = await cancelAllActiveMollieSubscriptions(mollie, {
      customerIds: ['cst_1', null, undefined],
      email: 'klant@example.nl',
    });

    expect(result).toEqual([
      { customerId: 'cst_1', subscriptionId: 'sub_1' },
      { customerId: 'cst_2', subscriptionId: 'sub_2' },
    ]);
    expect(cancel).not.toHaveBeenCalledWith('sub_other', expect.anything());
  });

  it('gooit een fout als stoppen mislukt en het abonnement nog loopt', async () => {
    const { mollie, cancel } = createMollie([], { cst_1: [{ id: 'sub_AAA', status: 'active' }] });
    cancel.mockRejectedValueOnce(new Error('Mollie 503'));

    await expect(
      cancelAllActiveMollieSubscriptions(mollie, { customerIds: ['cst_1'] })
    ).rejects.toThrow('Mollie 503');
  });

  it('gaat door als stoppen een fout geeft maar het abonnement al gestopt blijkt', async () => {
    const subs = { cst_1: [{ id: 'sub_AAA', status: 'active' }] };
    const { mollie, cancel } = createMollie([], subs);
    cancel.mockImplementationOnce(async () => {
      subs.cst_1[0].status = 'canceled';
      throw new Error('already canceled');
    });

    const result = await cancelAllActiveMollieSubscriptions(mollie, { customerIds: ['cst_1'] });
    expect(result).toHaveLength(1);
  });

  it('gooit een fout als het opvragen van abonnementen mislukt', async () => {
    const { mollie } = createMollie([], {});
    mollie.customerSubscriptions.iterate = () => {
      throw new Error('list failed');
    };

    await expect(
      cancelAllActiveMollieSubscriptions(mollie, { customerIds: ['cst_1'] })
    ).rejects.toThrow('list failed');
  });

  it('doet niets zonder klant of e-mailadres', async () => {
    const { mollie, cancel } = createMollie([], {});
    expect(await cancelAllActiveMollieSubscriptions(mollie, { customerIds: [null] })).toEqual([]);
    expect(cancel).not.toHaveBeenCalled();
  });
});
