import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBearerToken, verifyTripToken, verifyMasterToken } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!verifyTripToken(getBearerToken(req), id)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [{ data: trip }, { data: people }, { data: items }] = await Promise.all([
    supabaseAdmin.from("trips").select("id, name, created_at").eq("id", id).single(),
    supabaseAdmin.from("people").select("id, name, sort_order").eq("trip_id", id).order("sort_order"),
    supabaseAdmin
      .from("cost_items")
      .select("id, description, total_amount, paid_by, sort_order")
      .eq("trip_id", id)
      .order("sort_order"),
  ]);

  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  const itemIds = (items || []).map((i) => i.id);
  const { data: shares } = itemIds.length
    ? await supabaseAdmin
        .from("cost_shares")
        .select("id, cost_item_id, person_id, portion")
        .in("cost_item_id", itemIds)
    : { data: [] as { id: string; cost_item_id: string; person_id: string; portion: number }[] };

  const itemsWithShares = (items || []).map((item) => ({
    ...item,
    shares: (shares || []).filter((s) => s.cost_item_id === item.id),
  }));

  return NextResponse.json({ trip, people: people || [], items: itemsWithShares });
}

// Deleting a whole trip requires the master password, not just that trip's
// own password — separate, stronger protection since this is irreversible.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!verifyMasterToken(getBearerToken(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from("trips").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
