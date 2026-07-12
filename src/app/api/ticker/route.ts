import { NextResponse } from "next/server";
import { fetchGlobalTicker } from "@/lib/market/yahoo";
import { formatISTDateTime } from "@/lib/market/ist";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const items = await fetchGlobalTicker();
  return NextResponse.json(
    { asOf: formatISTDateTime(), items },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
