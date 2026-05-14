const assert = require('assert');
const {
  getWorkflowState,
  resolveEntryDestinationUpdate,
  resolveOriginStopForDestination,
  serializeTruckEntry,
  validateOriginCycle,
} = require('../controllers/truckEntryController');

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
  destination: 'dubai',
};

const at = (minute) => new Date(`2026-05-01T08:${String(minute).padStart(2, '0')}:00.000Z`);

const yardOrigin = {
  ...baseEntry,
  originStop: 'yard',
  updates: [{ stop: 'yard', status: 'entry', updatedAt: at(0), teamName: 'Yard Team', memberName: 'Yard Member' }],
};

const gateOrigin = {
  ...baseEntry,
  _id: 'entry-2',
  destination: 'freeZone',
  originStop: 'gate',
  updates: [{ stop: 'gate', status: 'entry', updatedAt: at(0), teamName: 'Gate Team', memberName: 'Gate Member' }],
};

const completedGateOrigin = {
  ...gateOrigin,
  updates: [
    { stop: 'gate', status: 'entry', updatedAt: at(0) },
    { stop: 'gate', status: 'exit', updatedAt: at(1) },
    { stop: 'port', status: 'entry', updatedAt: at(2) },
    { stop: 'port', status: 'exit', updatedAt: at(3) },
    { stop: 'clearence', status: 'entry', updatedAt: at(4) },
    { stop: 'clearence', status: 'exit', updatedAt: at(5) },
    { stop: 'dubai', status: 'entry', updatedAt: at(6) },
    { stop: 'dubai', status: 'exit', updatedAt: at(7) },
  ],
};

assert.deepStrictEqual(getWorkflowState(yardOrigin), {
  currentAllowedRole: 'yard',
  currentAllowedStop: 'yard',
  currentAction: 'exit',
  workflowStatus: 'pending',
  nextRole: 'yard',
  nextStop: 'yard',
});

assert.deepStrictEqual(getWorkflowState(gateOrigin), {
  currentAllowedRole: 'gate',
  currentAllowedStop: 'gate',
  currentAction: 'exit',
  workflowStatus: 'pending',
  nextRole: 'gate',
  nextStop: 'gate',
});

assert.strictEqual(getWorkflowState(completedGateOrigin).workflowStatus, 'completed');

const serializedGateOrigin = serializeTruckEntry(gateOrigin);
const serializedLegacyFreeZone = serializeTruckEntry({ ...gateOrigin, destination: 'Free Zone' });

assert.strictEqual(serializedGateOrigin.destination, 'freeZone');
assert.strictEqual(serializedLegacyFreeZone.destination, 'freeZone');
assert.strictEqual(serializedGateOrigin.originStop, 'gate');
assert.strictEqual(serializedGateOrigin.currentStop, 'gate');
assert.strictEqual(serializedGateOrigin.currentStatus, 'entry');
assert.strictEqual(serializedGateOrigin.currentAllowedRole, 'gate');
assert.strictEqual(serializedGateOrigin.currentAction, 'exit');
assert.strictEqual(serializedGateOrigin.nextStop, 'port');

assert.strictEqual(validateOriginCycle('yard', null), null);
assert.strictEqual(validateOriginCycle('yard', { destination: 'dubai' }), null);
assert.strictEqual(validateOriginCycle('gate', { destination: 'freeZone' }), null);
assert.match(validateOriginCycle('gate', null), /freeZone/);
assert.match(validateOriginCycle('gate', { destination: 'dubai' }), /freeZone/);
assert.match(validateOriginCycle('yard', { destination: 'freeZone' }), /dubai/);
assert.strictEqual(validateOriginCycle('gate', { destination: 'free_zone' }), null);

assert.deepStrictEqual(resolveEntryDestinationUpdate({ destination: 'dubai' }, {}), {
  destination: 'dubai',
});
assert.deepStrictEqual(resolveEntryDestinationUpdate({ destination: 'freezone' }, {}), {
  destination: 'freeZone',
});
assert.deepStrictEqual(resolveEntryDestinationUpdate({ destination: 'Free Zone' }, { destination: 'free_zone' }), {
  destination: 'freeZone',
});
assert.deepStrictEqual(resolveEntryDestinationUpdate({ destination: undefined }, { destination: 'freeZone' }), {
  destination: 'freeZone',
});
assert.deepStrictEqual(resolveEntryDestinationUpdate({ destination: undefined }, {}), {
  error: { status: 400, message: 'Dubai or Free Zone destination is required' },
});
assert.deepStrictEqual(resolveEntryDestinationUpdate({ destination: 'dubai' }, { destination: 'freeZone' }), {
  error: { status: 400, message: 'destination cannot be updated here' },
});

assert.deepStrictEqual(resolveOriginStopForDestination('freeZone'), {
  originStop: 'gate',
});
assert.deepStrictEqual(resolveOriginStopForDestination('dubai'), {
  originStop: 'yard',
});
assert.deepStrictEqual(resolveOriginStopForDestination('free_zone', 'gate'), {
  originStop: 'gate',
});
assert.deepStrictEqual(resolveOriginStopForDestination('dubai', 'yard'), {
  originStop: 'yard',
});
assert.deepStrictEqual(resolveOriginStopForDestination('freeZone', 'yard'), {
  error: { status: 400, message: 'Free Zone trucks must start from Gate entry' },
});
assert.deepStrictEqual(resolveOriginStopForDestination('dubai', 'gate'), {
  error: { status: 400, message: 'Dubai trucks must start from Yard entry' },
});

console.log('truck entry controller tests passed');
