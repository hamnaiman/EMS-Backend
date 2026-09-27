// controllers/recruitmentController.js
const { validationResult } = require('express-validator');
const JobRole = require('../models/JobRole');
const Candidate = require('../models/Candidate');
const { screenResume } = require('../services/aiClient');

// unpdf ESM-only hai, isliye lazy dynamic import (CommonJS project mein safe)
async function extractPdfText(buffer) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return (text || '').trim();
}

// POST /api/recruitment/roles
exports.createJobRole = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: 'Validation error', errors: errors.array() });
  }

  try {
    const { title, requirements } = req.body;
    const jobRole = await JobRole.create({
      title,
      requirements,
      createdBy: req.user.id,
    });
    res.status(201).json(jobRole);
  } catch (err) {
    next(err);
  }
};

// GET /api/recruitment/roles
exports.getJobRoles = async (req, res, next) => {
  try {
    const roles = await JobRole.find().sort({ createdAt: -1 });

    const counts = await Candidate.aggregate([
      { $group: { _id: '$jobRole', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

    const withCounts = roles.map((role) => ({
      ...role.toObject(),
      candidateCount: countMap[String(role._id)] || 0,
    }));

    res.status(200).json(withCounts);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/recruitment/roles/:id
exports.deleteJobRole = async (req, res, next) => {
  try {
    const role = await JobRole.findByIdAndDelete(req.params.id);
    if (!role) {
      return res.status(404).json({ msg: 'Job role not found' });
    }
    await Candidate.deleteMany({ jobRole: req.params.id });
    res.status(200).json({ message: 'Job role and its candidates deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/recruitment/roles/:id/upload  (multipart, field name "cvs", up to 20 PDFs)
exports.uploadCandidates = async (req, res, next) => {
  try {
    const jobRole = await JobRole.findById(req.params.id);
    if (!jobRole) {
      return res.status(404).json({ msg: 'Job role not found' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ msg: 'No files uploaded' });
    }

    const results = [];

    for (const file of files) {
      try {
        const resumeText = await extractPdfText(file.buffer); // 👈 fixed: sirf ek declaration

        if (!resumeText) {
          results.push(
            await Candidate.create({
              jobRole: jobRole._id,
              fileName: file.originalname,
              status: 'error',
              errorMessage: 'Could not extract any text from this PDF (it may be a scanned image).',
            })
          );
          continue;
        }

        const screening = await screenResume(jobRole.title, jobRole.requirements, resumeText);

        results.push(
          await Candidate.create({
            jobRole: jobRole._id,
            fileName: file.originalname,
            resumeText,
            name: screening.name,
            email: screening.email,
            phone: screening.phone,
            matchScore: screening.matchScore,
            relevant: screening.relevant,
            summary: screening.summary,
            skills: screening.skills,
            status: 'pending',
          })
        );
      } catch (fileErr) {
        results.push(
          await Candidate.create({
            jobRole: jobRole._id,
            fileName: file.originalname,
            status: 'error',
            errorMessage: fileErr.message.slice(0, 300),
          })
        );
      }
    }

    res.status(201).json({
      message: `Screened ${results.length} CV(s)`,
      candidates: results,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/recruitment/roles/:id/candidates
exports.getCandidates = async (req, res, next) => {
  try {
    const candidates = await Candidate.find({ jobRole: req.params.id }).sort({
      matchScore: -1,
      createdAt: -1,
    });
    res.status(200).json(candidates);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/recruitment/candidates/:id
exports.updateCandidateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'shortlisted', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!candidate) {
      return res.status(404).json({ msg: 'Candidate not found' });
    }

    res.status(200).json(candidate);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/recruitment/candidates/:id
exports.deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ msg: 'Candidate not found' });
    }
    res.status(200).json({ message: 'Candidate removed' });
  } catch (err) {
    next(err);
  }
};

// GET /api/recruitment/candidates/relevant  (top relevant candidates across all roles)
exports.getRelevantCandidates = async (req, res, next) => {
  try {
    const candidates = await Candidate.find({ relevant: true, status: { $ne: 'rejected' } })
      .populate('jobRole', 'title')
      .sort({ matchScore: -1, createdAt: -1 })
      .limit(6);

    res.status(200).json(candidates);
  } catch (err) {
    next(err);
  }
};