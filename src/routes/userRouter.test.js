const request = require('supertest');
const express = require('express');

jest.mock('../database/database.js', () => ({
  Role: {
    Admin: 'Admin',
  },
  DB: {
    updateUser: jest.fn(),
  },
}));

jest.mock('./authRouter.js', () => ({
  authRouter: {
    authenticateToken: (req, res, next) => {
      req.user = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        roles: [{ role: 'diner' }],
        isRole: jest.fn().mockReturnValue(false),
      };
      next();
    },
  },
  setAuth: jest.fn(),
}));

const { DB, Role } = require('../database/database.js');
const { setAuth } = require('./authRouter.js');
const userRouter = require('./userRouter');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user', userRouter);
  return app;
}

describe('User Router', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /me', () => {
    it('returns authenticated user', async () => {
      const res = await request(app).get('/api/user/me');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
      });
    });
  });

  describe('PUT /:userId', () => {
    it('updates self', async () => {
      const updatedUser = {
        id: 1,
        name: 'Updated',
        email: 'update@test.com',
        roles: [],
      };

      DB.updateUser.mockResolvedValue(updatedUser);
      setAuth.mockResolvedValue('new-token');

      const res = await request(app)
        .put('/api/user/1')
        .send({
          name: 'Updated',
          email: 'update@test.com',
          password: 'pass',
        });

      expect(DB.updateUser).toHaveBeenCalledWith(
        1,
        'Updated',
        'update@test.com',
        'pass'
      );

      expect(setAuth).toHaveBeenCalledWith(updatedUser);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: updatedUser,
        token: 'new-token',
      });
    });

      jest.doMock('./authRouter.js', () => ({
        authRouter: adminAuth,
        setAuth: jest.fn().mockResolvedValue('admin-token'),
      }));

      const router = require('./userRouter');
      adminApp.use('/api/user', router);

      DB.updateUser.mockResolvedValue({ id: 2 });

      const res = await request(adminApp)
        .put('/api/user/2')
        .send({ name: 'Other' });

      expect(res.status).toBe(200);
    });

    it('returns 403 if not self or admin', async () => {
      const res = await request(app)
        .put('/api/user/2')
        .send({ name: 'Hack Attempt' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'unauthorized' });
    });
  });

  describe('DELETE /:userId', () => {
    it('returns not implemented', async () => {
      const res = await request(app)
        .delete('/api/user/1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'not implemented' });
    });
  });

  describe('GET /', () => {
    it('returns not implemented users list', async () => {
      const res = await request(app)
        .get('/api/user');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'not implemented',
        users: [],
        more: false,
      });
    });
  });  
