const normalizeDestination = (destination) => {
  if (destination === undefined || destination === null) return null;

  const normalized = destination.toString().trim().toLowerCase().replace(/[\s_-]+/g, '');

  if (normalized === 'dubai') return 'dubai';
  if (normalized === 'freezone') return 'freeZone';

  return null;
};

module.exports = {
  normalizeDestination,
};
