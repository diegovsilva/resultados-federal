import { describe, expect, it } from "vitest";

import { findTicketMatches } from "../lib/search";
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
