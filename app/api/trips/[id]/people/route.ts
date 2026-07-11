import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBearerToken, verifyTripToken } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!verifyTripToken(getBearerToken(req), id)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const { count } = await supabaseAdmin
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", id);

  const { data, error } = await supabaseAdmin
    .from("people")
    .insert({ trip_id: id, name: name.trim(), sort_order: count || 0 })
    .select("id, name, sort_order")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ person: data });
}
