import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBearerToken, verifyTripToken } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!verifyTripToken(getBearerToken(req), id)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { description, total_amount, paid_by, shares } = await req.json();

  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }
  if (typeof total_amount !== "number" || total_amount < 0) {
    return NextResponse.json({ error: "Total amount must be a positive number." }, { status: 400 });
  }

  const { count } = await supabaseAdmin
    .from("cost_items")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", id);

  const { data: item, error } = await supabaseAdmin
    .from("cost_items")
    .insert({
      trip_id: id,
      description: description.trim(),
      total_amount,
      paid_by: paid_by || null,
      sort_order: count || 0,
    })
    .select("id, description, total_amount, paid_by, sort_order")
    .single();

  if (error || !item) return NextResponse.json({ error: error?.message }, { status: 500 });

  const shareRows = (shares || [])
    .filter((s: { person_id: string; portion: number }) => s.portion && s.portion > 0)
    .map((s: { person_id: string; portion: number }) => ({
      cost_item_id: item.id,
      person_id: s.person_id,
      portion: s.portion,
    }));

  if (shareRows.length) {
    const { error: shareError } = await supabaseAdmin.from("cost_shares").insert(shareRows);
    if (shareError) return NextResponse.json({ error: shareError.message }, { status: 500 });
  }

  return NextResponse.json({ item: { ...item, shares: shareRows } });
}
