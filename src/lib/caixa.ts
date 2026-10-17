import type { Concurso } from "@/lib/types";
import { parseFederalApiResponse } from "@/lib/types";

const BASE_URL = "https://servicebus2.caixa.gov.br/portaldeloterias/api/federal";
const REQUEST_HEADERS = {
  accept: "application/json",
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

type FetchContestResult =
  | { success: true; data: Concurso }
  | { success: false; error: string; status?: number };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(pathname: string) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: REQUEST_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      body: text,
    };
  }

  try {
    return {
      ok: true as const,
      data: JSON.parse(text),
    };
  } catch {
    return {
      ok: false as const,
      status: response.status,
      body: "A Caixa retornou uma resposta que não é JSON.",
    };
  }
}

export async function fetchLatestContestNumber() {
  const response = await fetchJson("");

  if (!response.ok) {
    throw new Error(
      `Não foi possível descobrir o último concurso na Caixa (${response.status ?? "sem status"}).`,
    );
  }

  const parsed = parseFederalApiResponse(response.data);

  if (!parsed.success) {
    throw new Error(`Último concurso inválido: ${parsed.error}`);
  }

  return parsed.data;
}

export async function fetchContestWithRetry(
  concurso: number,
  maxAttempts = 4,
): Promise<FetchContestResult> {
  let lastError = "Erro desconhecido.";
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchJson(`/${concurso}`);

      if (!response.ok) {
        lastStatus = response.status;
        lastError = `HTTP ${response.status}`;
      } else {
        const parsed = parseFederalApiResponse(response.data);

        if (parsed.success) {
          return {
            success: true,
            data: parsed.data,
          };
        }

        lastError = parsed.error;
      }
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Falha desconhecida ao consultar a Caixa.";
    }

    if (attempt < maxAttempts) {
      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  return {
    success: false,
    error: lastError,
    status: lastStatus,
  };
}
