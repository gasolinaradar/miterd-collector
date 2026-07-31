const { test } = require('node:test');
const assert = require('node:assert');
const { createMiterdCollector, fetchStations } = require('../src');

const SAMPLE_PAYLOAD = {
  ListaEESSPrecio: [
    {
      IDEESS: '12345',
      Rótulo: 'Repsol',
      Dirección: 'Calle Mayor 1',
      Municipio: 'Madrid',
      Provincia: 'Madrid',
      Latitud: '40,416775',
      'Longitud (WGS84)': '-3,703790',
      Horario: 'L-D: 08:00-22:00',
      'C.P.': '28013',
      'Tipo Venta': 'P',
      Margen: 'M',
      Remisión: 'R',
      'Precio Gasolina 95': '1,559',
      'Precio Gasóleo A': '1,445',
    },
  ],
};

function createFakeClient(payload) {
  return {
    get: async () => ({ status: 200, data: payload }),
  };
}

test('fetchStations returns normalized stations', async () => {
  const stations = await fetchStations({
    httpClient: createFakeClient(SAMPLE_PAYLOAD),
    logger: null,
  });

  assert.equal(stations.length, 1);
  const [station] = stations;
  assert.equal(station.source, 'miterd');
  assert.equal(station.country, 'ES');
  assert.equal(station.sourceStationId, '12345');
  assert.equal(station.name, 'Repsol');
  assert.equal(station.municipality, 'Madrid');
  assert.deepEqual(station.location, {
    type: 'Point',
    coordinates: [-3.70379, 40.416775],
  });
  assert.equal(station.prices['gasolina95'], 1.559);
  assert.equal(station.prices['gasleoa'], 1.445);
  assert.ok(station.lastUpdated instanceof Date);
});

test('createMiterdCollector exposes the collector contract', async () => {
  const collector = createMiterdCollector({ httpClient: createFakeClient(SAMPLE_PAYLOAD) });

  assert.equal(collector.name, 'miterd');
  assert.equal(collector.country, 'ES');
  assert.equal(typeof collector.fetch, 'function');

  const stations = await collector.fetch({});
  assert.equal(stations.length, 1);
});

test('reports progress through the context hook', async () => {
  const collector = createMiterdCollector({ httpClient: createFakeClient(SAMPLE_PAYLOAD) });
  const steps = [];

  const stations = await collector.fetch({
    reportProgress(percent, metadata = {}) {
      steps.push({ percent, metadata });
    },
  });

  assert.equal(stations.length, 1);
  assert.equal(steps[0].percent, 5);
  assert.equal(steps[0].metadata.stage, 'requesting_dataset');
  assert.equal(steps[1].percent, 60);
  assert.equal(steps[steps.length - 1].percent, 100);
  assert.equal(steps[steps.length - 1].metadata.stage, 'completed');
});

test('throws on unexpected payload', async () => {
  await assert.rejects(
    () => fetchStations({ httpClient: createFakeClient({ foo: 1 }), retries: 0 }),
    /Unexpected MITERD response payload/,
  );
});

test('throws when station coordinates are missing', async () => {
  const payload = { ListaEESSPrecio: [{ IDEESS: '1', Rótulo: 'X' }] };
  await assert.rejects(
    () => fetchStations({ httpClient: createFakeClient(payload) }),
    /Missing coordinate value/,
  );
});
