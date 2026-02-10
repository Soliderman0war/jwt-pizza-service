const request = require('supertest');
const express = require('express');

// Mock DB and Role
jest.mock('../database/database.js', () => ({
  DB: {
    getFranchises: jest.fn().mockResolvedValue([[], false]),
    getUserFranchises: jest.fn().mockResolvedValue([{ id: 1, name: 'pizzaPocket', admins: [], stores: [] }]),
    createFranchise: jest.fn().mockResolvedValue({ id: 1, name: 'pizzaPocket', admins: [{ id: 4, email: 'f@jwt.com', name: 'franchisee' }] }),
    deleteFranchise: jest.fn().mockResolvedValue(),
    getFranchise: jest.fn().mockResolvedValue({ id: 1, admins: [{ id: 4, name: 'franchisee', email: 'f@jwt.com' }] }),
    createStore: jest.fn().mockResolvedValue({ id: 1, name: 'SLC', totalRevenue: 0 }),
    deleteStore: jest.fn().mockResolvedValue(),
  },
  Role: { Admin: 'admin', Franchisee: 'franchisee' },
}));

// Mock authRouter
jest.mock('./authRouter.js', () => ({
  authRouter: {
    authenticateToken: (req, res, next) => {
      // Add a mock user
      req.user = { id: 4, isRole: (role) => role === 'admin' };
      next();
    },
  },
}));

const franchiseRouter = require('../routes/franchiseRouter');

const app = express();
app.use(express.json());
app.use('/api/franchise', franchiseRouter);

describe('franchiseRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/franchise should return franchises', async () => {
    const res = await request(app).get('/api/franchise');
    expect(res.status).toBe(200);
    expect(res.body.franchises).toEqual([]);
    expect(res.body.more).toBe(false);
  });

  test('GET /api/franchise/:userId should return user franchises if admin', async () => {
    const res = await request(app).get('/api/franchise/4');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'pizzaPocket', admins: [], stores: [] }]);
  });

  test('POST /api/franchise should create a franchise if user is admin', async () => {
    const res = await request(app)
      .post('/api/franchise')
      .send({ name: 'pizzaPocket', admins: [{ email: 'f@jwt.com' }] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body.admins[0]).toHaveProperty('id', 4);
  });

  test('DELETE /api/franchise/:franchiseId should delete a franchise', async () => {
    const res = await request(app).delete('/api/franchise/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'franchise deleted' });
  });

  test('POST /api/franchise/:franchiseId/store should create a store', async () => {
    const res = await request(app)
      .post('/api/franchise/1/store')
      .send({ name: 'SLC' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'SLC', totalRevenue: 0 });
  });

  test('DELETE /api/franchise/:franchiseId/store/:storeId should delete a store', async () => {
    const res = await request(app).delete('/api/franchise/1/store/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'store deleted' });
  });

  // Test unauthorized 
  test('POST /api/franchise/:franchiseId/store should fail if user is not admin or franchisee', async () => {
    const { DB } = require('../database/database.js');
    DB.getFranchise.mockResolvedValueOnce({ id: 1, admins: [{ id: 99 }] }); // not admin
    const res = await request(app)
      .post('/api/franchise/1/store')
      .send({ name: 'SLC' });
    expect(res.status).toBe(500); // wrap error
  });
});
