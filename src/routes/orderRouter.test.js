const request = require('supertest');
const express = require('express');

jest.mock('../database/database.js', () => ({
  Role: {
    Admin: 'Admin',
  },
  DB: {
    getMenu: jest.fn(),
    addMenuItem: jest.fn(),
    getOrders: jest.fn(),
    addDinerOrder: jest.fn(),
  },
}));

jest.mock('../config.js', () => ({
  factory: {
    url: 'http://fake',
    apiKey: 'factory-api-key',
  },
}));

// Mock auth middleware
jest.mock('./authRouter.js', () => ({
  authRouter: {
    authenticateToken: (req, res, next) => {
      req.user = {
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        isRole: jest.fn().mockReturnValue(true),
      };
      next();
    },
  },
}));

global.fetch = jest.fn();

const { DB, Role } = require('../database/database.js');
const orderRouter = require('./orderRouter');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/order', orderRouter);
  return app;
}

describe('Order Router', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /menu', () => {
    it('returns menu', async () => {
      const menu = [{ id: 1, title: 'Cheese' }];
      DB.getMenu.mockResolvedValue(menu);

      const res = await request(app).get('/api/order/menu');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(menu);
      expect(DB.getMenu).toHaveBeenCalled();
    });
  });

  describe('PUT /menu', () => {
    it('adds menu item when admin', async () => {
      const menu = [{ id: 2, title: 'Student' }];
      DB.getMenu.mockResolvedValue(menu);

      const newItem = {
        title: 'Student',
        description: 'Cheese pizza',
        image: 'pizza.png',
        price: 1,
      };

      const res = await request(app)
        .put('/api/order/menu')
        .send(newItem);

      expect(DB.addMenuItem).toHaveBeenCalledWith(newItem);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(menu);
    });

    it('returns 403 if not admin', async () => {
      const nonAdminApp = express();
      nonAdminApp.use(express.json());

      jest.doMock('./authRouter.js', () => ({
        authRouter: {
          authenticateToken: (req, res, next) => {
            req.user = {
              isRole: jest.fn().mockReturnValue(false),
            };
            next();
          },
        },
      }));

      const router = require('./orderRouter');
      nonAdminApp.use('/api/order', router);

      const res = await request(nonAdminApp)
        .put('/api/order/menu')
        .send({});

      expect(res.status).toBe(403);
    });
  });

  describe('GET /', () => {
    it('returns user orders', async () => {
      const orders = { dinerId: 1, orders: [] };
      DB.getOrders.mockResolvedValue(orders);

      const res = await request(app).get('/api/order?page=1');

      expect(DB.getOrders).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body).toEqual(orders);
    });
  });

  describe('POST /', () => {
    it('creates order and returns factory response when successful', async () => {
      const orderReq = {
        franchiseId: 1,
        storeId: 1,
        items: [{ menuId: 1, description: 'Veggie', price: 5 }],
      };

      const order = { ...orderReq, id: 99 };
      DB.addDinerOrder.mockResolvedValue(order);

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          reportUrl: 'http://report',
          jwt: 'new-jwt',
        }),
      });

      const res = await request(app)
        .post('/api/order')
        .send(orderReq);

      expect(DB.addDinerOrder).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        'http://fake/api/order',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        order,
        followLinkToEndChaos: 'http://report',
        jwt: 'new-jwt',
      });
    });

    it('returns 500 if factory fails', async () => {
      const order = { id: 1 };
      DB.addDinerOrder.mockResolvedValue(order);

      fetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          reportUrl: 'http://error-report',
        }),
      });

      const res = await request(app)
        .post('/api/order')
        .send({});

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        message: 'Failed to fulfill order at factory',
        followLinkToEndChaos: 'http://error-report',
      });
    });
  });
});
