// models/Candidate.js
const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema(
  {
    jobRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobRole',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    // Full extracted resume text — kept so an admin can open and read the original content.
    resumeText: {
      type: String,
      default: '',
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    summary: {
      type: String,
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    relevant: {
      type: Boolean,
      default: false,
    },
    // "error" means the AI screening step failed for this file (bad PDF, API error, etc.)
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'rejected', 'error'],
      default: 'pending',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Candidate', CandidateSchema);
