const DB = {
  initializeDatabase: jest.fn(),
  addUser: jest.fn(),
  getUser: jest.fn(),
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
  isLoggedIn: jest.fn(),
};

const Role = {
  Diner: 'diner',
  Admin: 'admin',
  Franchisee: 'franchisee',
};

module.exports = { DB, Role };
