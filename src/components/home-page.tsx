"use client";

import { useEffect, useMemo, useState } from "react";

import { formatIsoDateToPtBr, formatTimestampToPtBr } from "@/lib/date";
import { rankByPrize, splitQueries } from "@/lib/search";
import type { Concurso, Pendencia } from "@/lib/types";
import styles from "@/app/page.module.css";

type ResultadosResponse = {
  itens: Concurso[];
  paginacao: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type BuscaItem = {
  consulta: string;
  concurso: number;
  data: string;
  premio: 1 | 2 | 3 | 4 | 5;
  bilhete: string;
};

type HomePageProps = {
  initialItems: Concurso[];
  initialPagination: ResultadosResponse["paginacao"];
  ultimoConcurso: number | null;
  ultimaData: string | null;
  atualizadoEm: string | null;
  pendencias: Pendencia[];
};

type ThemeMode = "light" | "dark";

export function HomePage(props: HomePageProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const stored = window.localStorage.getItem("theme-mode");

    if (stored === "light" || stored === "dark") {
      return stored;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(props.initialItems);
  const [pagination, setPagination] = useState(props.initialPagination);
  const [searchValue, setSearchValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<BuscaItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme-mode", theme);
  }, [theme]);

  useEffect(() => {
    if (!summaryOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSummaryOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [summaryOpen]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (de) {
      params.set("de", de);
    }

    if (ate) {
      params.set("ate", ate);
    }

    if (dataDe) {
      params.set("dataDe", dataDe);
    }

    if (dataAte) {
      params.set("dataAte", dataAte);
    }

    params.set("page", String(page));
    params.set("pageSize", "50");

    return params.toString();
  }, [ate, dataAte, dataDe, de, page]);

  const downloadQueryString = useMemo(() => {
    const params = new URLSearchParams();

    if (de) {
      params.set("de", de);
    }

    if (ate) {
      params.set("ate", ate);
    }

    if (dataDe) {
      params.set("dataDe", dataDe);
    }

    if (dataAte) {
      params.set("dataAte", dataAte);
    }

    return params.toString();
  }, [ate, dataAte, dataDe, de]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const response = await fetch(`/api/resultados?${queryString}`);
        const data = (await response.json()) as ResultadosResponse;

        if (!active) {
          return;
        }

        setItems(data.itens);
        setPagination(data.paginacao);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [queryString]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const terms = splitQueries(searchValue);

    if (terms.length === 0) {
      setSearchError("Informe ao menos um número com 3, 4, 5 ou 6 dígitos.");
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams({ n: terms.join(",") });
      const response = await fetch(`/api/buscar?${params.toString()}`);
      const data = (await response.json()) as { itens?: BuscaItem[]; error?: string };

      if (!response.ok) {
        setSearchError(data.error ?? "Não foi possível consultar a busca.");
        setSearchResults([]);
        return;
      }

      setSearchResults(data.itens ?? []);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
  }

  function clearFilters() {
    setDe("");
    setAte("");
    setDataDe("");
    setDataAte("");
    setPage(1);
  }

  const csvUrl = `/api/resultados.csv${downloadQueryString ? `?${downloadQueryString}` : ""}`;
  const jsonUrl = `/api/resultados${downloadQueryString ? `?${downloadQueryString}&` : "?"}download=1`;

  const searchSummary = useMemo(() => {
    const consultas = [...new Set(searchResults.map((item) => item.consulta))];

    return consultas.map((consulta) => ({
      consulta,
      total: searchResults.filter((item) => item.consulta === consulta).length,
      ranking: rankByPrize(searchResults, consulta),
    }));
  }, [searchResults]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Loteria Federal</p>
            <h1>Resultados oficiais da Caixa para consulta e download</h1>
            <p className={styles.heroText}>
              Base consolidada em JSON único, busca por final do bilhete e exportação
              pronta em CSV e JSON.
            </p>
          </div>
          <button
            className={styles.themeToggle}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            type="button"
          >
            {theme === "dark" ? "Modo claro" : "Modo escuro"}
          </button>
        </section>

        <section className={styles.summaryGrid}>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Último concurso</span>
            <strong>{props.ultimoConcurso ?? "-"}</strong>
            <span>{formatIsoDateToPtBr(props.ultimaData)}</span>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Última atualização</span>
            <strong>{formatTimestampToPtBr(props.atualizadoEm)}</strong>
            <span>{props.pendencias.length} pendências registradas</span>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Downloads</span>
            <div className={styles.inlineActions}>
              <a className={styles.primaryButton} href={csvUrl}>
                Baixar CSV
              </a>
              <a className={styles.secondaryButton} href={jsonUrl}>
                Baixar JSON
              </a>
            </div>
          </article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Filtrar resultados</h2>
              <p>Use intervalo de concursos ou datas para paginar a tabela.</p>
            </div>
          </div>

          <form className={styles.formGrid} onSubmit={handleFilterSubmit}>
            <label>
              Concurso de
              <input onChange={(event) => setDe(event.target.value)} value={de} />
            </label>
            <label>
              Concurso até
              <input onChange={(event) => setAte(event.target.value)} value={ate} />
            </label>
            <label>
              Data de
              <input
                onChange={(event) => setDataDe(event.target.value)}
                type="date"
                value={dataDe}
              />
            </label>
            <label>
              Data até
              <input
                onChange={(event) => setDataAte(event.target.value)}
                type="date"
                value={dataAte}
              />
            </label>
            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit">
                Aplicar filtros
              </button>
              <button className={styles.secondaryButton} onClick={clearFilters} type="button">
                Limpar
              </button>
            </div>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Buscar final do bilhete</h2>
              <p>Digite vários números separados por vírgula. Aceita 3, 4, 5 ou 6 dígitos.</p>
            </div>
          </div>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <input
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Ex.: 871, 0871, 54321, 000123"
              value={searchValue}
            />
            <button className={styles.primaryButton} disabled={searchLoading} type="submit">
              {searchLoading ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {searchError ? <p className={styles.errorText}>{searchError}</p> : null}

          <div className={styles.searchResults}>
            {searchResults.length === 0 ? (
              <p>Nenhuma busca executada ainda ou nenhum resultado encontrado.</p>
            ) : (
              <>
                <div className={styles.inlineActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setSummaryOpen(true)}
                    type="button"
                  >
                    Resumo por prêmio
                  </button>
                </div>
                <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Consulta</th>
                    <th>Concurso</th>
                    <th>Data</th>
                    <th>Prêmio</th>
                    <th>Bilhete</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((item) => (
                    <tr key={`${item.consulta}-${item.concurso}-${item.premio}-${item.bilhete}`}>
                      <td>{item.consulta}</td>
                      <td>{item.concurso}</td>
                      <td>{formatIsoDateToPtBr(item.data)}</td>
                      <td>{item.premio}º</td>
                      <td>{item.bilhete}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Resultados</h2>
              <p>
                {loading
                  ? "Atualizando a tabela..."
                  : `${pagination.total} concursos encontrados.`}
              </p>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Concurso</th>
                  <th>Data</th>
                  <th>1º prêmio</th>
                  <th>2º prêmio</th>
                  <th>3º prêmio</th>
                  <th>4º prêmio</th>
                  <th>5º prêmio</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.numero}>
                    <td>{item.numero}</td>
                    <td>{formatIsoDateToPtBr(item.data)}</td>
                    <td>{item.p1}</td>
                    <td>{item.p2}</td>
                    <td>{item.p3}</td>
                    <td>{item.p4}</td>
                    <td>{item.p5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.secondaryButton}
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Anterior
            </button>
            <span>
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button
              className={styles.secondaryButton}
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(pagination.totalPages, current + 1))
              }
              type="button"
            >
              Próxima
            </button>
          </div>
        </section>

        {props.pendencias.length > 0 ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Pendências de ingestão</h2>
                <p>Os concursos abaixo serão tentados novamente nas próximas execuções.</p>
              </div>
            </div>

            <ul className={styles.pendingList}>
              {props.pendencias.slice(0, 25).map((item) => (
                <li key={item.numero}>
                  Concurso {item.numero}: {item.ultimoErro}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      {summaryOpen ? (
        <div className={styles.modalOverlay} onClick={() => setSummaryOpen(false)}>
          <div
            aria-label="Resumo da busca por posição de prêmio"
            aria-modal="true"
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2>Resumo por posição de prêmio</h2>
                <p>
                  Quantas vezes cada final apareceu em cada posição, ranqueado da
                  mais frequente para a menos frequente.
                </p>
              </div>
              <button
                aria-label="Fechar resumo"
                className={styles.modalClose}
                onClick={() => setSummaryOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            {searchSummary.map((group) => (
              <section className={styles.modalGroup} key={group.consulta}>
                <h3>
                  Final {group.consulta} — {group.total} ocorrências
                </h3>
                <table className={`${styles.table} ${styles.modalTable}`}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Posição</th>
                      <th>Ocorrências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.ranking.map((row, index) => (
                      <tr key={row.premio}>
                        <td>{index + 1}º</td>
                        <td>{row.premio}º prêmio</td>
                        <td>
                          {row.total}× no {row.premio}º sorteio
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
