"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Trip = { id: string; name: string; created_at: string };

const MASTER_TOKEN_KEY = "tally_master_token";

export default function HomePage() {
  const [trips, setTrips] = useState<Trip[] | null>(null);

  const [masterToken, setMasterToken] = useState<string | null>(null);
  const [showUnlock, setShowUnlock] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState("");
  const [masterError, setMasterError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((d) => setTrips(d.trips || []));

    setMasterToken(localStorage.getItem(MASTER_TOKEN_KEY));
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setMasterError("");
    setUnlocking(true);
    try {
      const res = await fetch("/api/master-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: masterPasswordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMasterError(data.error || "Incorrect password.");
        return;
      }
      localStorage.setItem(MASTER_TOKEN_KEY, data.token);
      setMasterToken(data.token);
      setShowUnlock(false);
      setMasterPasswordInput("");
    } finally {
      setUnlocking(false);
    }
  }

  function lock() {
    localStorage.removeItem(MASTER_TOKEN_KEY);
    setMasterToken(null);
    setShowCreate(false);
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!masterToken) return;
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${masterToken}` },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      window.location.href = `/trip/${data.trip.id}`;
    } finally {
      setCreating(false);
    }
  }

  async function deleteTrip(trip: Trip) {
    if (!masterToken) return;
    if (!window.confirm(`Delete "${trip.name}"? This removes all its items and can't be undone.`)) return;

    setDeletingId(trip.id);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${masterToken}` },
      });
      if (res.ok) {
        setTrips((t) => (t ? t.filter((x) => x.id !== trip.id) : t));
      } else {
        const data = await res.json();
        alert(data.error || "Couldn't delete that trip.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
      <header style={{ marginBottom: 32 }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--moss)",
            margin: "0 0 6px",
          }}
        >
          Shared ledger
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 40,
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          Tally
        </h1>
        <p style={{ color: "var(--moss)", marginTop: 10, fontSize: 15, lineHeight: 1.5 }}>
          One ledger per trip. Log what got paid, split it by whatever unit makes sense, and settle
          up in as few payments as possible.
        </p>
      </header>

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 14,
            gap: 10,
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0 }}>Your trips</h2>

          {masterToken ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowCreate((v) => !v)} style={primaryBtnStyle}>
                {showCreate ? "Cancel" : "New trip"}
              </button>
              <button onClick={lock} style={ghostSmallBtnStyle} title="Lock creator tools">
                Lock
              </button>
            </div>
          ) : (
            <button onClick={() => setShowUnlock((v) => !v)} style={ghostSmallBtnStyle}>
              {showUnlock ? "Cancel" : "Creator access"}
            </button>
          )}
        </div>

        {!masterToken && showUnlock && (
          <form onSubmit={unlock} style={cardFormStyle}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Creator password
              <input
                autoFocus
                value={masterPasswordInput}
                onChange={(e) => setMasterPasswordInput(e.target.value)}
                type="password"
                placeholder="Master password"
                required
                style={inputStyle}
              />
            </label>
            {masterError && <p style={{ color: "#a33", fontSize: 13, margin: 0 }}>{masterError}</p>}
            <button type="submit" disabled={unlocking} style={darkBtnStyle}>
              {unlocking ? "Checking…" : "Unlock"}
            </button>
          </form>
        )}

        {masterToken && showCreate && (
          <form onSubmit={createTrip} style={cardFormStyle}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Trip name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ohana Family Reunion, 2027"
                required
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Password (share this with your trip group)
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="text"
                placeholder="at least 4 characters"
                required
                style={inputStyle}
              />
            </label>
            {error && <p style={{ color: "#a33", fontSize: 13, margin: 0 }}>{error}</p>}
            <button type="submit" disabled={creating} style={darkBtnStyle}>
              {creating ? "Creating…" : "Create trip"}
            </button>
          </form>
        )}

        {trips === null && <p style={{ color: "var(--moss)" }}>Loading…</p>}
        {trips && trips.length === 0 && !showCreate && (
          <p style={{ color: "var(--moss)", fontSize: 14 }}>
            No trips yet.{masterToken ? " Create one to get started." : " Ask whoever set this up to add one."}
          </p>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {trips?.map((trip) => (
            <li key={trip.id} style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
              <Link
                href={`/trip/${trip.id}`}
                style={{
                  flex: 1,
                  display: "block",
                  background: "var(--paper-raised)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  textDecoration: "none",
                  color: "var(--ink)",
                  fontWeight: 600,
                }}
              >
                {trip.name}
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 400,
                    fontSize: 12,
                    color: "var(--moss)",
                    marginTop: 4,
                  }}
                >
                  Created {new Date(trip.created_at).toLocaleDateString()}
                </span>
              </Link>
              {masterToken && (
                <button
                  onClick={() => deleteTrip(trip)}
                  disabled={deletingId === trip.id}
                  aria-label={`Delete ${trip.name}`}
                  style={deleteBtnStyle}
                >
                  {deletingId === trip.id ? "…" : "Delete"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 15,
};

const cardFormStyle: React.CSSProperties = {
  background: "var(--paper-raised)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 18,
  marginBottom: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--petrol)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 14,
  fontWeight: 600,
};

const darkBtnStyle: React.CSSProperties = {
  background: "var(--ink)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "10px 14px",
  fontWeight: 600,
  fontSize: 14,
};

const ghostSmallBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  color: "var(--moss)",
  fontWeight: 600,
};

const deleteBtnStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--paper-raised)",
  color: "var(--amber)",
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 600,
};
