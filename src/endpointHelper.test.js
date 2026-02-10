const { asyncHandler } = require('../src/endpointHelper');

describe('asyncHandler', () => {
  test('calls next on success', async () => {
    const fn = asyncHandler(async (req, res,) => {
      res.send('ok');
    });

    const res = { send: jest.fn() };
    const next = jest.fn();

    await fn({}, res, next);
    expect(res.send).toHaveBeenCalledWith('ok');
  });

  test('calls next on error', async () => {
    const fn = asyncHandler(async () => {
      throw new Error('fail');
    });

    const next = jest.fn();
    await fn({}, {}, next);

    expect(next).toHaveBeenCalled();
  });
});
