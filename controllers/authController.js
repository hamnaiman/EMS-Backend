// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const Employee = require('../models/Employee');

const signToken = (employee) =>
  jwt.sign(
    { id: employee._id, role: employee.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

// Public self-signup — role is ALWAYS forced to 'employee'.
// Admin accounts should be created by an existing admin (see employeeController.addEmployee).
exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: 'Validation error', errors: errors.array() });
  }

  try {
    const { name, email, password } = req.body;

    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(409).json({ msg: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newEmployee = new Employee({
      name,
      email,
      password: hashedPassword,
      role: 'employee', // never trust role from client input
    });

    await newEmployee.save();

    const token = signToken(newEmployee);

    res.status(201).json({
      token,
      user: {
        id: newEmployee._id,
        name: newEmployee.name,
        email: newEmployee.email,
        role: newEmployee.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.signin = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: 'Validation error', errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // password field has select:false in the schema, so explicitly request it here
    const employee = await Employee.findOne({ email }).select('+password');
    if (!employee) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    if (!employee.isActive) {
      return res.status(403).json({ msg: 'This account has been deactivated' });
    }

    const token = signToken(employee);

    res.status(200).json({
      token,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (err) {
    next(err);
  }
};
