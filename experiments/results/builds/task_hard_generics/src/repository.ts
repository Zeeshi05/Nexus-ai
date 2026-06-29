import { HttpClient } from './client';
import {
  BaseEntity,
  PaginatedResponse,
  QueryFilter,
  CreatePayload,
  UpdatePayload,
  RepositoryOptions,
} from './types';

export class Repository<T extends BaseEntity> {
  private readonly client: HttpClient;

  constructor(private readonly resourcePath: string, options: RepositoryOptions) {
    this.client = new HttpClient(options);
  }

  public async findAll(filter?: QueryFilter<T>): Promise<PaginatedResponse<T>> {
    const params = new URLSearchParams();

    if (filter) {
      (Object.keys(filter) as Array<keyof QueryFilter<T>>).forEach((key) => {
        const value = filter[key];
        if (value !== undefined && value !== null) {
          params.append(key as string, String(value));
        }
      });
    }

    const queryString = params.toString();
    const path = queryString ? `${this.resourcePath}?${queryString}` : this.resourcePath;

    return this.client.request<PaginatedResponse<T>>(path, {
      method: 'GET',
    });
  }

  public async findById(id: string): Promise<T> {
    return this.client.request<T>(`${this.resourcePath}/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  public async create(payload: CreatePayload<T>): Promise<T> {
    return this.client.request<T>(this.resourcePath, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async update(id: string, payload: UpdatePayload<T>): Promise<T> {
    return this.client.request<T>(`${this.resourcePath}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async remove(id: string): Promise<void> {
    await this.client.request<void>(`${this.resourcePath}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}