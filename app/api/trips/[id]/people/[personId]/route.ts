import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBearerToken, verifyTripToken } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  const { id, personId } = await params;
  if (!verifyTripToken(getBearerToken(req), id)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { name } = await req.json();
  const { error } = await supabaseAdmin
    .from("people")
    .update({ name })
    .eq("id", personId)
    .eq("trip_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  const { id, personId } = await params;
  if (!verifyTripToken(getBearerToken(req), id)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from("people").delete().eq("id", personId).eq("trip_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
