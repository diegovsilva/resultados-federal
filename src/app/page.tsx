import { HomePage } from "@/components/home-page";
import { getDatasetSummary, readDataset } from "@/lib/dataset";

export const revalidate = 3600;

export default async function Home() {
  const dataset = await readDataset();
  const items = [...dataset.concursos].sort((a, b) => b.numero - a.numero).slice(0, 50);
  const summary = getDatasetSummary(dataset);

  return (
    <HomePage
      atualizadoEm={summary.atualizadoEm}
      initialItems={items}
      initialPagination={{
        page: 1,
        pageSize: 50,
        total: dataset.concursos.length,
        totalPages: Math.max(1, Math.ceil(dataset.concursos.length / 50)),
      }}
      pendencias={summary.pendencias}
      ultimaData={summary.ultimaData}
      ultimoConcurso={summary.ultimoConcurso}
    />
  );
}
