const TruckEntry = require('../models/TruckEntry');
const { formatSelectedLocalDateTime } = require('../utils/selectedLocalDateTime');

const workflowStops = ['yard', 'gate', 'port', 'clearence', 'dubai'];
const routeKeys = {
  yard: 'yardToGate',
  gate: 'gateToPort',
  port: 'portToClearence',
  clearence: 'clearenceToDubai',
};

const normalizeText = (value) => value?.toString().toLowerCase().trim();

const hasUpdate = (truckEntry, stop, status) =>
  truckEntry.updates.some((update) => normalizeText(update.stop) === stop && normalizeText(update.status) === status);

const getLatestUpdate = (truckEntry) => {
  if (!truckEntry.updates.length) return null;

  return [...truckEntry.updates].sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt)).at(-1);
};

const getNextStop = (stop) => {
  const index = workflowStops.indexOf(stop);
  return index >= 0 && index < workflowStops.length - 1 ? workflowStops[index + 1] : null;
};

const getWorkflowStatus = (truckEntry) => {
  const completed = workflowStops.every(
    (stop) => hasUpdate(truckEntry, stop, 'entry') && hasUpdate(truckEntry, stop, 'exit')
  );

  return completed ? 'completed' : 'pending';
};

const serializePublicTruckEntry = (truckEntry) => {
  const latestUpdate = getLatestUpdate(truckEntry);
  const currentStop = normalizeText(latestUpdate?.stop) || null;
  const currentStatus = normalizeText(latestUpdate?.status) || null;

  return {
    _id: truckEntry._id,
    headTruckNumber: truckEntry.headTruckNumber,
    tailTrailerNumber: truckEntry.tailTrailerNumber,
    supplierName: truckEntry.supplierName,
    shipName: truckEntry.shipName,
    shipNumber: truckEntry.shipNumber,
    tripNumber: truckEntry.tripNumber,
    tripTime: truckEntry.tripTime,
    truckModel: truckEntry.truckModel,
    updates: truckEntry.updates.map((update) => {
      const selectedAt = formatSelectedLocalDateTime(update.updatedAt);
      const status = normalizeText(update.status);

      return {
        stop: normalizeText(update.stop),
        status,
        updatedAt: selectedAt,
        crossedAt: selectedAt,
        ...(status === 'entry' ? { entryAt: selectedAt } : {}),
        ...(status === 'exit' ? { exitAt: selectedAt } : {}),
      };
    }),
    currentStop,
    currentStatus,
    workflowStatus: getWorkflowStatus(truckEntry),
  };
};

const buildDashboardCounts = (truckEntries) => {
  const counts = {
    totalActive: 0,
    moving: 0,
    stops: {
      yard: 0,
      gate: 0,
      port: 0,
      clearence: 0,
      dubai: 0,
    },
    routes: {
      yardToGate: 0,
      gateToPort: 0,
      portToClearence: 0,
      clearenceToDubai: 0,
    },
  };

  truckEntries.forEach((truckEntry) => {
    if (truckEntry.workflowStatus === 'completed') return;

    counts.totalActive += 1;

    if (truckEntry.currentStatus === 'entry' && truckEntry.currentStop in counts.stops) {
      counts.stops[truckEntry.currentStop] += 1;
      return;
    }

    if (truckEntry.currentStatus === 'exit') {
      const routeKey = routeKeys[truckEntry.currentStop];
      const nextStop = getNextStop(truckEntry.currentStop);

      if (routeKey && nextStop) {
        counts.routes[routeKey] += 1;
        counts.moving += 1;
      }
    }
  });

  return counts;
};

const getPublicDashboardTruckEntries = async (req, res, next) => {
  try {
    const truckEntries = await TruckEntry.find().sort('-createdAt');
    const publicTruckEntries = truckEntries.map(serializePublicTruckEntry);
    const activeTruckEntries = publicTruckEntries.filter((truckEntry) => truckEntry.workflowStatus !== 'completed');

    return res.status(200).json({
      counts: buildDashboardCounts(publicTruckEntries),
      truckEntries: activeTruckEntries,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicDashboardTruckEntries,
};
