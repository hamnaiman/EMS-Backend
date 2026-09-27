// middleware/requireAdmin.js
// Must run AFTER verifyToken so req.user is populated
module.exports = function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied: admin privileges required' });
  }
  next();
};
