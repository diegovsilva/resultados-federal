import { formatIsoDateToPtBr } from "@/lib/date";
import type { Concurso } from "@/lib/types";

function escapeCsvCell(value: string | number) {
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

export function buildResultadosCsv(records: Concurso[]) {
  const lines = [
    [
      "concurso",
      "data",
      "premio1",
      "premio2",
      "premio3",
      "premio4",
      "premio5",
    ].join(","),
  ];

  for (const record of records) {
    lines.push(
      [
        record.numero,
        formatIsoDateToPtBr(record.data),
        record.p1,
        record.p2,
        record.p3,
        record.p4,
        record.p5,
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  }

  return `\uFEFF${lines.join("\n")}`;
}
