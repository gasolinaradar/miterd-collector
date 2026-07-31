const { fetchStations } = require('./fetch');

function createMiterdCollector(options = {}) {
  return {
    name: 'miterd',
    country: 'ES',
    async fetch(context = {}) {
      const reportProgress =
        typeof context?.reportProgress === 'function' ? context.reportProgress : () => {};
      return fetchStations(options, { reportProgress });
    },
  };
}

module.exports = {
  createMiterdCollector,
};
