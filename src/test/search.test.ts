import { describe, expect, it } from "vitest";

import { findTicketMatches, rankByPrize } from "../lib/search";
import type { Concurso } from "../lib/types";

const concursos: Concurso[] = [
  {
    numero: 10,
    data: "2024-01-01",
    p1: "120871",
    p2: "222222",
    p3: "330871",
    p4: "444444",
    p5: "555555",
    atualizadoEm: "2024-01-02T00:00:00.000Z",
  },
];

describe("findTicketMatches", () => {
  it("localiza correspondência por final de 3 dígitos", () => {
    const result = findTicketMatches(concursos, "871");
    expect(result).toHaveLength(2);
    expect(result[0]?.premio).toBe(1);
    expect(result[1]?.premio).toBe(3);
  });

  it("rejeita busca com menos de 3 dígitos", () => {
    expect(findTicketMatches(concursos, "71")).toHaveLength(0);
  });

  it("localiza correspondência por final de 4 dígitos", () => {
    const result = findTicketMatches(concursos, "0871");
    expect(result).toHaveLength(2);
    expect(result[0]?.premio).toBe(1);
    expect(result[1]?.premio).toBe(3);
  });

  it("aceita final completo de 6 dígitos", () => {
    const result = findTicketMatches(concursos, "120871");
    expect(result).toHaveLength(1);
    expect(result[0]?.bilhete).toBe("120871");
  });
});

describe("rankByPrize", () => {
  const historico: Concurso[] = [
    ...concursos,
    {
      numero: 11,
      data: "2024-01-08",
      p1: "999871",
      p2: "111871",
      p3: "222222",
      p4: "333333",
      p5: "444444",
      atualizadoEm: "2024-01-09T00:00:00.000Z",
    },
  ];

  it("conta ocorrências por posição e ranqueia do mais frequente ao menos", () => {
    const matches = findTicketMatches(historico, "871");
    const ranking = rankByPrize(matches, "871");

    expect(ranking).toHaveLength(5);
    expect(ranking[0]).toEqual({ premio: 1, total: 2 });
    expect(ranking[1]).toEqual({ premio: 2, total: 1 });
    expect(ranking[2]).toEqual({ premio: 3, total: 1 });
    expect(ranking.reduce((acc, item) => acc + item.total, 0)).toBe(4);
  });

  it("inclui posições sem ocorrência, desempatadas pelo número do prêmio", () => {
    const matches = findTicketMatches(historico, "871");
    const ranking = rankByPrize(matches, "871");

    expect(ranking[3]).toEqual({ premio: 4, total: 0 });
    expect(ranking[4]).toEqual({ premio: 5, total: 0 });
  });

  it("ignora correspondências de outras consultas", () => {
    const matches = findTicketMatches(historico, "871");
    const ranking = rankByPrize(matches, "222");

    expect(ranking.every((item) => item.total === 0)).toBe(true);
  });
});
