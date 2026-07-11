import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBearerToken, verifyTripToken } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  if (!verifyTripToken(getBearerToken(req), id)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { description, total_amount, paid_by, shares } = await req.json();

  const update: Record<string, unknown> = {};
  if (description !== undefined) update.description = description;
  if (total_amount !== undefined) update.total_amount = total_amount;
  if (paid_by !== undefined) update.paid_by = paid_by || null;

  if (Object.keys(update).length) {
    const { error } = await supabaseAdmin
      .from("cost_items")
      .update(update)
      .eq("id", itemId)
      .eq("trip_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If shares were provided, replace the full set for this item (simplest correct approach).
  if (Array.isArray(shares)) {
    const { error: delError } = await supabaseAdmin
      .from("cost_shares")
      .delete()
      .eq("cost_item_id", itemId);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

    const shareRows = shares
      .filter((s: { person_id: string; portion: number }) => s.portion && s.portion > 0)
      .map((s: { person_id: string; portion: number }) => ({
        cost_item_id: itemId,
        person_id: s.person_id,
        portion: s.portion,
      }));

    if (shareRows.length) {
      const { error: insError } = await supabaseAdmin.from("cost_shares").insert(shareRows);
      if (insError) return NextResponse.json({ error: insError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  if (!verifyTripToken(getBearerToken(req), id)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from("cost_items").delete().eq("id", itemId).eq("trip_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
