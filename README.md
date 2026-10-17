# federal-resultados

App em Next.js 16 + TypeScript que coleta todos os resultados da Loteria Federal pela API oficial da Caixa, armazena a base consolidada em um JSON único no Vercel Blob e expõe consulta pública, busca por final de bilhete e downloads em CSV e JSON.

## Funcionalidades

- Ingestão protegida em `/api/ingest` com `Authorization: Bearer ${CRON_SECRET}`
- Descoberta do último concurso pela API da Caixa
- Retomada automática quando o tempo da função está acabando
- Processamento em lotes de 20 concursos em paralelo com retry e backoff
- Registro de pendências para nova tentativa futura
- Endpoints públicos:
  - `/api/resultados`
  - `/api/resultados.csv`
  - `/api/buscar?n=0871`
- Busca por final do bilhete aceitando 3, 4, 5 ou 6 dígitos
- Interface responsiva em português com modo claro/escuro
- Testes unitários com Vitest
- Workflow opcional de fallback no GitHub Actions para quando a Caixa bloquear Vercel

## Variáveis de ambiente

Crie um `.env.local` com base em `.env.example`:

```bash
CRON_SECRET=um-segredo-forte
BLOB_READ_WRITE_TOKEN=seu-token-do-vercel-blob
BLOB_STORE_ID=opcional
```

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Testes e lint

```bash
npm run lint
npm test
```

## Carga inicial

Quando a Caixa aceitar chamadas a partir do ambiente que estiver executando:

```bash
npm run ingest -- --loop
```

Esse comando executa a mesma lógica do endpoint `/api/ingest`, mas com um prazo maior por rodada, ideal para carga inicial local ou pelo GitHub Actions.

## Endpoint de ingestão

Exemplo de chamada manual:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://SEU-DOMINIO/api/ingest
```

Resposta típica:

```json
{
  "processed": 20,
  "imported": 19,
  "remaining": 5421,
  "finished": false
}
```

## Cron da Vercel

O arquivo `vercel.json` agenda:

- `30 1 * * 4,0`: quinta e domingo 01:30 UTC, equivalente a quarta e sábado à noite no Brasil
- `0 9 * * *`: reforço diário

## Fallback quando a Caixa bloquear a Vercel

Se a API da Caixa responder `403` ou timeout a partir da Vercel:

1. Rode `npm run ingest -- --loop` na sua máquina com `BLOB_READ_WRITE_TOKEN`
2. Ou configure os secrets `BLOB_READ_WRITE_TOKEN` e `BLOB_STORE_ID` no GitHub
3. Dispare o workflow `.github/workflows/ingest.yml`

Como o app lê tudo de um JSON único no Blob, o site continua servindo os dados normalmente mesmo que a coleta precise rodar fora da Vercel.

## Estrutura resumida

- `src/app/api/ingest/route.ts`: ingestão protegida
- `src/app/api/resultados/route.ts`: JSON paginado e download opcional
- `src/app/api/resultados.csv/route.ts`: exportação CSV com BOM UTF-8
- `src/app/api/buscar/route.ts`: busca por final do bilhete
- `src/lib/ingest.ts`: motor de ingestão e retomada
- `scripts/ingest.ts`: fallback local/GitHub Actions

## Observações

- Os prêmios são mantidos como texto de 6 dígitos para preservar zeros à esquerda
- Datas inválidas e prêmios vazios são rejeitados no parser com Zod sem derrubar a ingestão
- Pendências ficam registradas para nova tentativa nas próximas execuções
