export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}
