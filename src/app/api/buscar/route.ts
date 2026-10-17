import { NextResponse, type NextRequest } from "next/server";

import { readDataset } from "@/lib/dataset";
import { findTicketMatches, splitQueries } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("n") ?? "";
  const queries = splitQueries(raw);

  if (queries.length === 0) {
    return NextResponse.json(
      { error: "Informe um número com 3, 4, 5 ou 6 dígitos." },
      { status: 400 },
    );
  }

  const dataset = await readDataset();
  const items = queries.flatMap((query) => findTicketMatches(dataset.concursos, query));

  return NextResponse.json(
    {
      consultas: queries,
      total: items.length,
      itens: items,
    },
    {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
