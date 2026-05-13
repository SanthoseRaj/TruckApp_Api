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
  (truckEntry.updates || []).some(
    (update) => normalizeText(update.stop) === stop && normalizeText(update.status) === status
  );

const getLatestUpdate = (truckEntry) => {
  if (!truckEntry.updates?.length) return null;

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

  return completed ? 'completed' : 'active';
};

const getTruckIdentity = (truckEntry) => {
  const head = normalizeText(truckEntry.headTruckNumber) || '';
  const tail = normalizeText(truckEntry.tailTrailerNumber) || '';

  return `${head}|${tail}`;
};

const serializePublicTruckEntry = (truckEntry) => {
  const entry = truckEntry.toObject ? truckEntry.toObject() : truckEntry;
  const latestUpdate = getLatestUpdate(entry);
  const currentStop = normalizeText(latestUpdate?.stop) || null;
  const workflowStatus = getWorkflowStatus(entry);
  const currentStatus = workflowStatus === 'completed' ? 'completed' : normalizeText(latestUpdate?.status) || null;

  return {
    _id: entry._id,
    headTruckNumber: entry.headTruckNumber,
    tailTrailerNumber: entry.tailTrailerNumber,
    supplierName: entry.supplierName,
    shipId: entry.shipId,
    shipName: entry.shipName,
    shipNumber: entry.shipNumber,
    tripNumber: entry.tripNumber,
    tripTime: entry.tripTime,
    driverName: entry.driverName,
    driverMobile: entry.driverMobile,
    driverTdCardNumber: entry.driverTdCardNumber,
    truckModel: entry.truckModel,
    currentStop,
    currentStatus,
    nextStop: workflowStatus === 'completed' ? null : getNextStop(currentStop),
    workflowStatus,
    updates: (entry.updates || []).map((update) => {
      const selectedAt = formatSelectedLocalDateTime(update.updatedAt);
      const status = normalizeText(update.status);

      return {
        stop: normalizeText(update.stop),
        status,
        updatedAt: selectedAt,
        teamName: update.teamName,
        memberName: update.memberName,
        crossedAt: selectedAt,
        ...(status === 'entry' ? { entryAt: selectedAt } : {}),
        ...(status === 'exit' ? { exitAt: selectedAt } : {}),
      };
    }),
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

  const activeTruckIdentities = new Set();

  truckEntries.forEach((truckEntry) => {
    if (truckEntry.workflowStatus === 'completed') return;

    if (truckEntry.currentStatus === 'entry' && truckEntry.currentStop in counts.stops) {
      counts.stops[truckEntry.currentStop] += 1;
    }

    if (truckEntry.currentStatus === 'exit' || truckEntry.currentStatus === 'moving') {
      const routeKey = routeKeys[truckEntry.currentStop];
      const nextStop = getNextStop(truckEntry.currentStop);

      if (routeKey && nextStop) {
        counts.routes[routeKey] += 1;
        counts.moving += 1;
      }
    }

    activeTruckIdentities.add(getTruckIdentity(truckEntry));
  });

  counts.totalActive = activeTruckIdentities.size;

  return counts;
};

const getPublicDashboardTruckEntries = async (req, res, next) => {
  try {
    const truckEntries = await TruckEntry.find({
      isDeleted: { $ne: true },
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    }).sort('-createdAt');
    const publicTruckEntries = truckEntries.map(serializePublicTruckEntry);
    const counts = buildDashboardCounts(publicTruckEntries);

    console.log(
      `[public-dashboard] entries=${publicTruckEntries.length} active=${counts.totalActive} moving=${counts.moving}`
    );

    res.set('Cache-Control', 'no-store');

    return res.status(200).json({
      counts,
      truckEntries: publicTruckEntries,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicDashboardTruckEntries,
  buildDashboardCounts,
  serializePublicTruckEntry,
};
