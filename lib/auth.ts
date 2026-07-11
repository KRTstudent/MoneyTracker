import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";

/** Create a signed token binding a session to one trip. Not a full auth system —
 *  this is intentionally lightweight, matching "just enough to keep spam out." */
export function createTripToken(tripId: string): string {
  const payload = Buffer.from(JSON.stringify({ tripId, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyTripToken(token: string | null, tripId: string): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig !== expectedSig) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    return decoded.tripId === tripId;
  } catch {
    return false;
  }
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

/** Separate, app-wide gate for creating/deleting trips (distinct from a trip's own password). */
export function createMasterToken(): string {
  const payload = Buffer.from(JSON.stringify({ scope: "master", iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyMasterToken(token: string | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig !== expectedSig) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    return decoded.scope === "master";
  } catch {
    return false;
  }
}
