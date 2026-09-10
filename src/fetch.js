const axios = require('axios');
const { normalizeRawStation } = require('./normalize');
const { retry } = require('./retry');

const DEFAULT_MITERD_URL =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRIES = 3;

function resolveUrl(urlOption) {
  if (typeof urlOption === 'function') {
    return resolveUrl(urlOption());
  }
  if (typeof urlOption === 'string' && urlOption.trim()) {
    return urlOption.trim();
  }
  return DEFAULT_MITERD_URL;
}

function resolveLogger(loggerOption) {
  return loggerOption && typeof loggerOption.info === 'function' ? loggerOption : console;
}

function resolveHttpClient(httpClientOption) {
  return httpClientOption && typeof httpClientOption.get === 'function' ? httpClientOption : axios;
}

async function fetchStations(options = {}, hooks = {}) {
  const logger = resolveLogger(options.logger);
  const httpClient = resolveHttpClient(options.httpClient);
  const url = resolveUrl(options.url);
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const reportProgress =
    typeof hooks.reportProgress === 'function' ? hooks.reportProgress : () => {};

  reportProgress(5, { stage: 'requesting_dataset' });
  const rawStations = await retry(
    async () => {
      logger.info('Requesting MITERD station dataset', { url });
      const response = await httpClient.get(url, { timeout });

      if (!response.data || !Array.isArray(response.data?.ListaEESSPrecio)) {
        throw new Error('Unexpected MITERD response payload');
      }

      logger.info('Received MITERD station dataset', {
        url,
        status: response.status,
        stationCount: response.data.ListaEESSPrecio?.length ?? 0,
      });

      return response.data.ListaEESSPrecio;
    },
    { retries, minTimeoutMs: 1000, logger },
  );

  reportProgress(60, { stage: 'normalizing_dataset', stationCount: rawStations.length });
  logger.info(`Fetched ${rawStations.length} stations from MITERD`);
  const normalized = [];
  const skipped = [];
  for (const raw of rawStations) {
    try {
      normalized.push(normalizeRawStation(raw));
    } catch (err) {
      skipped.push({ id: raw.IDEESS, error: err.message });
    }
  }
  if (skipped.length > 0) {
    logger.warn(`Skipped ${skipped.length} MITERD stations with invalid data`, {
      skipped: skipped.slice(0, 5),
    });
  }
  reportProgress(100, { stage: 'completed', stationCount: normalized.length });
  return normalized;
}

module.exports = {
  fetchStations,
  DEFAULT_MITERD_URL,
};
