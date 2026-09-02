import { useQuery } from '@tanstack/react-query';
import type { AppError } from '@/shared/types/result.types';
import type { EntityId, EntityPack } from '../types/entity-pack.types';
import { getEntityPack } from '../services/entity-pack.service';

interface EntityPackViewModel {
  readonly pack: EntityPack | null;
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
}

export function useEntityPack(
  orgProjectId: string,
  entityId: string,
): EntityPackViewModel {
  const query = useQuery({
    queryKey: ['entity-pack', orgProjectId, entityId] as const,
    queryFn: async (): Promise<EntityPack> => {
      const result = await getEntityPack(entityId as EntityId);
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
    retry: false,
  });

  return {
    pack: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: (query.error as AppError | null) ?? null,
    refetch: () => void query.refetch(),
  };
}
