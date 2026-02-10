const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../database/database.js');
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn((payload) => payload),
}));

const { DB } = require('../database/database.js');
const { authRouter, setAuthUser} = require('../routes/authRouter');

const app = express();
app.use(express.json());
app.use(setAuthUser);
app.use('/api/auth', authRouter);

describe('authRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers a new user', async() => {
    DB.addUser.mockResolvedValue({
      id: 1,
      name: 'Pizza Diner',
      email: 'd@jwt.com',
      roles: [{ role: 'diner' }],
    });

    DB.loginUser.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth')
      .send({ name: 'Pizza Diner', email: 'd@jwt.com', password: 'pw' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('mock-token');
    expect(DB.addUser).toHaveBeenCalled();
  });

  test('fails registration with missing fields', async() => {
    const res = await request(app)
      .post('/api/auth')
      .send({ email: 'bad@jwt.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/);
  });

  test('logs in an existing user', async() => {
    DB.getUser.mockResolvedValue({
      id: 2,
      email: 'a@jwt.com',
      roles: [{ role: 'admin' }],
    });

    DB.loginUser.mockResolvedValue(true);

    const res = await request(app)
      .put('/api/auth')
      .send({ email: 'a@jwt.com', password: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('mock-token');
  });

  test('rejects logout without auth', async() => {
    const res = await request(app).delete('/api/auth');
    expect(res.status).toBe(401);
  });

  test('logs out an authenticated user', async() => {
    DB.isLoggedIn.mockResolvedValue(true);
    DB.logoutUser.mockResolvedValue(true);

    jwt.verify.mockReturnValue({
      id: 1,
      roles: [{ role: 'diner' }],
    });

    const res = await request(app)
      .delete('/api/auth')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('logout successful');
    expect(DB.logoutUser).toHaveBeenCalled();
  });
});
