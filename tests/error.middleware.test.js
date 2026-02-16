const { globalErrorHandler } = require('../api/middlewares/error.middleware');

describe('globalErrorHandler', () => {
  test('logs with req.log and includes requestId in response payload', () => {
    const error = new Error('Bad request payload');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';

    const req = {
      id: 'req-unit-1',
      originalUrl: '/portfolio',
      method: 'POST',
      headers: {},
      log: {
        error: jest.fn()
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    globalErrorHandler(error, req, res, jest.fn());

    expect(req.log.error).toHaveBeenCalledTimes(1);
    expect(req.log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-unit-1',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        path: '/portfolio',
        method: 'POST'
      }),
      'Request failed'
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Bad request payload',
          code: 'VALIDATION_ERROR',
          requestId: 'req-unit-1'
        })
      })
    );
  });
});
