import type { NextRequest } from "next/server";

import { buildResultadosCsv } from "@/lib/csv";
import { readDataset } from "@/lib/dataset";
import { filterConcursos, normalizeResultadoFilters } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const dataset = await readDataset();
  const filters = normalizeResultadoFilters(request.nextUrl.searchParams);
  const records = filterConcursos(dataset.concursos, filters);
  const csv = buildResultadosCsv(records);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="federal-resultados.csv"',
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
