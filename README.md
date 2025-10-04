# I.G.N.I.S. — Edge server for Pico AI classification data

> **See the fire before it spreads...**
> Tiny HTTP server that receives AI classification results from a Pico W / Pico 2W microcontroller and exposes the latest value and a short history of values for the monitoring service of the I.G.N.I.S. project (Inteligência para Gerenciamento e Neutralização de Incêndios Sistematizada).

---

## Overview

This repository contains a minimal Node.js server designed to run with **Bun** and **Elysia**. Limited support for other package managers is included due to the implementation details of `@elysiajs/cors`.

It provides:

- A `GET` ingestion endpoint for microcontrollers to submit AI classification results (`class`, `confidence`, `fire_score`, `nofire_score`).
- An endpoint that returns the latest reading at `/pico_data/latest` and a rolling history (up to 100 readings) at `/pico_data/history`.
- A plain `"ACK"` response for successful ingestion.

The server is intentionally small and intended as an edge-friendly ingestion point and proof-of-concept for the **I.G.N.I.S.** project.

---

## Quick start

1. Install dependencies:

```bash
bun install
# or
npm install
# or
yarn
```

2. Run:

```bash
bun run dev
# or
node src/index.js
# or
npm start
```

Default host/port in the code:

- Hostname: `0.0.0.0`
- Port: `3000`

You should see at startup something like:

```
IGNIS server is running at http://0.0.0.0:3000
```

---

## API (endpoints)

- `GET /`
  Returns a short landing string.

- `GET /pico_data?class=<class>&confidence=<conf>&fire_score=<f>&nofire_score=<nf>`
  Ingest endpoint. All query params are optional but recommended. The server logs the received values and returns `"ACK"`.

- `GET /pico_data/latest`
  Returns the last ingested JSON object (or `{}` if none have been received).

- `GET /pico_data/history`
  Returns an array of recent readings (oldest first, max 100 entries).

Each stored reading has this structure (JSON):

```json
{
	"timestamp": 1690000000000,
	"class": "Fire",
	"confidence": 0.92,
	"fire_score": 0.95,
	"nofire_score": 0.05
}
```

`timestamp` is `Date.now()` in milliseconds (ms since epoch).

---

## Example `curl` commands (testing)

Ingest (strong fire detection):

```bash
curl "http://localhost:3000/pico_data?class=Fire&confidence=0.92&fire_score=0.95&nofire_score=0.05"
# => ACK
```

Get latest:

```bash
curl "http://localhost:3000/pico_data/latest"
# => JSON object
```

Get history:

```bash
curl "http://localhost:3000/pico_data/history"
# => JSON array
```

---

## Quick burst test with xargs (parallel load)

```bash
seq 1 20 | xargs -I{} -P5 sh -c '
i="$1"
if [ $((i % 2)) -eq 1 ]; then
  cls=Fire
  base=$(awk -v i="$i" '\''BEGIN{printf "%.3f", 0.60 + (i*0.008)}'\'')
else
  cls=Nofire
  base=$(awk -v i="$i" '\''BEGIN{printf "%.3f", 0.40 - (i*0.004)}'\'')
fi
fire_score=$(awk -v base="$base" -v cls="$cls" '\''BEGIN{ if (cls=="Fire"){f=base}else{f=1-base} if (f>0.99) f=0.99; if (f<0) f=0; printf "%.3f", f }'\'')
nofire_score=$(awk -v f="$fire_score" '\''BEGIN{printf "%.3f", 1-f}'\'')
confidence=$(awk -v f="$fire_score" -v n="$nofire_score" -v i="$i" '\''BEGIN{srand(); noise=(rand()-0.5)*0.08; top = (f>n? f : n); c = top - 0.02 + noise; if (c<0.01) c=0.01; if (c>0.99) c=0.99; printf "%.3f", c }'\'')
curl -s -w "\n" "http://localhost:3000/pico_data?class=$cls&confidence=$confidence&fire_score=$fire_score&nofire_score=$nofire_score"
' _ {}
```

---

## Expected behavior summary

- Every `GET /pico_data?...` produces a logged block with the four fields (`class`, `confidence`, `fire_score`, `nofire_score`) and returns `ACK`.
- `/pico_data/latest` always reflects the last successful ingestion.
- `/pico_data/history` grows with each ingestion and keeps only the most recent 100 entries (FIFO).

---

## Troubleshooting

- **No data appears in `/pico_data/latest`** — confirm the microcontroller can reach the server IP and that the GET URL encodes query parameters correctly.
- **Server not starting** — check Node.js/Bun versions and that dependencies are installed.
- **History empty despite ingests** — verify server logs; the server logs each received `class`, `confidence`, `fire_score`, `nofire_score`.

---

## Suggested improvements

- **Input validation:** ensure query params are sanitized and numeric params validated.
- **Persistent store:** write the history to a lightweight DB (SQLite, Redis) to survive restarts.
- **Authentication & signing:** protect the ingestion endpoint (HMAC / tokens) so only trusted microcontrollers can send data.
- **Rate limiting:** prevent accidental storms or malformed devices from flooding the service.
- **WebSocket or SSE:** broadcast live updates to dashboards.

---

## Security considerations

- This server accepts unauthenticated GET requests — if deployed on an untrusted network, add authentication and TLS (HTTPS).
- Avoid exposing internal or management endpoints publicly.

---

## Contributing

Contributions welcome. Typical workflow:

1. Fork
2. Create a feature branch
3. Open a PR with a description and tests (where applicable)

Please follow the established code style and add tests for new features.

---

## Acknowledgements — I.G.N.I.S. project

This server is part of **I.G.N.I.S.** (Inteligência para Gerenciamento e Neutralização de Incêndios Sistematizada): an edge AI project to detect early-stage fires in remote areas using computer vision on edge devices (ESP32 / optical cameras) so that authorities can respond faster. The server is intended as a lightweight ingestion and distribution component supporting that mission.
