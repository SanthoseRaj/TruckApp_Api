const mongoose = require('mongoose');
const Ship = require('../models/Ship');

const serializeShip = (ship) => ({
  id: ship._id,
  shipName: ship.shipName,
  shipNumber: ship.shipNumber,
  createdAt: ship.createdAt,
  updatedAt: ship.updatedAt,
});

const normalizeShipNumber = (shipNumber) => shipNumber.trim().toUpperCase();

const validateShipInput = (shipName, shipNumber) => {
  if (!shipName || !shipName.trim()) return 'Ship name is required';
  if (!shipNumber || !shipNumber.trim()) return 'Ship number is required';
  return null;
};

const handleDuplicateShipNumber = (error, res) => {
  if (error.code === 11000 && error.keyPattern && error.keyPattern.shipNumber) {
    res.status(409).json({ success: false, message: 'Ship number already exists' });
    return true;
  }

  return false;
};

const createShip = async (req, res, next) => {
  try {
    const { shipName, shipNumber } = req.body;
    const validationError = validateShipInput(shipName, shipNumber);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const normalizedShipNumber = normalizeShipNumber(shipNumber);
    const existingShip = await Ship.findOne({ shipNumber: normalizedShipNumber });

    if (existingShip) {
      return res.status(409).json({ success: false, message: 'Ship number already exists' });
    }

    const ship = await Ship.create({
      shipName: shipName.trim(),
      shipNumber: normalizedShipNumber,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: 'Ship created successfully',
      ship: serializeShip(ship),
    });
  } catch (error) {
    if (handleDuplicateShipNumber(error, res)) return;
    next(error);
  }
};

const getShips = async (req, res, next) => {
  try {
    const ships = await Ship.find().sort('-createdAt');
    return res.status(200).json({ ships: ships.map(serializeShip) });
  } catch (error) {
    next(error);
  }
};

const getShipById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Ship not found' });
    }

    const ship = await Ship.findById(req.params.id);
    if (!ship) return res.status(404).json({ success: false, message: 'Ship not found' });

    return res.status(200).json({ ship: serializeShip(ship) });
  } catch (error) {
    next(error);
  }
};

const updateShip = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Ship not found' });
    }

    const { shipName, shipNumber } = req.body;
    const validationError = validateShipInput(shipName, shipNumber);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const ship = await Ship.findById(req.params.id);
    if (!ship) return res.status(404).json({ success: false, message: 'Ship not found' });

    const normalizedShipNumber = normalizeShipNumber(shipNumber);
    const duplicateShip = await Ship.findOne({
      shipNumber: normalizedShipNumber,
      _id: { $ne: ship._id },
    });

    if (duplicateShip) {
      return res.status(409).json({ success: false, message: 'Ship number already exists' });
    }

    ship.shipName = shipName.trim();
    ship.shipNumber = normalizedShipNumber;
    await ship.save();

    return res.status(200).json({
      message: 'Ship updated successfully',
      ship: serializeShip(ship),
    });
  } catch (error) {
    if (handleDuplicateShipNumber(error, res)) return;
    next(error);
  }
};

const deleteShip = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Ship not found' });
    }

    const ship = await Ship.findByIdAndDelete(req.params.id);
    if (!ship) return res.status(404).json({ success: false, message: 'Ship not found' });

    return res.status(200).json({ message: 'Ship deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createShip,
  getShips,
  getShipById,
  updateShip,
  deleteShip,
};
