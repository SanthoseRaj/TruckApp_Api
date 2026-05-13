const assert = require('assert');
const {
  buildDashboardCounts,
  serializePublicTruckEntry,
} = require('../controllers/publicDashboardController');

const baseEntry = {
  _id: 'entry-1',
  headTruckNumber: 'HT-100',
  tailTrailerNumber: 'TT-100',
  supplierName: 'Gulf Supplier',
  shipId: 'ship-1',
  shipName: 'Gulf Star',
  shipNumber: 'GS-1',
  tripNumber: 'TRIP-1',
  tripTime: 1,
  driverName: 'Driver One',
  driverMobile: '971500000000',
  driverTdCardNumber: 'TD-1',
  truckModel: 'sixAxis',
};

const makeEntry = (id, headTruckNumber, tailTrailerNumber, updates) => ({
  ...baseEntry,
  _id: id,
  headTruckNumber,
  tailTrailerNumber,
  updates,
});

const at = (day) => new Date(`2026-05-${String(day).padStart(2, '0')}T08:00:00.000Z`);

const publicEntries = [
  serializePublicTruckEntry(
    makeEntry('entry-yard', 'HT-101', 'TT-101', [
      { stop: 'yard', status: 'entry', updatedAt: at(1), teamName: 'Yard Team', memberName: 'Yard Member' },
    ])
  ),
  serializePublicTruckEntry(
    makeEntry('entry-moving', 'HT-102', 'TT-102', [
      { stop: 'yard', status: 'entry', updatedAt: at(1), teamName: 'Yard Team', memberName: 'Yard Member' },
      { stop: 'yard', status: 'exit', updatedAt: at(2), teamName: 'Yard Team', memberName: 'Yard Member' },
    ])
  ),
  serializePublicTruckEntry(
    makeEntry('entry-gate', 'HT-103', 'TT-103', [
      { stop: 'yard', status: 'entry', updatedAt: at(1) },
      { stop: 'yard', status: 'exit', updatedAt: at(2) },
      { stop: 'gate', status: 'entry', updatedAt: at(3) },
    ])
  ),
  serializePublicTruckEntry(
    makeEntry('entry-completed', 'HT-104', 'TT-104', [
      { stop: 'yard', status: 'entry', updatedAt: at(1) },
      { stop: 'yard', status: 'exit', updatedAt: at(2) },
      { stop: 'gate', status: 'entry', updatedAt: at(3) },
      { stop: 'gate', status: 'exit', updatedAt: at(4) },
      { stop: 'port', status: 'entry', updatedAt: at(5) },
      { stop: 'port', status: 'exit', updatedAt: at(6) },
      { stop: 'clearence', status: 'entry', updatedAt: at(7) },
      { stop: 'clearence', status: 'exit', updatedAt: at(8) },
      { stop: 'dubai', status: 'entry', updatedAt: at(9) },
      { stop: 'dubai', status: 'exit', updatedAt: at(10) },
    ])
  ),
];

const counts = buildDashboardCounts(publicEntries);

assert.strictEqual(publicEntries[0].workflowStatus, 'active');
assert.strictEqual(publicEntries[0].currentStop, 'yard');
assert.strictEqual(publicEntries[0].currentStatus, 'entry');
assert.strictEqual(publicEntries[0].nextStop, 'gate');
assert.strictEqual(publicEntries[0].driverName, 'Driver One');
assert.strictEqual(publicEntries[0].updates[0].teamName, 'Yard Team');
assert.strictEqual(publicEntries[3].workflowStatus, 'completed');
assert.strictEqual(publicEntries[3].currentStop, 'dubai');
assert.strictEqual(publicEntries[3].currentStatus, 'completed');

assert.deepStrictEqual(counts, {
  totalActive: 3,
  moving: 1,
  stops: {
    yard: 1,
    gate: 1,
    port: 0,
    clearence: 0,
    dubai: 0,
  },
  routes: {
    yardToGate: 1,
    gateToPort: 0,
    portToClearence: 0,
    clearenceToDubai: 0,
  },
});

console.log('public dashboard controller tests passed');
