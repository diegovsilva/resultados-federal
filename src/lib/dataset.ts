import { get, put } from "@vercel/blob";

import type { Concurso, Dataset, Pendencia } from "@/lib/types";
import { createEmptyDataset, datasetSchema } from "@/lib/types";

const DATASET_PATH = "federal-resultados/dataset.json";

async function readBlobText(pathname: string) {
  const blob = await get(pathname, {
    access: "public",
    useCache: false,
  });

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return null;
  }

  return await new Response(blob.stream).text();
}

export async function readDataset(): Promise<Dataset> {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
    return createEmptyDataset();
  }

  const raw = await readBlobText(DATASET_PATH);

  if (!raw) {
    return createEmptyDataset();
  }

  try {
    const parsed = datasetSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : createEmptyDataset();
  } catch {
    return createEmptyDataset();
  }
}

export async function writeDataset(dataset: Dataset) {
  await put(DATASET_PATH, JSON.stringify(dataset, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 60,
  });
}

export function mergeConcursos(
  current: Concurso[],
  incoming: Concurso[],
): Concurso[] {
  const map = new Map<number, Concurso>();

  for (const item of current) {
    map.set(item.numero, item);
  }

  for (const item of incoming) {
    map.set(item.numero, item);
  }

  return [...map.values()].sort((a, b) => a.numero - b.numero);
}

export function mergePendencias(
  current: Pendencia[],
  updates: Pendencia[],
): Pendencia[] {
  const map = new Map<number, Pendencia>();

  for (const item of current) {
    map.set(item.numero, item);
  }

  for (const item of updates) {
    map.set(item.numero, item);
  }

  return [...map.values()].sort((a, b) => a.numero - b.numero);
}

export function removePendencias(
  current: Pendencia[],
  numeros: number[],
): Pendencia[] {
  const blocked = new Set(numeros);
  return current.filter((item) => !blocked.has(item.numero));
}

export function getLatestStoredContest(dataset: Dataset) {
  return dataset.concursos.at(-1)?.numero ?? 0;
}

export function getLatestStoredDate(dataset: Dataset) {
  return dataset.concursos.at(-1)?.data ?? null;
}

export function getDatasetSummary(dataset: Dataset) {
  const latestStoredContest = getLatestStoredContest(dataset);
  const latestStoredDate = getLatestStoredDate(dataset);

  return {
    total: dataset.concursos.length,
    ultimoConcurso:
      dataset.meta.ultimoConcursoApi ??
      (latestStoredContest > 0 ? latestStoredContest : null),
    ultimaData: dataset.meta.ultimaDataApi ?? latestStoredDate ?? null,
    atualizadoEm: dataset.meta.atualizadoEm,
    pendencias: dataset.pendencias,
  };
}
