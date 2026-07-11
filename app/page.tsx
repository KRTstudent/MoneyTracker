"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Trip = { id: string; name: string; created_at: string };

export default function HomePage() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((d) => setTrips(d.trips || []));
  }, []);

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0 }}>Your trips</h2>
          <button
            onClick={() => setShowCreate((v) => !v)}
            style={{
              background: "var(--petrol)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {showCreate ? "Cancel" : "New trip"}
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={createTrip}
            style={{
              background: "var(--paper-raised)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 18,
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
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
            <button
              type="submit"
              disabled={creating}
              style={{
                background: "var(--ink)",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 14px",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {creating ? "Creating…" : "Create trip"}
            </button>
          </form>
        )}

        {trips === null && <p style={{ color: "var(--moss)" }}>Loading…</p>}
        {trips && trips.length === 0 && !showCreate && (
          <p style={{ color: "var(--moss)", fontSize: 14 }}>
            No trips yet. Create one to get started.
          </p>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {trips?.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trip/${trip.id}`}
                style={{
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
