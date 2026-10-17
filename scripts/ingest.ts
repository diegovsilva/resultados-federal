import { runIngest } from "../src/lib/ingest";

const shouldLoop = process.argv.includes("--loop");

async function main() {
  let rounds = 0;

  do {
    rounds += 1;
    const result = await runIngest({ deadlineMs: 10 * 60_000, persist: true });

    console.log(
      JSON.stringify(
        {
          rodada: rounds,
          ...result,
        },
        null,
        2,
      ),
    );

    if (!shouldLoop || result.finished) {
      break;
    }
  } while (true);
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Falha inesperada na carga inicial.",
  );
  process.exitCode = 1;
});
