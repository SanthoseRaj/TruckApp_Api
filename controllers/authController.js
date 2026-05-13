const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROUTE_MARKERS, STOP_ROLE_MAP } = require('../constants/stops');

const entryTeams = ROUTE_MARKERS.map((marker) => ({
  id: STOP_ROLE_MAP[marker.stop],
  name: `${marker.stop} Entry Team`,
  stop: marker.stop,
  role: STOP_ROLE_MAP[marker.stop],
  order: marker.order,
  lat: marker.lat,
  lng: marker.lng,
}));

const buildToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  mobileNumber: user.mobileNumber,
  role: user.role,
  entryTeam: user.entryTeam,
});

const normalizeUsername = (username) => username.toLowerCase().trim();

const findEntryTeam = ({ entryTeamId, entryTeamName, entryTeamStop }) => {
  const normalizedId = entryTeamId?.toLowerCase().trim();
  const normalizedName = entryTeamName?.toLowerCase().trim();
  const normalizedStop = entryTeamStop?.toLowerCase().trim();

  return entryTeams.find(
    (team) =>
      team.id === normalizedId ||
      team.name.toLowerCase() === normalizedName ||
      team.stop.toLowerCase() === normalizedStop
  );
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: normalizeUsername(username) }).select('+password');

    if (!user || !user.isActive || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    return res.json({
      success: true,
      token: buildToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const getEntryTeams = async (req, res, next) => {
  try {
    return res.json({ success: true, entryTeams });
  } catch (error) {
    next(error);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const { name, mobileNumber, username, password } = req.body;

    if (!name || !mobileNumber || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin name, mobile number, username, and password are required',
      });
    }

    const normalizedUsername = normalizeUsername(username);
    const exists = await User.exists({ username: normalizedUsername });

    if (exists) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const admin = await User.create({
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      username: normalizedUsername,
      password,
      role: 'admin',
      isActive: true,
    });

    return res.status(201).json({ success: true, user: publicUser(admin) });
  } catch (error) {
    next(error);
  }
};

const createMember = async (req, res, next) => {
  try {
    const { name, mobileNumber, username, password, entryTeamId, entryTeamName, entryTeamStop } = req.body;

    if (!name || !mobileNumber || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Member name, mobile number, username, and password are required',
      });
    }

    const entryTeam = findEntryTeam({ entryTeamId, entryTeamName, entryTeamStop });

    if (!entryTeam) {
      return res.status(400).json({
        success: false,
        message: 'Valid entry team id, name, or stop is required',
      });
    }

    const normalizedUsername = normalizeUsername(username);
    const exists = await User.exists({ username: normalizedUsername });

    if (exists) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const member = await User.create({
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      username: normalizedUsername,
      password,
      role: entryTeam.role,
      entryTeam,
      isActive: true,
    });

    return res.status(201).json({ success: true, user: publicUser(member) });
  } catch (error) {
    next(error);
  }
};

const profile = async (req, res, next) => {
  try {
    return res.json({ success: true, user: publicUser(req.user) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  profile,
  getEntryTeams,
  createAdmin,
  createMember,
};
