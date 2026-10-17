import type { Concurso } from "@/lib/types";

const prizeKeys = ["p1", "p2", "p3", "p4", "p5"] as const;

export type BilheteMatch = {
  consulta: string;
  concurso: number;
  data: string;
  premio: 1 | 2 | 3 | 4 | 5;
  bilhete: string;
};

export function normalizeTicketSuffix(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 3 || digits.length > 6) {
    return null;
  }

  return digits;
}

export function splitQueries(value: string) {
  return value
    .split(",")
    .map((item) => normalizeTicketSuffix(item))
    .filter((item): item is string => Boolean(item));
}

export function findTicketMatches(
  records: Concurso[],
  query: string,
): BilheteMatch[] {
  const normalized = normalizeTicketSuffix(query);

  if (!normalized) {
    return [];
  }

  const matches: BilheteMatch[] = [];

  for (const record of records) {
    for (const [index, key] of prizeKeys.entries()) {
      const bilhete = record[key];

      if (bilhete.endsWith(normalized)) {
        matches.push({
          consulta: normalized,
          concurso: record.numero,
          data: record.data,
          premio: (index + 1) as 1 | 2 | 3 | 4 | 5,
          bilhete,
        });
      }
    }
  }

  return matches.sort((a, b) => b.concurso - a.concurso);
}

export type PrizeRankingItem = {
  premio: 1 | 2 | 3 | 4 | 5;
  total: number;
};

export function rankByPrize(
  matches: BilheteMatch[],
  consulta: string,
): PrizeRankingItem[] {
  const counts = new Map<number, number>();

  for (const match of matches) {
    if (match.consulta !== consulta) {
      continue;
    }

    counts.set(match.premio, (counts.get(match.premio) ?? 0) + 1);
  }

  return ([1, 2, 3, 4, 5] as const)
    .map((premio) => ({ premio, total: counts.get(premio) ?? 0 }))
    .sort((a, b) => b.total - a.total || a.premio - b.premio);
}
