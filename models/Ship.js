const mongoose = require('mongoose');

const shipSchema = new mongoose.Schema(
  {
    shipName: {
      type: String,
      required: [true, 'Ship name is required'],
      trim: true,
    },
    shipNumber: {
      type: String,
      required: [true, 'Ship number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ship', shipSchema);
