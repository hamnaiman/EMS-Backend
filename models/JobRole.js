// models/JobRole.js
const mongoose = require('mongoose');

const JobRoleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    // Free-text requirements/description — this is what the AI matches each CV against.
    requirements: {
      type: String,
      required: [true, 'Job requirements are required'],
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobRole', JobRoleSchema);
