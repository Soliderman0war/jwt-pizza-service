jest.mock('mysql2/promise', () => ({
  createConnection: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../config.js', () => ({
  db: {
    connection: {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'testdb',
      connectTimeout: 1000,
    },
    listPerPage: 10,
  },
}));

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

let mockConnection;

beforeEach(() => {
  mockConnection = {
    execute: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  mysql.createConnection.mockResolvedValue(mockConnection);
});

afterEach(() => {
  jest.clearAllMocks();
});

const { DB, Role } = require('./database.js');

describe('Database Layer', () => {

  it('getMenu returns rows', async () => {
    const fakeRows = [{ id: 1, title: 'Veggie' }];
    mockConnection.execute.mockResolvedValue([fakeRows]);

    const result = await DB.getMenu();

    expect(result).toEqual(fakeRows);
    expect(mockConnection.end).toHaveBeenCalled();
  });

  it('addMenuItem inserts and returns item with id', async () => {
    mockConnection.execute.mockResolvedValue([{ insertId: 99 }]);

    const item = {
      title: 'Test',
      description: 'Desc',
      image: 'img.png',
      price: 10,
    };

    const result = await DB.addMenuItem(item);

    expect(result).toEqual({ ...item, id: 99 });
  });

  it('getUser throws if password mismatch', async () => {
    const userRow = [{ id: 1, email: 'test@test.com', password: 'hashed' }];

    mockConnection.execute.mockResolvedValueOnce([userRow]);
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      DB.getUser('test@test.com', 'wrong')
    ).rejects.toThrow();
  });

  it('updateUser updates fields and returns updated user', async () => {
    bcrypt.hash.mockResolvedValue('hashedPassword');


    mockConnection.execute.mockResolvedValueOnce([{}]);

    jest.spyOn(DB, 'getUser').mockResolvedValue({ id: 1 });

    const result = await DB.updateUser(1, 'Name', 'email@test.com', 'pass');

    expect(result).toEqual({ id: 1 });
  });

  it('getOrders returns orders with items', async () => {
    const orders = [{ id: 10, franchiseId: 1, storeId: 1 }];
    const items = [{ id: 1, menuId: 1 }];

    mockConnection.execute
      .mockResolvedValueOnce([orders])
      .mockResolvedValueOnce([items]);

    const user = { id: 1 };

    const result = await DB.getOrders(user, 1);

    expect(result.dinerId).toBe(1);
    expect(result.orders[0].items).toEqual(items);
  });

  it('getOffset calculates correct offset', () => {
    const offset = DB.getOffset(2, 10);
    expect(offset).toBe(10);
  });

  it('getTokenSignature extracts signature', () => {
    const token = 'aaa.bbb.ccc';
    expect(DB.getTokenSignature(token)).toBe('ccc');
  });

  it('getTokenSignature returns empty string if invalid', () => {
    expect(DB.getTokenSignature('invalid')).toBe('');
  });

});


describe('database extended coverage', () => {
  test('addUser with franchise role', async () => {
    bcrypt.hash.mockResolvedValue('hashed');
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([[{ id: 5 }]])
      .mockResolvedValueOnce([{}]);

    const user = {
      name: 'User',
      email: 'u@test.com',
      password: 'pass',
      roles: [{ role: Role.Franchisee, object: 'FranchiseA' }],
    };

    const result = await DB.addUser(user);
    expect(result.id).toBe(10);
  });

  test('loginUser / isLoggedIn / logoutUser', async () => {
    mockConnection.execute.mockResolvedValueOnce([{}]);
    await DB.loginUser(1, 'a.b.c');

    mockConnection.execute.mockResolvedValueOnce([[{ userId: 1 }]]);
    const loggedIn = await DB.isLoggedIn('a.b.c');
    expect(loggedIn).toBe(true);

    mockConnection.execute.mockResolvedValueOnce([{}]);
    await DB.logoutUser('a.b.c');
  });

  test('addDinerOrder', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 100 }])
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{}]);

    const user = { id: 1 };
    const order = {
      franchiseId: 1,
      storeId: 1,
      items: [{ menuId: 1, description: 'Pizza', price: 5 }],
    };

    const result = await DB.addDinerOrder(user, order);
    expect(result.id).toBe(100);
  });

  test('createFranchise success', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 2, name: 'Admin' }]])
      .mockResolvedValueOnce([{ insertId: 20 }])
      .mockResolvedValueOnce([{}]);

    const franchise = {
      name: 'FranchiseX',
      admins: [{ email: 'admin@test.com' }],
    };

    const result = await DB.createFranchise(franchise);
    expect(result.id).toBe(20);
  });

  test('createFranchise unknown admin throws', async () => {
    mockConnection.execute.mockResolvedValueOnce([[]]);

    await expect(
      DB.createFranchise({
        name: 'F',
        admins: [{ email: 'bad@test.com' }],
      })
    ).rejects.toThrow();
  });

  test('deleteFranchise success', async () => {
    mockConnection.execute.mockResolvedValue([{}]);

    await DB.deleteFranchise(1);

    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  test('getFranchises non-admin', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 1, name: 'F1' }]])
      .mockResolvedValueOnce([[{ id: 1, name: 'Store1' }]]);

    const user = {
      isRole: () => false,
    };

    const [franchises] = await DB.getFranchises(user, 0, 1, '*');
    expect(franchises[0].stores).toBeDefined();
  });

  test('getUserFranchises empty', async () => {
    mockConnection.execute.mockResolvedValueOnce([[]]);
    const result = await DB.getUserFranchises(1);
    expect(result).toEqual([]);
  });

  test('getUserFranchises populated', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[{ objectId: 1 }]])
      .mockResolvedValueOnce([[{ id: 1, name: 'F1' }]])
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ id: 1 }]]);

    const result = await DB.getUserFranchises(1);
    expect(result.length).toBe(1);
  });

  test('getFranchise', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ id: 1 }]]);

    const franchise = { id: 1 };
    const result = await DB.getFranchise(franchise);
    expect(result.admins).toBeDefined();
  });

  test('createStore', async () => {
    mockConnection.execute.mockResolvedValueOnce([{ insertId: 5 }]);
    const result = await DB.createStore(1, { name: 'StoreX' });
    expect(result.id).toBe(5);
  });

  test('deleteStore', async () => {
    mockConnection.execute.mockResolvedValueOnce([{}]);
    await DB.deleteStore(1, 1);
  });

  test('checkDatabaseExists true', async () => {
    mockConnection.execute.mockResolvedValueOnce([[{ SCHEMA_NAME: 'testdb' }]]);
    const result = await DB.checkDatabaseExists(mockConnection);
    expect(result).toBe(true);
  });

describe('database extra', () => {

  test('addUser default role branch', async () => {
    const { DB } = require('./database.js');

    bcrypt.hash.mockResolvedValue('hashed');

    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 1 }])
      .mockResolvedValueOnce([{}]);

    const user = {
      name: 'A',
      email: 'a@a.com',
      password: 'pass',
      roles: [{ role: 'admin' }],
    };

    const result = await DB.addUser(user);
    expect(result.id).toBe(1);
  });

  test('getOrders pagination', async () => {
    const { DB } = require('./database.js');

    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ id: 10 }]]);

    const result = await DB.getOrders({ id: 1 }, 2);
    expect(result.page).toBe(2);
  });

  test('getFranchises more branch', async () => {
    const { DB, Role } = require('./database.js');

    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }, { id: 3 }]])
      .mockResolvedValue([[{ id: 1 }]]);

    const user = { isRole: (r) => r === Role.Admin };

    const [franchises, more] = await DB.getFranchises(user, 0, 2, '*');
    expect(more).toBe(true);
    expect(franchises.length).toBe(2);
  });

  test('getID failure throws', async () => {
    const { DB } = require('./database.js');

    mockConnection.execute.mockResolvedValueOnce([[]]);

    await expect(
      DB.getID(mockConnection, 'id', 1, 'menu')
    ).rejects.toThrow();
  });

  test('query wrapper returns results', async () => {
    const { DB } = require('./database.js');

    mockConnection.execute.mockResolvedValueOnce([[{ id: 1 }]]);
    const result = await DB.query(mockConnection, 'SELECT 1');
    expect(result.length).toBe(1);
  });

  test('_getConnection sets USE database', async () => {
    const { DB } = require('./database.js');

    mockConnection.query.mockResolvedValueOnce([{}]);
    const conn = await DB._getConnection(true);
    expect(conn).toBe(mockConnection);
  });

  test('getConnection waits for initialized', async () => {
    const { DB } = require('./database.js');
    DB.initialized = Promise.resolve();
    const conn = await DB.getConnection();
    expect(conn).toBe(mockConnection);
  });

  test('checkDatabaseExists false', async () => {
    const { DB } = require('./database.js');

    mockConnection.execute.mockResolvedValueOnce([[]]);
    const exists = await DB.checkDatabaseExists(mockConnection);
    expect(exists).toBe(false);
  });
});
});