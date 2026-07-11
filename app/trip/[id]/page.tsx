"use client";

import React, { useEffect, useMemo, useState, use as usePromise } from "react";
import { computeItem, computeBalances, type CostItem } from "@/lib/split";
import { settleBalances } from "@/lib/settlement";

type Person = { id: string; name: string; sort_order: number };
type Trip = { id: string; name: string };

function tokenKey(tripId: string) {
  return `tally_token_${tripId}`;
}

export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = usePromise(params);

  const [token, setToken] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<CostItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // load token from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(tokenKey(tripId));
    setToken(stored);
    setCheckingToken(false);
  }, [tripId]);

  async function loadTripData(withToken: string) {
    setLoadingData(true);
    const res = await fetch(`/api/trips/${tripId}`, {
      headers: { Authorization: `Bearer ${withToken}` },
    });
    if (res.status === 401) {
      localStorage.removeItem(tokenKey(tripId));
      setToken(null);
      setLoadingData(false);
      return;
    }
    const data = await res.json();
    setTrip(data.trip);
    setPeople(data.people);
    setItems(data.items);
    setLoadingData(false);
  }

  useEffect(() => {
    if (token) loadTripData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Incorrect password.");
        return;
      }
      localStorage.setItem(tokenKey(tripId), data.token);
      setToken(data.token);
    } finally {
      setAuthLoading(false);
    }
  }

  const authHeader = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );

  async function addPerson(name: string) {
    if (!authHeader) return;
    const res = await fetch(`/api/trips/${tripId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) setPeople((p) => [...p, data.person]);
  }

  async function addItem(description: string, totalAmount: number, paidBy: string, portions: Record<string, number>) {
    if (!authHeader) return;
    const shares = Object.entries(portions)
      .filter(([, v]) => v > 0)
      .map(([person_id, portion]) => ({ person_id, portion }));

    const res = await fetch(`/api/trips/${tripId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ description, total_amount: totalAmount, paid_by: paidBy || null, shares }),
    });
    const data = await res.json();
    if (res.ok) setItems((it) => [...it, data.item]);
  }

  async function updateItem(itemId: string, patch: Partial<{ description: string; total_amount: number; paid_by: string | null; shares: { person_id: string; portion: number }[] }>) {
    if (!authHeader) return;
    await fetch(`/api/trips/${tripId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(patch),
    });
    await loadTripData(token!);
  }

  async function deleteItem(itemId: string) {
    if (!authHeader) return;
    await fetch(`/api/trips/${tripId}/items/${itemId}`, { method: "DELETE", headers: authHeader });
    setItems((it) => it.filter((i) => i.id !== itemId));
  }

  const balances = useMemo(() => computeBalances(people, items), [people, items]);
  const transactions = useMemo(() => settleBalances(balances), [balances]);

  if (checkingToken) return null;

  if (!token) {
    return (
      <main style={{ maxWidth: 420, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginBottom: 6 }}>
          Enter trip password
        </h1>
        <p style={{ color: "var(--moss)", fontSize: 14, marginBottom: 20 }}>
          Ask whoever created this trip for the password.
        </p>
        <form onSubmit={submitPassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            autoFocus
            type="text"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              fontSize: 16,
            }}
          />
          {authError && <p style={{ color: "#a33", fontSize: 13, margin: 0 }}>{authError}</p>}
          <button
            type="submit"
            disabled={authLoading}
            style={{
              background: "var(--petrol)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 14px",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {authLoading ? "Checking…" : "Unlock trip"}
          </button>
        </form>
      </main>
    );
  }

  if (loadingData || !trip) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px" }}>
        <p style={{ color: "var(--moss)" }}>Loading trip…</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <a href="/" style={{ fontSize: 13, color: "var(--moss)", textDecoration: "none" }}>
          ← All trips
        </a>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            margin: "4px 0 20px",
            fontWeight: 600,
          }}
        >
          {trip.name}
        </h1>

        <PeopleBar people={people} onAdd={addPerson} />

        <LedgerGrid
          people={people}
          items={items}
          onAddItem={addItem}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
        />

        <SettlementPanel balances={balances} transactions={transactions} />
      </div>
    </main>
  );
}

function PeopleBar({ people, onAdd }: { people: Person[]; onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 18 }}>
      {people.map((p) => (
        <span
          key={p.id}
          style={{
            background: "var(--paper-raised)",
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {p.name}
        </span>
      ))}
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onAdd(name.trim());
            setName("");
            setAdding(false);
          }}
          style={{ display: "flex", gap: 6 }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid var(--petrol)",
              fontSize: 13,
              width: 120,
            }}
            onBlur={() => !name && setAdding(false)}
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            background: "transparent",
            border: "1px dashed var(--moss)",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 13,
            color: "var(--moss)",
            fontWeight: 600,
          }}
        >
          + Add person
        </button>
      )}
    </div>
  );
}

function LedgerGrid({
  people,
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: {
  people: Person[];
  items: CostItem[];
  onAddItem: (description: string, totalAmount: number, paidBy: string, portions: Record<string, number>) => void;
  onUpdateItem: (
    itemId: string,
    patch: Partial<{ description: string; total_amount: number; paid_by: string | null; shares: { person_id: string; portion: number }[] }>
  ) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newPaidBy, setNewPaidBy] = useState("");
  const [newPortions, setNewPortions] = useState<Record<string, string>>({});

  const colWidth = 132;

  function resetNewRow() {
    setNewDesc("");
    setNewAmount("");
    setNewPaidBy("");
    setNewPortions({});
  }

  function submitNewRow() {
    if (!newDesc.trim() || !newAmount) return;
    const portions: Record<string, number> = {};
    for (const p of people) {
      const v = parseFloat(newPortions[p.id] || "0");
      if (v > 0) portions[p.id] = v;
    }
    onAddItem(newDesc.trim(), parseFloat(newAmount), newPaidBy, portions);
    resetNewRow();
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "auto",
        background: "var(--paper-raised)",
        marginBottom: 28,
      }}
    >
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 + people.length * colWidth }}>
        <thead>
          <tr>
            <Th sticky style={{ minWidth: 200 }}>
              Item
            </Th>
            <Th style={{ minWidth: 120 }}>Paid by</Th>
            <Th style={{ minWidth: 110 }}>Total $</Th>
            {people.map((p) => (
              <th
                key={p.id}
                colSpan={2}
                style={{
                  ...thStyle,
                  minWidth: colWidth,
                  textAlign: "center",
                  borderLeft: "1px solid var(--line)",
                }}
              >
                {p.name}
              </th>
            ))}
            <Th style={{ minWidth: 40 }}></Th>
          </tr>
          <tr>
            <Th sticky subtle></Th>
            <Th subtle></Th>
            <Th subtle></Th>
            {people.map((p) => (
              <React.Fragment key={p.id}>
                <Th subtle style={{ borderLeft: "1px solid var(--line)", textAlign: "center" }}>
                  portion
                </Th>
                <Th subtle style={{ textAlign: "center" }}>
                  $
                </Th>
              </React.Fragment>
            ))}
            <Th subtle></Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              people={people}
              onUpdate={(patch) => onUpdateItem(item.id, patch)}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))}

          <tr>
            <Td sticky>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="New item…"
                style={cellInputStyle}
              />
            </Td>
            <Td>
              <select value={newPaidBy} onChange={(e) => setNewPaidBy(e.target.value)} style={cellInputStyle}>
                <option value="">—</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Td>
            <Td>
              <input
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                style={cellInputStyle}
              />
            </Td>
            {people.map((p) => {
              const portionVal = parseFloat(newPortions[p.id] || "0");
              const totalPortion = people.reduce((s, pp) => s + parseFloat(newPortions[pp.id] || "0"), 0);
              const amt = totalPortion > 0 && newAmount ? (parseFloat(newAmount) * portionVal) / totalPortion : 0;
              return (
                <React.Fragment key={p.id}>
                  <Td style={{ borderLeft: "1px solid var(--line)" }}>
                    <input
                      value={newPortions[p.id] || ""}
                      onChange={(e) => setNewPortions((s) => ({ ...s, [p.id]: e.target.value }))}
                      placeholder="0"
                      inputMode="decimal"
                      style={{ ...cellInputStyle, textAlign: "center" }}
                    />
                  </Td>
                  <Td muted>{portionVal > 0 ? amt.toFixed(2) : ""}</Td>
                </React.Fragment>
              );
            })}
            <Td>
              <button onClick={submitNewRow} style={addBtnStyle} aria-label="Add item">
                +
              </button>
            </Td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ItemRow({
  item,
  people,
  onUpdate,
  onDelete,
}: {
  item: CostItem;
  people: Person[];
  onUpdate: (patch: Partial<{ description: string; total_amount: number; paid_by: string | null; shares: { person_id: string; portion: number }[] }>) => void;
  onDelete: () => void;
}) {
  const computed = computeItem(item);
  const shareMap = new Map(item.shares.map((s) => [s.person_id, s.portion]));

  function setPortion(personId: string, value: string) {
    const v = parseFloat(value || "0");
    const newShares = people
      .map((p) => ({
        person_id: p.id,
        portion: p.id === personId ? v : shareMap.get(p.id) || 0,
      }))
      .filter((s) => s.portion > 0);
    onUpdate({ shares: newShares });
  }

  return (
    <tr>
      <Td sticky>
        <input
          defaultValue={item.description}
          onBlur={(e) => {
            if (e.target.value !== item.description) onUpdate({ description: e.target.value });
          }}
          style={cellInputStyle}
        />
      </Td>
      <Td>
        <select
          defaultValue={item.paid_by || ""}
          onChange={(e) => onUpdate({ paid_by: e.target.value || null })}
          style={cellInputStyle}
        >
          <option value="">—</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Td>
      <Td>
        <input
          defaultValue={item.total_amount}
          inputMode="decimal"
          onBlur={(e) => {
            const v = parseFloat(e.target.value || "0");
            if (v !== item.total_amount) onUpdate({ total_amount: v });
          }}
          style={cellInputStyle}
        />
      </Td>
      {people.map((p) => {
        const portion = shareMap.get(p.id) || 0;
        const share = computed.computedShares.find((s) => s.personId === p.id);
        return (
          <React.Fragment key={p.id}>
            <Td style={{ borderLeft: "1px solid var(--line)" }}>
              <input
                defaultValue={portion || ""}
                inputMode="decimal"
                placeholder="0"
                onBlur={(e) => setPortion(p.id, e.target.value)}
                style={{ ...cellInputStyle, textAlign: "center" }}
              />
            </Td>
            <Td muted>{share && share.amount > 0 ? share.amount.toFixed(2) : ""}</Td>
          </React.Fragment>
        );
      })}
      <Td>
        <button onClick={onDelete} style={delBtnStyle} aria-label="Delete item">
          ×
        </button>
      </Td>
    </tr>
  );
}

function SettlementPanel({
  balances,
  transactions,
}: {
  balances: { personId: string; name: string; amount: number }[];
  transactions: { from: string; fromName: string; to: string; toName: string; amount: number }[];
}) {
  return (
    <section>
      <div style={tearLineStyle} aria-hidden="true" />
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          margin: "18px 0 4px",
        }}
      >
        Settle up
      </h2>
      <p style={{ color: "var(--moss)", fontSize: 13, margin: "0 0 16px" }}>
        Fewest payments needed to zero everyone out.
      </p>

      {transactions.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--moss)" }}>Everyone&rsquo;s square. Nothing to settle.</p>
      ) : (
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          {transactions.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--paper-raised)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <span style={{ fontSize: 14 }}>
                <strong>{t.fromName}</strong> pays <strong>{t.toName}</strong>
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--petrol-dark)" }}>
                ${t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <details>
        <summary style={{ fontSize: 13, color: "var(--moss)", cursor: "pointer" }}>
          Show individual balances
        </summary>
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          {balances.map((b) => (
            <div key={b.personId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{b.name}</span>
              <span style={{ fontFamily: "var(--font-mono)", color: b.amount >= 0 ? "var(--petrol-dark)" : "var(--amber)" }}>
                {b.amount >= 0 ? "+" : ""}
                {b.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

const thStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--moss)",
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid var(--line)",
  background: "var(--paper-raised)",
};

function Th({
  children,
  sticky,
  subtle,
  style,
}: {
  children?: React.ReactNode;
  sticky?: boolean;
  subtle?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{
        ...thStyle,
        ...(sticky ? { position: "sticky", left: 0, zIndex: 2 } : {}),
        ...(subtle ? { paddingTop: 0, paddingBottom: 6, borderBottom: "1px solid var(--line)" } : {}),
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  sticky,
  muted,
  style,
}: {
  children?: React.ReactNode;
  sticky?: boolean;
  muted?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "6px 8px",
        borderBottom: "1px solid var(--line)",
        background: sticky ? "var(--paper-raised)" : "transparent",
        ...(sticky ? { position: "sticky", left: 0, zIndex: 1 } : {}),
        ...(muted
          ? {
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              textAlign: "center",
              color: "var(--moss)",
            }
          : {}),
        ...style,
      }}
    >
      {children}
    </td>
  );
}

const cellInputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  padding: "6px 4px",
  borderRadius: 6,
};

const addBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "none",
  background: "var(--petrol)",
  color: "white",
  fontSize: 16,
  lineHeight: 1,
};

const delBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "transparent",
  color: "var(--moss)",
  fontSize: 14,
  lineHeight: 1,
};

const tearLineStyle: React.CSSProperties = {
  borderTop: "2px dashed var(--line)",
  position: "relative",
  marginTop: 8,
};
