const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://localhost:7021',
      changeOrigin: true,
      secure: false,
    })
  );
};
