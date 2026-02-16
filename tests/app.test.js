const request = require('supertest');
const express = require('express');
require('express-async-errors');

const { createApp } = require('../app');
const { globalErrorHandler } = require('../api/middlewares/error.middleware');

describe('App routes', () => {
  test('GET /health returns expected payload and request id', async () => {
    const app = createApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('financeos-api');
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  test('GET /unknown returns standardized 404 error response', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/unknown')
      .set('x-request-id', 'req-test-404');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Route not found');
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.error.requestId).toBe('req-test-404');
    expect(response.body.error.stack).toBeDefined();
  });

  test('production responses do not expose stack traces', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const app = createApp();
    const response = await request(app)
      .get('/unknown')
      .set('x-request-id', 'req-prod-404');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.requestId).toBe('req-prod-404');
    expect(response.body.error.stack).toBeUndefined();

    process.env.NODE_ENV = previousNodeEnv;
  });

  test('thrown async route errors are caught by global error handler', async () => {
    const app = express();
    app.get('/boom', async () => {
      const error = new Error('Service exploded');
      error.code = 'SERVICE_FAILURE';
      throw error;
    });
    app.use(globalErrorHandler);

    const response = await request(app)
      .get('/boom')
      .set('x-request-id', 'req-boom-1');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Service exploded');
    expect(response.body.error.code).toBe('SERVICE_FAILURE');
    expect(response.body.error.requestId).toBe('req-boom-1');
  });
});
