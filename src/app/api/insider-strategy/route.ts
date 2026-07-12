import { NextResponse } from "next/server";
import { buildInsiderStrategy } from "@/lib/market/buildPhase2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await buildInsiderStrategy();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
