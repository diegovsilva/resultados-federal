import { describe, expect, it } from "vitest";

import { parsePtBrDate } from "../lib/date";

describe("parsePtBrDate", () => {
  it("converte data válida para ISO", () => {
    expect(parsePtBrDate("15/09/1962")).toBe("1962-09-15");
  });

  it("rejeita datas impossíveis", () => {
    expect(parsePtBrDate("31/02/2024")).toBeNull();
  });
});
