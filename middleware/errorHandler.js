// middleware/errorHandler.js
// Centralized error handler — keep as the LAST app.use() in index.js
module.exports = function errorHandler(err, req, res, next) {
  console.error(err.stack || err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ msg: 'Validation error', details: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ msg: 'Duplicate field value', field: Object.keys(err.keyValue || {})[0] });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ msg: 'Invalid ID format' });
  }

  res.status(err.status || 500).json({ msg: err.message || 'Server error' });
};
