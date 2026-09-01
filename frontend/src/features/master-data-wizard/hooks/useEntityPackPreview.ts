import { useQuery } from '@tanstack/react-query';
import { getEntityPack } from '../services/entity-pack.service';
import type { EntityId, EntityPack } from '../dp-kit/types/entity';
import type { AppError } from '@/shared/types/result.types';
import { isAppError } from '@/shared/types/result.types';

interface UseEntityPackResult {
  readonly pack: EntityPack | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
}

export function useEntityPackPreview(entityId: EntityId): UseEntityPackResult {
  const query = useQuery({
    queryKey: ['entity-pack', entityId] as const,
    queryFn: async (): Promise<EntityPack> => {
      const result = await getEntityPack(entityId);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });

  const queryError: AppError | null =
    query.error != null
      ? isAppError(query.error)
        ? query.error
        : { code: 'entity_pack_unknown_error', message: String(query.error) }
      : null;

  return {
    pack: query.data ?? null,
    isLoading: query.isLoading,
    error: queryError,
    refetch: () => { void query.refetch(); },
  };
}
