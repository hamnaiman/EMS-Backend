const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getMe,
  getEmployees,
  getEmployeeById,
  addEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');

const employeeValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const addEmployeeValidation = [
  ...employeeValidation,
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// All routes below require a valid token
router.use(verifyToken);

router.get('/me', getMe);
router.get('/', requireAdmin, getEmployees);
router.get('/:id', requireAdmin, getEmployeeById);
router.post('/', requireAdmin, addEmployeeValidation, addEmployee);
router.put('/:id', employeeValidation, updateEmployee); // admin OR self, enforced in controller
router.delete('/:id', requireAdmin, deleteEmployee);

module.exports = router;
