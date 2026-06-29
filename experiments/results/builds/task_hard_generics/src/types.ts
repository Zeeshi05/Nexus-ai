export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type QueryFilter<T> = Partial<Pick<T, keyof T>> & {
  page?: number;
  pageSize?: number;
};

export interface RepositoryOptions {
  baseUrl: string;
  headers?: Record<string, string>;
}

export type CreatePayload<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdatePayload<T extends BaseEntity> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

export class ApiError extends Error {
  constructor(public statusCode: number, public raw: unknown) {
    super(`API Error: ${statusCode}`);
    this.name = 'ApiError';
  }
}

export class DomainError extends Error {
  constructor(public code: string, public cause?: ApiError) {
    super(`Domain Error: ${code}`);
    this.name = 'DomainError';
  }
}