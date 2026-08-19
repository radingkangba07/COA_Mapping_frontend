import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { toAppError } from '@/shared/services/http/http.client';
import type { AppError } from '@/shared/types/result.types';
import type { EntityPack } from '../types/entity';

interface EntityPackViewModel {
  readonly pack: EntityPack | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
}

export function useEntityPack(
  orgProjectId: string,
  entityId: string,
): EntityPackViewModel {
  const query = useQuery({
    queryKey: ['entity-pack', orgProjectId, entityId] as const,
    queryFn: async (): Promise<EntityPack> => {
      const { data } = await httpClient.get<EntityPack>(
        `/api/v1/projects/${orgProjectId}/entities/${entityId}/profile`,
      );
      return data;
    },
    retry: false,
  });

  return {
    pack: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error != null ? toAppError(query.error) : null,
  };
}
