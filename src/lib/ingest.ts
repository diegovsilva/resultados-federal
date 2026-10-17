import { fetchContestWithRetry, fetchLatestContestNumber } from "@/lib/caixa";
import {
  getLatestStoredContest,
  mergeConcursos,
  mergePendencias,
  readDataset,
  removePendencias,
  writeDataset,
} from "@/lib/dataset";
import type { Concurso, Pendencia } from "@/lib/types";

const BATCH_SIZE = 20;
const MIN_TIME_LEFT_MS = 4_000;

export type IngestOptions = {
  deadlineMs?: number;
  persist?: boolean;
};

export async function runIngest(options: IngestOptions = {}) {
  const startedAt = Date.now();
  const deadline = startedAt + (options.deadlineMs ?? 45_000);
  const persist = options.persist ?? true;
  const dataset = await readDataset();
  const latestFromApi = await fetchLatestContestNumber();
  const latestStored = getLatestStoredContest(dataset);

  const existingNumbers = new Set(dataset.concursos.map((item) => item.numero));
  const queue = [
    ...new Set([
      ...dataset.pendencias.map((item) => item.numero),
      ...buildMissingContestNumbers(existingNumbers, latestFromApi.numero),
    ]),
  ].sort((a, b) => a - b);

  const imported: Concurso[] = [];
  const pendingUpdates: Pendencia[] = [];
  const resolvedPending: number[] = [];
  let processed = 0;
  let cursor = 0;

  while (cursor < queue.length && Date.now() < deadline - MIN_TIME_LEFT_MS) {
    const batch = queue.slice(cursor, cursor + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (numero) => ({
        numero,
        result: await fetchContestWithRetry(numero, 4),
      })),
    );

    for (const item of results) {
      processed += 1;

      if (item.result.success) {
        imported.push(item.result.data);
        resolvedPending.push(item.numero);
        continue;
      }

      const previousFailures =
        dataset.pendencias.find((pendencia) => pendencia.numero === item.numero)
          ?.falhasConsecutivas ?? 0;

      pendingUpdates.push({
        numero: item.numero,
        falhasConsecutivas: previousFailures + 1,
        ultimoErro: item.result.error,
        atualizadoEm: new Date().toISOString(),
      });
    }

    cursor += BATCH_SIZE;
  }

  const concursos = mergeConcursos(dataset.concursos, imported);
  const pendenciasSemResolvidas = removePendencias(dataset.pendencias, resolvedPending);
  const untouchedPendingNumbers = new Set(pendingUpdates.map((item) => item.numero));
  const preservedPendencias = pendenciasSemResolvidas.filter(
    (item) => !untouchedPendingNumbers.has(item.numero),
  );

  const nextDataset = {
    version: 1 as const,
    meta: {
      atualizadoEm: new Date().toISOString(),
      ultimoConcursoApi: latestFromApi.numero,
      ultimaDataApi: latestFromApi.data,
    },
    concursos,
    pendencias: mergePendencias(preservedPendencias, pendingUpdates),
  };

  if (persist) {
    await writeDataset(nextDataset);
  }

  return {
    processed,
    imported: imported.length,
    latestStoredBeforeRun: latestStored,
    latestContestFromApi: latestFromApi.numero,
    remaining: queue.length - cursor,
    totalStored: nextDataset.concursos.length,
    pending: nextDataset.pendencias,
    finished: cursor >= queue.length,
    updatedAt: nextDataset.meta.atualizadoEm,
  };
}

function buildMissingContestNumbers(existing: Set<number>, latest: number) {
  const numbers: number[] = [];

  for (let numero = 1; numero <= latest; numero += 1) {
    if (!existing.has(numero)) {
      numbers.push(numero);
    }
  }

  return numbers;
}
