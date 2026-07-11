export type Balance = { personId: string; name: string; amount: number };
export type Transaction = { from: string; fromName: string; to: string; toName: string; amount: number };

const EPSILON = 0.005; // half a cent, to avoid float noise

/**
 * Given each person's net balance (positive = owed money, negative = owes money),
 * produce a settlement plan using the minimum number of transactions.
 *
 * Approach: greedily match the largest creditor against the largest debtor,
 * repeatedly. This is the standard practical solution to "minimum cash flow";
 * true global-minimum is NP-hard in general, but this greedy method gets very
 * close and, importantly, naturally concentrates leftover odd amounts onto a
 * small number of people rather than spreading small transactions everywhere.
 */
export function settleBalances(balances: Balance[]): Transaction[] {
  const creditors = balances
    .filter((b) => b.amount > EPSILON)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((b) => b.amount < -EPSILON)
    .map((b) => ({ ...b, amount: -b.amount })) // work with positive "owes" amounts
    .sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > EPSILON) {
      transactions.push({
        from: debtor.personId,
        fromName: debtor.name,
        to: creditor.personId,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount <= EPSILON) ci++;
    if (debtor.amount <= EPSILON) di++;
  }

  return transactions;
}
