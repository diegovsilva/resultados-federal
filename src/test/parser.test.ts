import { describe, expect, it } from "vitest";

import { parseFederalApiResponse } from "../lib/types";

describe("parseFederalApiResponse", () => {
  it("aceita resposta válida da Caixa", () => {
    const parsed = parseFederalApiResponse({
      numero: 123,
      dataApuracao: "01/05/2024",
      dezenasSorteadasOrdemSorteio: [
        "123456",
        "234567",
        "345678",
        "456789",
        "567890",
      ],
    });

    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.numero).toBe(123);
      expect(parsed.data.data).toBe("2024-05-01");
      expect(parsed.data.p5).toBe("567890");
    }
  });

  it("rejeita prêmio vazio", () => {
    const parsed = parseFederalApiResponse({
      numero: 123,
      dataApuracao: "01/05/2024",
      dezenasSorteadasOrdemSorteio: [
        "123456",
        "",
        "345678",
        "456789",
        "567890",
      ],
    });

    expect(parsed.success).toBe(false);
  });
});
