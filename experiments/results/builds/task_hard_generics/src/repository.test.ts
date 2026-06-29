import { Repository, HttpClient, DomainError, ApiError, BaseEntity } from './index';

interface User extends BaseEntity {
  name: string;
  email: string;
}

describe('Repository', () => {
  const baseUrl = 'https://api.example.com';
  const headers = { Authorization: 'Bearer token' };
  let client: HttpClient;
  let repository: Repository<User>;

  beforeEach(() => {
    global.fetch = jest.fn();
    client = new HttpClient(baseUrl, headers);
    repository = new Repository<User>(client, 'users');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('findAll builds correct query string', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await repository.findAll({ page: 2, pageSize: 10 });

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/users?page=2&pageSize=10`,
      expect.any(Object)
    );
  });

  test('findById calls correct URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1' }),
    });

    await repository.findById('1');

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/users/1`,
      expect.objectContaining({ method: 'GET' })
    );
  });

  test('create sends POST with JSON', async () => {
    const payload = { name: 'John', email: 'john@example.com' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', ...payload }),
    });

    await repository.create(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/users`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });

  test('update sends PATCH', async () => {
    const payload = { name: 'Jane' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', ...payload }),
    });

    await repository.update('1', payload);

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/users/1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    );
  });

  test('remove sends DELETE', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await repository.remove('1');

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/users/1`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  test('non-ok response throws DomainError with correct code for 404', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(repository.findById('999')).rejects.toThrow(DomainError);
  });

  test('non-ok response carries NOT_FOUND code for 404', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    let caught: unknown;
    try {
      await repository.findById('999');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DomainError);
    expect((caught as DomainError).code).toBe('NOT_FOUND');
  });

  test('non-ok response carries UNAUTHORIZED code for 401', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    let caught: unknown;
    try {
      await repository.findAll({});
    } catch (e) {
      caught = e;
    }
    expect((caught as DomainError).code).toBe('UNAUTHORIZED');
  });

  test('non-ok response carries INTERNAL_SERVER_ERROR code for 500', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    let caught: unknown;
    try {
      await repository.findAll({});
    } catch (e) {
      caught = e;
    }
    expect((caught as DomainError).code).toBe('INTERNAL_SERVER_ERROR');
  });
});