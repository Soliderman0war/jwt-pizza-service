module.exports = {
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn((user) => user),
};
