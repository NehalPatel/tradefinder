import { NextResponse } from "next/server";
import { buildOptionClock } from "@/lib/market/buildPhase3";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const u = searchParams.get("underlying");
  const underlying = u === "bank" ? "^NSEBANK" : "^NSEI";
  const data = await buildOptionClock(underlying);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
