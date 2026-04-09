import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import type { ProjectId, UserId } from '@/shared/types/common.types';
import type { AppError, Result } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { AccessResponse, AccessGrant } from '../types/project-access.types';
import { canManageMembers } from '../types/project-access.types';
import {
  getProjectMembers,
  grantProjectAccess,
} from '../services/project-access.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUERY_KEY_PREFIX = 'project-access' as const;
const EMPTY_MEMBERS: readonly AccessResponse[] = [];

// ─── Return Type ──────────────────────────────────────────────────────────────

interface ProjectAccessViewModel {
  readonly members: readonly AccessResponse[];
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly canManage: boolean;
  readonly currentUserId: UserId | null;
  readonly grant: (grant: AccessGrant) => void;
  readonly grantAsync: (grant: AccessGrant) => Promise<Result<AccessResponse, AppError>>;
  readonly isGranting: boolean;
}

// ─── Error Messages ───────────────────────────────────────────────────────────

function getGrantErrorMessage(error: AppError): string {
  if (error.code === 'CONFLICT') {
    return 'User already has access to this project';
  }
  if (error.code === 'FORBIDDEN') {
    return 'You do not have permission to manage members';
  }
  return error.message;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectAccess(
  projectId: ProjectId | null,
): ProjectAccessViewModel {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.userId ?? null);
  const { showSuccess, showError } = useToast();

  const queryKey = [QUERY_KEY_PREFIX, projectId] as const;

  const query = useQuery({
    queryKey,
    enabled: projectId !== null,
    queryFn: async (): Promise<AccessResponse[]> => {
      // Safe: enabled guarantees projectId is non-null when queryFn runs
      const id = projectId as ProjectId;
      const result = await getProjectMembers(httpClient, id);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });

  const grantMutation = useMutation({
    mutationFn: (grant: AccessGrant) => {
      if (projectId === null) {
        return Promise.reject(
          toAppError(new Error('Cannot grant access without a project')),
        );
      }
      return grantProjectAccess(httpClient, projectId, grant);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        showError(getGrantErrorMessage(result.error));
        return;
      }
      showSuccess('User added to project');
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      showError('Failed to add member');
    },
  });

  const myPermission =
    query.data?.find((m) => m.userId === currentUserId)?.permission ?? null;

  const error: AppError | null =
    query.error != null ? toAppError(query.error) : null;

  return {
    members: query.data ?? EMPTY_MEMBERS,
    isLoading: query.isLoading,
    error,
    canManage: canManageMembers(myPermission),
    currentUserId,
    grant: grantMutation.mutate,
    grantAsync: grantMutation.mutateAsync,
    isGranting: grantMutation.isPending,
  };
}
