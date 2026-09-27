// routes/recruitment.js
const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const router = express.Router();

const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const {
  createJobRole,
  getJobRoles,
  deleteJobRole,
  uploadCandidates,
  getCandidates,
  getRelevantCandidates,
  updateCandidateStatus,
  deleteCandidate,
} = require('../controllers/recruitmentController');

// CVs are kept in memory only long enough to extract text — never written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted'));
    }
    cb(null, true);
  },
});

const jobRoleValidation = [
  body('title').trim().notEmpty().withMessage('Job title is required'),
  body('requirements').trim().notEmpty().withMessage('Job requirements are required'),
];

// Recruitment/screening is an admin-only feature.
router.use(verifyToken, requireAdmin);

router.post('/roles', jobRoleValidation, createJobRole);
router.get('/roles', getJobRoles);
router.delete('/roles/:id', deleteJobRole);

router.post('/roles/:id/upload', upload.array('cvs', 20), uploadCandidates);
router.get('/roles/:id/candidates', getCandidates);

// Must come before /candidates/:id — otherwise Express treats "relevant" as an :id value.
router.get('/candidates/relevant', getRelevantCandidates);

router.patch('/candidates/:id', updateCandidateStatus);
router.delete('/candidates/:id', deleteCandidate);

module.exports = router;