import { RepositoryOptions, ApiError, DomainError } from './types';

export class HttpClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(options: RepositoryOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  private mapError(status: number, raw: unknown): DomainError {
    let code: string;

    switch (status) {
      case 400:
        code = 'BAD_REQUEST';
        break;
      case 401:
        code = 'UNAUTHORIZED';
        break;
      case 403:
        code = 'FORBIDDEN';
        break;
      case 404:
        code = 'NOT_FOUND';
        break;
      case 409:
        code = 'CONFLICT';
        break;
      case 500:
        code = 'SERVER_ERROR';
        break;
      default:
        code = 'UNKNOWN';
    }

    return new DomainError(code, new ApiError(status, raw));
  }

  public async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/${path.replace(/^\//, '')}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        ...this.headers,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const raw = await response.json().catch(() => null);
      throw this.mapError(response.status, raw);
    }

    return response.json() as Promise<T>;
  }
}