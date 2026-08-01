const { test, before } = require('node:test');
const assert = require('node:assert');
const { createMiterdCollector, fetchStations } = require('../src');

const silentLogger = { info: () => {}, warn: () => {}, debug: () => {} };

const SPAIN_LATITUDE_RANGE = [27, 44];
const SPAIN_LONGITUDE_RANGE = [-18.5, 4.5];

let stations;

before(async () => {
  stations = await fetchStations({ logger: silentLogger, retries: 1 });
});

test('real MITERD API: full fetch returns normalized stations', async () => {
  assert.ok(stations.length > 1000, `expected a large dataset, got ${stations.length}`);

  const sample = stations[0];
  assert.equal(sample.source, 'miterd');
  assert.equal(sample.country, 'ES');
  assert.ok(sample.sourceStationId, 'station should have a source id');
  assert.ok(sample.name, 'station should have a name');
  assert.ok(Number.isFinite(sample.location?.coordinates?.[0]));
  assert.ok(Number.isFinite(sample.location?.coordinates?.[1]));
  assert.ok(sample.lastUpdated instanceof Date);

  const withPrices = stations.filter((station) => station.prices);
  assert.ok(
    withPrices.length > stations.length / 2,
    `expected most stations to have prices, got ${withPrices.length}/${stations.length}`,
  );
});

test('real MITERD API: every station has the required shape', () => {
  for (const station of stations) {
    assert.equal(station.source, 'miterd', `wrong source for ${station.sourceStationId}`);
    assert.equal(station.country, 'ES', `wrong country for ${station.sourceStationId}`);
    assert.ok(station.sourceStationId, `missing source id for ${station.sourceStationId}`);
    assert.ok(station.name, `missing name for ${station.sourceStationId}`);
    assert.ok(Number.isFinite(station.location?.coordinates?.[0]));
    assert.ok(Number.isFinite(station.location?.coordinates?.[1]));
    assert.ok(station.lastUpdated instanceof Date);
  }
});

test('real MITERD API: coordinates fall within Spain (allowing dataset outliers)', () => {
  const inRange = stations.filter((station) => {
    const [lon, lat] = station.location.coordinates;
    return (
      lat >= SPAIN_LATITUDE_RANGE[0] &&
      lat <= SPAIN_LATITUDE_RANGE[1] &&
      lon >= SPAIN_LONGITUDE_RANGE[0] &&
      lon <= SPAIN_LONGITUDE_RANGE[1]
    );
  });

  assert.ok(
    inRange.length / stations.length >= 0.99,
    `expected >=99% of stations in the Spain bbox, got ${inRange.length}/${stations.length}`,
  );

  for (const station of stations) {
    const [lon, lat] = station.location.coordinates;
    assert.ok(lat >= -90 && lat <= 90, `latitude out of range for ${station.sourceStationId}: ${lat}`);
    assert.ok(lon >= -180 && lon <= 180, `longitude out of range for ${station.sourceStationId}: ${lon}`);
  }
});

test('real MITERD API: no duplicate source station ids', () => {
  const ids = stations.map((station) => station.sourceStationId);
  assert.equal(new Set(ids).size, ids.length, 'sourceStationId must be unique');
});

test('real MITERD API: every station reports a real price and values are positive', () => {
  const withRealPrice = stations.filter((station) =>
    Object.values(station.prices ?? {}).some((value) => typeof value === 'number' && value > 0),
  );
  assert.equal(
    withRealPrice.length,
    stations.length,
    'expected every station to report at least one real price',
  );

  for (const station of stations) {
    for (const [fuel, price] of Object.entries(station.prices ?? {})) {
      if (price === null || price === undefined) {
        continue;
      }
      assert.ok(
        typeof price === 'number' && Number.isFinite(price) && price > 0,
        `invalid ${fuel} price for ${station.sourceStationId}: ${price}`,
      );
    }
  }
});

test('real MITERD API: collector contract reports progress end to end', async () => {
  const collector = createMiterdCollector({ logger: silentLogger });
  const steps = [];

  const result = await collector.fetch({
    reportProgress(percent, metadata = {}) {
      steps.push({ percent, metadata });
    },
  });

  assert.ok(result.length > 0);
  assert.equal(steps[0].percent, 5);
  assert.equal(steps[0].metadata.stage, 'requesting_dataset');
  assert.equal(steps[steps.length - 1].percent, 100);
  assert.equal(steps[steps.length - 1].metadata.stage, 'completed');
});
