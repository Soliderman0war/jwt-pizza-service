const DB = {
  addUser: jest.fn(),
  getUser: jest.fn(),
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
  isLoggedIn: jest.fn(),
};

const Role = {
  Diner: 'diner',
};

module.exports = { DB, Role };
