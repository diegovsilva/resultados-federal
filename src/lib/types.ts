import { z } from "zod";

import { parsePtBrDate } from "@/lib/date";

const premioSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Cada prêmio deve ter 6 dígitos.");

const rawFederalApiSchema = z.object({
  numero: z.union([z.number(), z.string()]),
  dataApuracao: z.string(),
  dezenasSorteadasOrdemSorteio: z.array(z.string()).length(5),
});

export const concursoSchema = z.object({
  numero: z.number().int().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  p1: premioSchema,
  p2: premioSchema,
  p3: premioSchema,
  p4: premioSchema,
  p5: premioSchema,
  atualizadoEm: z.string().datetime(),
});

export const pendenciaSchema = z.object({
  numero: z.number().int().positive(),
  falhasConsecutivas: z.number().int().nonnegative(),
  ultimoErro: z.string(),
  atualizadoEm: z.string().datetime(),
});

export const datasetSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    atualizadoEm: z.string().datetime().nullable(),
    ultimoConcursoApi: z.number().int().positive().nullable(),
    ultimaDataApi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  }),
  concursos: z.array(concursoSchema),
  pendencias: z.array(pendenciaSchema),
});

export type Concurso = z.infer<typeof concursoSchema>;
export type Pendencia = z.infer<typeof pendenciaSchema>;
export type Dataset = z.infer<typeof datasetSchema>;

export type ParsedApiResult =
  | { success: true; data: Concurso }
  | { success: false; error: string };

export function createEmptyDataset(): Dataset {
  return {
    version: 1,
    meta: {
      atualizadoEm: null,
      ultimoConcursoApi: null,
      ultimaDataApi: null,
    },
    concursos: [],
    pendencias: [],
  };
}

export function parseFederalApiResponse(input: unknown): ParsedApiResult {
  const parsed = rawFederalApiSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  const numero =
    typeof parsed.data.numero === "string"
      ? Number(parsed.data.numero)
      : parsed.data.numero;

  if (!Number.isInteger(numero) || numero <= 0) {
    return {
      success: false,
      error: "Número do concurso inválido.",
    };
  }

  const data = parsePtBrDate(parsed.data.dataApuracao);

  if (!data) {
    return {
      success: false,
      error: "Data de apuração inválida.",
    };
  }

  const premios = parsed.data.dezenasSorteadasOrdemSorteio.map((value) =>
    value.trim(),
  );

  const premiosValidados = premios.map((premio) => premioSchema.safeParse(premio));

  if (premiosValidados.some((item) => !item.success)) {
    return {
      success: false,
      error: "Um ou mais prêmios vieram vazios ou inválidos.",
    };
  }

  return {
    success: true,
    data: {
      numero,
      data,
      p1: premios[0]!,
      p2: premios[1]!,
      p3: premios[2]!,
      p4: premios[3]!,
      p5: premios[4]!,
      atualizadoEm: new Date().toISOString(),
    },
  };
}
