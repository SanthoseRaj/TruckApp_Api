const mongoose = require('mongoose');
const Ship = require('../models/Ship');
const TruckEntry = require('../models/TruckEntry');
const {
  formatSelectedLocalDateTime,
  parseSelectedLocalDateTime,
  selectedLocalDateTimeFromDate,
} = require('../utils/selectedLocalDateTime');

const requiredFields = [
  'headTruckNumber',
  'tailTrailerNumber',
  'supplierName',
  'shipId',
  'shipName',
  'shipNumber',
  'tripNumber',
  'tripTime',
  'driverName',
  'driverMobile',
  'driverTdCardNumber',
  'truckModel',
];

const stringFields = requiredFields.filter((field) => field !== 'tripTime');
const adminRoles = ['owner', 'admin'];
const workflowStops = ['yard', 'gate', 'port', 'clearence', 'dubai'];

const normalizeUpper = (value) => value.trim().toUpperCase();
const normalizeText = (value) => value?.toLowerCase().trim();

const normalizeDubaiDestination = (destination) => {
  const normalized = destination?.toString().trim().toLowerCase();

  if (normalized === 'dubai') return 'dubai';
  if (normalized === 'freezone' || normalized === 'free_zone' || normalized === 'free zone') return 'freeZone';

  return null;
};

const validateRequiredFields = (body) => {
  const missingField = requiredFields.find((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && !value.trim());
  });

  if (missingField) {
    return `${missingField} is required`;
  }

  const invalidStringField = stringFields.find((field) => typeof body[field] !== 'string');

  if (invalidStringField) {
    return `${invalidStringField} must be a string`;
  }

  if (!Number.isFinite(Number(body.tripTime))) {
    return 'tripTime must be a valid number';
  }

  if (!['threeAxis', 'sixAxis'].includes(body.truckModel)) {
    return 'truckModel must be either threeAxis or sixAxis';
  }

  return null;
};

const getTeamName = (user) => user.entryTeam?.name || (user.role === 'yard' ? 'Yard Entry Team' : user.role);

const hasUpdate = (truckEntry, stop, status) =>
  truckEntry.updates.some((update) => normalizeText(update.stop) === stop && normalizeText(update.status) === status);

const getWorkflowState = (truckEntry) => {
  for (const stop of workflowStops) {
    const entryCompleted = hasUpdate(truckEntry, stop, 'entry');
    const exitCompleted = hasUpdate(truckEntry, stop, 'exit');

    if (!entryCompleted) {
      return {
        currentAllowedRole: stop,
        currentAllowedStop: stop,
        currentAction: 'entry',
        workflowStatus: 'pending',
        nextRole: stop,
        nextStop: stop,
      };
    }

    if (!exitCompleted) {
      return {
        currentAllowedRole: stop,
        currentAllowedStop: stop,
        currentAction: 'exit',
        workflowStatus: 'pending',
        nextRole: stop,
        nextStop: stop,
      };
    }
  }

  return {
    currentAllowedRole: null,
    currentAllowedStop: null,
    currentAction: null,
    workflowStatus: 'completed',
    nextRole: null,
    nextStop: null,
  };
};

const serializeTruckEntry = (truckEntry) => {
  const entry = truckEntry.toObject ? truckEntry.toObject() : truckEntry;
  const updates = entry.updates.map((update) => {
    const selectedAt = formatSelectedLocalDateTime(update.updatedAt);
    return {
      ...update,
      updatedAt: selectedAt,
      crossedAt: selectedAt,
      ...(normalizeText(update.status) === 'entry' ? { entryAt: selectedAt } : {}),
      ...(normalizeText(update.status) === 'exit' ? { exitAt: selectedAt } : {}),
    };
  });
  const yardEntry = updates.find(
    (update) => normalizeText(update.stop) === 'yard' && normalizeText(update.status) === 'entry'
  );
  const latestExit = [...updates].reverse().find((update) => normalizeText(update.status) === 'exit');

  return {
    ...entry,
    id: entry._id,
    updates,
    ...(yardEntry ? { entryAt: yardEntry.updatedAt } : {}),
    ...(latestExit ? { exitAt: latestExit.updatedAt } : {}),
    ...getWorkflowState(entry),
  };
};

const hasOpenYardEntry = async (headTruckNumber, tailTrailerNumber) => {
  const entries = await TruckEntry.find({
    headTruckNumber,
    tailTrailerNumber,
  }).sort('-createdAt');

  return entries.some((entry) => getWorkflowState(entry).workflowStatus !== 'completed');
};

const createTruckEntry = async (req, res, next) => {
  try {
    const body = req.body || {};
    const validationError = validateRequiredFields(body);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    if (!mongoose.isValidObjectId(body.shipId)) {
      return res.status(404).json({ success: false, message: 'Ship not found' });
    }

    const ship = await Ship.findById(body.shipId);
    if (!ship) return res.status(404).json({ success: false, message: 'Ship not found' });

    const headTruckNumber = normalizeUpper(body.headTruckNumber);
    const tailTrailerNumber = normalizeUpper(body.tailTrailerNumber);
    const duplicateOpenEntry = await hasOpenYardEntry(headTruckNumber, tailTrailerNumber);

    if (duplicateOpenEntry) {
      return res.status(409).json({ success: false, message: 'Duplicate active yard entry already exists' });
    }

    const entryAt = body.entryAt ? parseSelectedLocalDateTime(body.entryAt) : selectedLocalDateTimeFromDate(new Date());

    if (!entryAt) {
      return res.status(400).json({ success: false, message: 'entryAt must be a valid date' });
    }

    const truckEntry = await TruckEntry.create({
      headTruckNumber,
      tailTrailerNumber,
      supplierName: body.supplierName.trim(),
      shipId: ship._id,
      shipName: body.shipName.trim(),
      shipNumber: normalizeUpper(body.shipNumber),
      tripNumber: body.tripNumber.trim(),
      tripTime: Number(body.tripTime),
      driverName: body.driverName.trim(),
      driverMobile: body.driverMobile.trim(),
      driverTdCardNumber: body.driverTdCardNumber.trim(),
      truckModel: body.truckModel,
      updates: [
        {
          stop: 'yard',
          status: 'entry',
          updatedAt: entryAt,
          teamName: getTeamName(req.user),
          memberName: req.user.name,
        },
      ],
    });

    return res.status(201).json({
      message: 'Truck entry created successfully',
      truckEntry: serializeTruckEntry(truckEntry),
    });
  } catch (error) {
    next(error);
  }
};

const getTruckEntries = async (req, res, next) => {
  try {
    const truckEntries = await TruckEntry.find().populate('shipId', 'shipName shipNumber').sort('-createdAt');
    return res.status(200).json({ truckEntries: truckEntries.map(serializeTruckEntry) });
  } catch (error) {
    next(error);
  }
};

const getTruckEntryById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Truck entry not found' });
    }

    const truckEntry = await TruckEntry.findById(req.params.id).populate('shipId', 'shipName shipNumber');
    if (!truckEntry) return res.status(404).json({ success: false, message: 'Truck entry not found' });

    return res.status(200).json({ truckEntry: serializeTruckEntry(truckEntry) });
  } catch (error) {
    next(error);
  }
};

const validateWorkflowUpdate = (truckEntry, userRole, action) => {
  const workflowState = getWorkflowState(truckEntry);

  if (workflowState.workflowStatus === 'completed') {
    return { status: 400, message: 'Truck entry workflow is already completed' };
  }

  const userStopIndex = workflowStops.indexOf(userRole);
  const allowedStopIndex = workflowStops.indexOf(workflowState.currentAllowedRole);

  if (userStopIndex === -1) {
    return { status: 403, message: 'You do not have permission' };
  }

  if (userStopIndex > allowedStopIndex) {
    return { status: 400, message: 'Previous stop is not completed' };
  }

  if (workflowState.currentAllowedRole !== userRole) {
    return { status: 403, message: 'You do not have permission' };
  }

  if (action === 'entry' && workflowState.currentAction !== 'entry') {
    return { status: 400, message: `${userRole} entry already exists` };
  }

  if (action === 'exit' && workflowState.currentAction === 'entry') {
    return { status: 400, message: 'Exit cannot be completed before entry' };
  }

  if (action === 'exit' && workflowState.currentAction !== 'exit') {
    return { status: 400, message: `${userRole} exit already exists` };
  }

  return null;
};

const appendWorkflowUpdate = async (req, res, next, action) => {
  try {
    const body = req.body || {};

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Truck entry not found' });
    }

    const truckEntry = await TruckEntry.findById(req.params.id);
    if (!truckEntry) return res.status(404).json({ success: false, message: 'Truck entry not found' });

    const workflowError = validateWorkflowUpdate(truckEntry, req.user.role, action);

    if (workflowError) {
      return res.status(workflowError.status).json({ success: false, message: workflowError.message });
    }

    const dateField = action === 'entry' ? 'entryAt' : 'exitAt';
    const updatedAt = body[dateField]
      ? parseSelectedLocalDateTime(body[dateField])
      : selectedLocalDateTimeFromDate(new Date());

    if (!updatedAt) {
      return res.status(400).json({ success: false, message: `${dateField} must be a valid date` });
    }

    if (body.remarks !== undefined && typeof body.remarks !== 'string') {
      return res.status(400).json({ success: false, message: 'remarks must be a string' });
    }

    const destination = normalizeDubaiDestination(body.destination);

    if (req.user.role === 'dubai' && action === 'entry' && !destination) {
      return res.status(400).json({ success: false, message: 'Dubai or Free Zone destination is required' });
    }

    if (req.user.role !== 'dubai' && body.destination !== undefined) {
      return res.status(400).json({ success: false, message: 'Destination is allowed only for Dubai updates' });
    }

    truckEntry.updates.push({
      stop: req.user.role,
      status: action,
      updatedAt,
      teamName: getTeamName(req.user),
      memberName: req.user.name,
      remarks: typeof body.remarks === 'string' ? body.remarks.trim() : undefined,
      destination,
    });

    await truckEntry.save();
    await truckEntry.populate('shipId', 'shipName shipNumber');

    return res.status(200).json({
      message: `Truck ${action} updated successfully`,
      truckEntry: serializeTruckEntry(truckEntry),
    });
  } catch (error) {
    next(error);
  }
};

const markTeamEntry = (req, res, next) => appendWorkflowUpdate(req, res, next, 'entry');

const markTeamExit = (req, res, next) => appendWorkflowUpdate(req, res, next, 'exit');

module.exports = {
  createTruckEntry,
  getTruckEntries,
  getTruckEntryById,
  markTeamEntry,
  markTeamExit,
};
