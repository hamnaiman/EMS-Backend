// controllers/employeeController.js
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const Employee = require('../models/Employee');

// GET /api/employees/me — logged-in employee's own profile
exports.getMe = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }
    res.json({ employee, tasks: [] });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees — admin only, paginated, searchable
exports.getEmployees = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = (req.query.search || '').trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Employee.countDocuments(filter),
    ]);

    res.status(200).json({
      employees,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/employees/:id — admin only
exports.getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }
    res.status(200).json(employee);
  } catch (err) {
    next(err);
  }
};

// POST /api/employees — admin only (can create admin or employee accounts)
exports.addEmployee = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: 'Validation error', errors: errors.array() });
  }

  try {
    const { name, email, position, department, password, role } = req.body;

    const existing = await Employee.findOne({ email });
    if (existing) {
      return res.status(409).json({ msg: 'An employee with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newEmployee = new Employee({
      name,
      email,
      position,
      department,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'employee',
    });

    await newEmployee.save();

    const { password: _pw, ...employeeData } = newEmployee.toObject();
    res.status(201).json({ message: 'Employee added successfully!', employee: employeeData });
  } catch (err) {
    next(err);
  }
};

// PUT /api/employees/:id — admin only, or the employee updating their own non-sensitive fields
exports.updateEmployee = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: 'Validation error', errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { name, email, position, department, role, isActive } = req.body;
    const updates = { name, email, position, department };

    // Only an admin may change role / active status
    if (isAdmin) {
      if (role) updates.role = role;
      if (typeof isActive === 'boolean') updates.isActive = isActive;
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedEmployee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    res.status(200).json(updatedEmployee);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/employees/:id — admin only
exports.deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ msg: 'You cannot delete your own account' });
    }

    const deleted = await Employee.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee deleted successfully!' });
  } catch (err) {
    next(err);
  }
};
