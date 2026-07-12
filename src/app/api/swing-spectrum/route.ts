import { NextResponse } from "next/server";
import { buildSwingSpectrum } from "@/lib/market/buildPhase2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await buildSwingSpectrum();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
