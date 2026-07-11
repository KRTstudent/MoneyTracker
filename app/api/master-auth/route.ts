import { NextResponse } from "next/server";
import { createMasterToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (!process.env.MASTER_PASSWORD) {
    return NextResponse.json(
      { error: "Server isn't configured with a master password yet." },
      { status: 500 }
    );
  }

  if (password !== process.env.MASTER_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  return NextResponse.json({ token: createMasterToken() });
}
