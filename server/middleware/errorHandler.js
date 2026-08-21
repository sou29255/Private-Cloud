const errorHandler = (err, req, res, next) => {
  console.error(`[API ERROR] ${req.method} ${req.url} - ${err.stack || err.message}`);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected error occurred on the server.'
    },
    requestId: req.headers['x-request-id'] || `req_${Date.now()}`
  });
};

module.exports = errorHandler;
