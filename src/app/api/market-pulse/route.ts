import { NextResponse } from "next/server";
import { buildMarketPulse } from "@/lib/market/buildPulse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await buildMarketPulse();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
