import { NextResponse } from "next/server";
import { buildOptionApex } from "@/lib/market/buildPhase3";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await buildOptionApex();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
