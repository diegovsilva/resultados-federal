import type { Concurso } from "@/lib/types";

export type ResultadoFilters = {
  numero?: number | null;
  de?: number | null;
  ate?: number | null;
  dataDe?: string | null;
  dataAte?: string | null;
};

export type Pagination = {
  page: number;
  pageSize: number;
};

export function normalizePagination(
  pageRaw: string | null,
  pageSizeRaw: string | null,
): Pagination {
  const page = Math.max(1, Number(pageRaw ?? "1") || 1);
  const requestedPageSize = Number(pageSizeRaw ?? "50") || 50;
  const pageSize = Math.min(200, Math.max(1, requestedPageSize));

  return { page, pageSize };
}

export function normalizeResultadoFilters(searchParams: URLSearchParams): ResultadoFilters {
  return {
    numero: parseOptionalInteger(searchParams.get("numero")),
    de: parseOptionalInteger(searchParams.get("de")),
    ate: parseOptionalInteger(searchParams.get("ate")),
    dataDe: searchParams.get("dataDe") || null,
    dataAte: searchParams.get("dataAte") || null,
  };
}

function parseOptionalInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function filterConcursos(records: Concurso[], filters: ResultadoFilters) {
  return records
    .filter((record) => {
      if (filters.numero && record.numero !== filters.numero) {
        return false;
      }

      if (filters.de && record.numero < filters.de) {
        return false;
      }

      if (filters.ate && record.numero > filters.ate) {
        return false;
      }

      if (filters.dataDe && record.data < filters.dataDe) {
        return false;
      }

      if (filters.dataAte && record.data > filters.dataAte) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.numero - a.numero);
}

export function paginateConcursos(
  records: Concurso[],
  pagination: Pagination,
) {
  const total = records.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / pagination.pageSize);
  const page = Math.min(pagination.page, totalPages);
  const start = (page - 1) * pagination.pageSize;

  return {
    page,
    pageSize: pagination.pageSize,
    total,
    totalPages,
    items: records.slice(start, start + pagination.pageSize),
  };
}
