const decimalCommaRegex = /,/g;

function normalizePrice(value) {
  if (value === null || value === undefined) return null;
  const raw = typeof value === 'number' ? value.toString() : value.trim();
  if (!raw) return null;
  const normalized = raw.replace(decimalCommaRegex, '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCoordinate(value) {
  if (value === null || value === undefined) {
    throw new Error('Missing coordinate value');
  }

  const raw = typeof value === 'number' ? value.toString() : String(value).trim();
  if (!raw) {
    throw new Error('Empty coordinate value');
  }

  const normalized = raw.replace(decimalCommaRegex, '.');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid coordinate value: ${value}`);
  }

  return parsed;
}

function slugifyFuelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '');
}

const RESERVED_FIELDS = new Set([
  'IDEESS',
  'Rótulo',
  'Dirección',
  'Municipio',
  'Provincia',
  'Latitud',
  'Longitud (WGS84)',
  'Horario',
  'C.P.',
  'Tipo Venta',
  'Margen',
  'Remisión',
]);

function normalizeRawStation(station) {
  const latitude = normalizeCoordinate(station.Latitud);
  const longitude = normalizeCoordinate(station['Longitud (WGS84)']);

  const prices = Object.entries(station).reduce((acc, [key, value]) => {
    if (RESERVED_FIELDS.has(key)) {
      return acc;
    }
    if (key.toLowerCase().includes('precio')) {
      const slug = slugifyFuelName(key.replace('Precio', ''));
      acc[slug] = normalizePrice(value);
    }
    return acc;
  }, {});

  return {
    source: 'miterd',
    country: 'ES',
    sourceStationId: station.IDEESS,
    name: station['Rótulo']?.trim() ?? 'Desconocido',
    address: station['Dirección']?.trim() ?? '',
    municipality: station.Municipio?.trim() ?? '',
    province: station.Provincia?.trim() ?? '',
    postalCode: station['C.P.']?.trim() ?? undefined,
    schedule: station.Horario?.trim() ?? undefined,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    services: undefined,
    prices,
    lastUpdated: new Date(),
  };
}

module.exports = {
  normalizeRawStation,
  normalizePrice,
  normalizeCoordinate,
  slugifyFuelName,
};
