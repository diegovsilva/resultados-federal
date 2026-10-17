import { NextResponse, type NextRequest } from "next/server";

import { filterConcursos, normalizePagination, normalizeResultadoFilters } from "@/lib/filters";
import { readDataset } from "@/lib/dataset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const dataset = await readDataset();
  const filters = normalizeResultadoFilters(request.nextUrl.searchParams);
  const records = filterConcursos(dataset.concursos, filters);
  const shouldDownload = request.nextUrl.searchParams.get("download") === "1";

  if (shouldDownload) {
    return new Response(JSON.stringify(records, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="federal-resultados.json"',
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  const pagination = normalizePagination(
    request.nextUrl.searchParams.get("page"),
    request.nextUrl.searchParams.get("pageSize"),
  );
  const total = records.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / pagination.pageSize);
  const page = Math.min(pagination.page, totalPages);
  const start = (page - 1) * pagination.pageSize;
  const items = records.slice(start, start + pagination.pageSize);

  return NextResponse.json(
    {
      filtros: filters,
      paginacao: {
        page,
        pageSize: pagination.pageSize,
        total,
        totalPages,
      },
      meta: dataset.meta,
      itens: items,
    },
    {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
