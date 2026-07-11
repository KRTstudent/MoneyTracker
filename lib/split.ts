export type Person = { id: string; name: string; sort_order: number };

export type CostShare = { person_id: string; portion: number };

export type CostItem = {
  id: string;
  description: string;
  total_amount: number;
  paid_by: string | null;
  shares: CostShare[];
};

export type ComputedShare = { personId: string; portion: number; amount: number };
export type ComputedItem = CostItem & { computedShares: ComputedShare[] };

/** Turn each item's portions into dollar amounts for the people involved. */
export function computeItem(item: CostItem): ComputedItem {
  const totalPortion = item.shares.reduce((sum, s) => sum + (s.portion || 0), 0);

  const computedShares: ComputedShare[] = item.shares.map((s) => ({
    personId: s.person_id,
    portion: s.portion,
    amount:
      totalPortion > 0
        ? Math.round((item.total_amount * (s.portion / totalPortion)) * 100) / 100
        : 0,
  }));

  return { ...item, computedShares };
}

/** Net balance per person across the whole trip: what they paid minus what they owe. */
export function computeBalances(people: Person[], items: CostItem[]) {
  const balanceMap = new Map<string, number>();
  people.forEach((p) => balanceMap.set(p.id, 0));

  for (const item of items) {
    const computed = computeItem(item);

    if (item.paid_by && balanceMap.has(item.paid_by)) {
      balanceMap.set(item.paid_by, (balanceMap.get(item.paid_by) || 0) + item.total_amount);
    }

    for (const share of computed.computedShares) {
      if (balanceMap.has(share.personId)) {
        balanceMap.set(share.personId, (balanceMap.get(share.personId) || 0) - share.amount);
      }
    }
  }

  return people.map((p) => ({
    personId: p.id,
    name: p.name,
    amount: Math.round((balanceMap.get(p.id) || 0) * 100) / 100,
  }));
}
