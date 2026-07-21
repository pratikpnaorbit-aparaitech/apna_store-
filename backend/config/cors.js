const defaultAllowedOrigins = [
  'https://apnastore.aparaitech.org',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
];

const createCorsOptions = (configuredOrigins = process.env.ALLOWED_ORIGINS) => {
  const allowedOrigins = new Set(
    (configuredOrigins ? configuredOrigins.split(',') : defaultAllowedOrigins)
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  return {
    origin(origin, callback) {
      // Native mobile clients and server-to-server requests do not send Origin.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      const error = new Error('Origin not allowed by CORS');
      error.status = 403;
      return callback(error);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Idempotency-Key',
    ],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };
};

module.exports = {
  createCorsOptions,
  defaultAllowedOrigins,
};
