import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createTripToken } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { password } = await req.json();

  const { data: trip, error } = await supabaseAdmin
    .from("trips")
    .select("id, name, password_hash")
    .eq("id", id)
    .single();

  if (error || !trip) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  const ok = await bcrypt.compare(password || "", trip.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = createTripToken(trip.id);
  return NextResponse.json({ token, tripName: trip.name });
}
