# @gasolinaradar/miterd-collector

<!-- EN -->

A Node.js collector for the **official MITERD fuel-price dataset** (Spain). It downloads all fuel stations from the public REST API of the Spanish Ministry for Ecological Transition (MITERD) and returns a **normalized, ready-to-use** array of stations.

<!-- ES -->

Collector de Node.js para el **dataset oficial de precios de carburantes del MITERD** (España). Descarga todas las estaciones de servicio desde el API REST público del Ministerio para la Transición Ecológica (MITERD) y devuelve un array de estaciones **normalizado y listo para usar**.

---

## Features / Características

**EN:**

- Official public source (MITERD).
- Normalizes Spanish decimal commas (`1,559` → `1.559`) and coordinates.
- Slugs fuel names (`Precio Gasolina 95` → `gasolina95`).
- Built-in retry with exponential backoff.
- Injectable logger, HTTP client, and URL resolver.
- Progress reporting hook for long runs.
- Zero configuration: works with sensible defaults.

**ES:**

- Fuente pública oficial (MITERD).
- Normaliza las comas decimales (`1,559` → `1.559`) y las coordenadas.
- Slugifica los nombres de combustible (`Precio Gasolina 95` → `gasolina95`).
- Reintentos con backoff exponencial integrados.
- Logger, cliente HTTP y resolución de URL inyectables.
- Hook de reporte de progreso para ejecuciones largas.
- Cero configuración: funciona con valores por defecto sensatos.

---

## Installation / Instalación

```bash
npm install @gasolinaradar/miterd-collector
```

---

## Quick start / Inicio rápido

```js
const { fetchStations } = require('@gasolinaradar/miterd-collector');

async function main() {
  const stations = await fetchStations();
  console.log(`Fetched ${stations.length} fuel stations`);
  console.log(stations[0]);
}

main();
```

---

## API

### `fetchStations(options?) → Promise<Station[]>`

Downloads the dataset and returns normalized stations in one step.

```js
const { fetchStations } = require('@gasolinaradar/miterd-collector');

const stations = await fetchStations({
  url: 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/',
  logger: console,
  timeout: 15000,
  retries: 3,
});
```

### `createMiterdCollector(options?) → Collector`

Returns an object matching the common **collector contract** used by ingestion pipelines:

```js
{ name: 'miterd', country: 'ES', fetch(context) }
```

```js
const { createMiterdCollector } = require('@gasolinaradar/miterd-collector');

const miterdCollector = createMiterdCollector({
  url: () => getSourceMetadata('miterd').url, // string or () => string
  logger,
});

const stations = await miterdCollector.fetch({
  reportProgress(percent, metadata = {}) {
    console.log(`${percent}%`, metadata);
  },
});
```

---

## Options / Opciones

| Option       | Type                     | Default    | Description                                                                             |
| ------------ | ------------------------ | ---------- | --------------------------------------------------------------------------------------- |
| `url`        | `string \| () => string` | MITERD URL | Dataset URL. As a function, it is evaluated on every fetch (useful for dynamic config). |
| `timeout`    | `number`                 | `15000`    | HTTP timeout in milliseconds.                                                           |
| `retries`    | `number`                 | `3`        | Retry attempts before failing.                                                          |
| `logger`     | `{ info, warn, debug }`  | `console`  | Injectable logger.                                                                      |
| `httpClient` | `{ get(url, opts) }`     | `axios`    | Injectable HTTP client (useful for tests).                                              |

| Opción       | Tipo                     | Por defecto | Descripción                                                                                |
| ------------ | ------------------------ | ----------- | ------------------------------------------------------------------------------------------ |
| `url`        | `string \| () => string` | URL MITERD  | URL del dataset. Como función, se evalúa en cada fetch (útil para configuración dinámica). |
| `timeout`    | `number`                 | `15000`     | Timeout HTTP en milisegundos.                                                              |
| `retries`    | `number`                 | `3`         | Intentos de reintento antes de fallar.                                                     |
| `logger`     | `{ info, warn, debug }`  | `console`   | Logger inyectable.                                                                         |
| `httpClient` | `{ get(url, opts) }`     | `axios`     | Cliente HTTP inyectable (útil en tests).                                                   |

---

## Output schema / Esquema de salida

Each normalized station looks like this / Cada estación normalizada tiene esta forma:

```js
{
  source: 'miterd',
  country: 'ES',
  sourceStationId: '12345',
  name: 'Repsol',
  address: 'Calle Mayor 1',
  municipality: 'Madrid',
  province: 'Madrid',
  postalCode: '28013',
  schedule: 'L-D: 08:00-22:00',
  location: {
    type: 'Point',
    coordinates: [-3.70379, 40.416775], // [longitude, latitude]
  },
  services: undefined,
  prices: {
    gasolina95: 1.559,
    gasleoa: 1.445,
  },
  lastUpdated: Date, // timestamp of the normalization
}
```

Notes / Notas:

- Prices are keyed by slug: `Precio Gasolina 95` → `gasolina95`. All prices are `number | null`.
- Coordinates are `[longitude, latitude]` (GeoJSON order) and are parsed from Spanish decimal commas.
- If a station is missing coordinates, the fetch fails with a descriptive error.

---

## Progress reporting / Reporte de progreso

The collector accepts an optional `context.reportProgress(percent, metadata)` callback:

```js
const stations = await miterdCollector.fetch({
  reportProgress(percent, metadata) {
    // percent: 5 -> requesting dataset
    // percent: 60 -> normalizing
    // percent: 100 -> completed
    console.log(percent, metadata.stage);
  },
});
```

---

## Data source / Fuente de datos

**EN:** The data is the public fuel-price dataset of the Spanish Ministry for Ecological Transition (MITERD), published at:

**ES:** Los datos provienen del dataset público de precios de carburantes del Ministerio para la Transición Ecológica (MITERD), publicado en:

- `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/`

This project is **not affiliated with** the Spanish Administration. The data belongs to the Administration and is provided "as is". See the legal documents below.

Este proyecto **no está afiliado** a la Administración General del Estado. Los datos pertenecen a la Administración y se proporcionan "tal cual". Consulta los documentos legales a continuación.

---

## Legal / Legal

**EN:**

- [LEGAL.md](./LEGAL.md) — Legal notice and disclaimer (bilingual).
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) — Data attribution and third-party licenses.
- [LICENSE](./LICENSE) — MIT License (applies to this software, **not** to the underlying MITERD data).

**ES:**

- [LEGAL.md](./LEGAL.md) — Aviso legal y descargo de responsabilidad (bilingüe).
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) — Atribución de datos y licencias de terceros.
- [LICENSE](./LICENSE) — Licencia MIT (aplica a este software, **no** a los datos subyacentes del MITERD).

---

## Tests

```bash
npm test
```

---

## License / Licencia

**EN:** MIT. See [LICENSE](./LICENSE). The MITERD data is **not** covered by this license; it is public information of the Spanish Administration.

**ES:** MIT. Consulta [LICENSE](./LICENSE). Los datos del MITERD **no** están cubiertos por esta licencia; son información pública de la Administración General del Estado.
