import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import type { ProjectId, UserId } from '@/shared/types/common.types';
import type { AppError, Result } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { AccessResponse, AccessGrant, ProjectPermission } from '../types/project-access.types';
import { canManageMembers } from '../types/project-access.types';
import {
  getProjectMembers,
  grantProjectAccess,
  revokeProjectAccess,
} from '../services/project-access.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUERY_KEY_PREFIX = 'project-access' as const;

// ─── Return Type ──────────────────────────────────────────────────────────────

interface ProjectAccessViewModel {
  readonly members: readonly AccessResponse[];
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly canManage: boolean;
  readonly currentUserId: UserId | null;
  readonly grant: (grant: AccessGrant) => void;
  readonly grantAsync: (grant: AccessGrant) => Promise<Result<AccessResponse, AppError>>;
  readonly revoke: (userId: UserId) => void;
  readonly isGranting: boolean;
  readonly isRevoking: boolean;
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

function getRevokeErrorMessage(error: AppError): string {
  if (error.code === 'FORBIDDEN') {
    return 'You do not have permission to manage members';
  }
  return error.message;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectAccess(projectId: ProjectId): ProjectAccessViewModel {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.userId ?? null);
  const { showSuccess, showError } = useToast();

  const queryKey = [QUERY_KEY_PREFIX, projectId] as const;

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<AccessResponse[]> => {
      const result = await getProjectMembers(httpClient, projectId);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });

  const grantMutation = useMutation({
    mutationFn: (grant: AccessGrant) =>
      grantProjectAccess(httpClient, projectId, grant),
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

  const revokeMutation = useMutation({
    mutationFn: (userId: UserId) =>
      revokeProjectAccess(httpClient, projectId, userId),
    onSuccess: (result) => {
      if (!result.ok) {
        showError(getRevokeErrorMessage(result.error));
        return;
      }
      showSuccess('Member removed');
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      showError('Failed to remove member');
    },
  });

  const myPermission =
    query.data?.find((m) => m.userId === currentUserId)?.permission ?? null;

  const error: AppError | null =
    query.error != null ? toAppError(query.error) : null;

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    error,
    canManage: canManageMembers(myPermission),
    currentUserId,
    grant: grantMutation.mutate,
    grantAsync: grantMutation.mutateAsync,
    revoke: revokeMutation.mutate,
    isGranting: grantMutation.isPending,
    isRevoking: revokeMutation.isPending,
  };
}
