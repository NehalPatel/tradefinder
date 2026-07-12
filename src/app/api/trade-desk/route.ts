import { NextResponse } from "next/server";
import { buildTradeDesk } from "@/lib/market/buildTradeDesk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await buildTradeDesk();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
