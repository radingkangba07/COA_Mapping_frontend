declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type ProjectId = Brand<string, 'ProjectId'>;
export type FileId = Brand<string, 'FileId'>;
export type MappingId = Brand<string, 'MappingId'>;
export type JobId = Brand<string, 'JobId'>;
export type UserId = Brand<string, 'UserId'>;
export type CompanyId = Brand<string, 'CompanyId'>;

export function createProjectId(raw: string): ProjectId {
  return raw as ProjectId;
}

export function createFileId(raw: string): FileId {
  return raw as FileId;
}

export function createMappingId(raw: string): MappingId {
  return raw as MappingId;
}

export function createJobId(raw: string): JobId {
  return raw as JobId;
}

export function createUserId(raw: string): UserId {
  return raw as UserId;
}

export function createCompanyId(raw: string): CompanyId {
  return raw as CompanyId;
}

export type DeepReadonly<T> = T extends Date | RegExp | ((...args: unknown[]) => unknown)
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends readonly (infer U)[]
        ? ReadonlyArray<DeepReadonly<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
