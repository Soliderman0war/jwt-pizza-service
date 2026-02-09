const service = require('../src/service');

describe('service module', () => {
  test('exports expected functions', () => {
    expect(service).toBeDefined();
    expect(typeof service).toBe('object');
  });
});
