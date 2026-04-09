import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrgMember, OrgInvitation, OrgRole } from '../types/org.types';
import type { AppError } from '@/shared/types/result.types';
import type { Result } from '@/shared/types/result.types';
import type { UserId } from '@/shared/types/common.types';
import { httpClient } from '@/shared/services/http/http.instance';
import { toAppError } from '@/shared/services/http/http.client';
import { useAppStore } from '@/shared/store/app.store';
import { selectActiveOrgId } from '@/shared/store/app.selectors';
import {
  getOrgMembers,
  getOrgInvitations,
  inviteMember,
  removeMember,
  cancelInvitation,
  getUserOrgs,
} from '../services/org.service';

// ─── Return Type ────────────────────────────────────────────────────────────

interface MembersViewModel {
  readonly members: OrgMember[];
  readonly invitations: OrgInvitation[];
  readonly isOwner: boolean;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly invite: (params: { email: string; role: OrgRole }) => Promise<Result<OrgInvitation, AppError>>;
  readonly remove: (userId: UserId) => Promise<Result<undefined, AppError>>;
  readonly cancelInvitation: (invitationId: string) => Promise<Result<undefined, AppError>>;
  readonly isInviting: boolean;
  readonly isRemoving: boolean;
  readonly isCancelling: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useMembersViewModel(): MembersViewModel {
  const activeOrgId = useAppStore(selectActiveOrgId);
  const queryClient = useQueryClient();

  // Fetch orgs to derive isOwner (shares cache with useOrgsViewModel)
  const orgsQuery = useQuery({
    queryKey: ['orgs', 'me'] as const,
    queryFn: async () => {
      const result = await getUserOrgs(httpClient);
      if (!result.ok) throw result.error;
      return result.data;
    },
  });

  const isOwner =
    orgsQuery.data?.find((o) => o.id === activeOrgId)?.role === 'owner';

  // Members query
  const membersQuery = useQuery({
    queryKey: ['orgs', activeOrgId, 'members'] as const,
    queryFn: async () => {
      // enabled guard ensures activeOrgId is non-null when queryFn runs
      const orgId = activeOrgId!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      const result = await getOrgMembers(httpClient, orgId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: !!activeOrgId,
  });

  // Invitations query (owner only)
  const invitationsQuery = useQuery({
    queryKey: ['orgs', activeOrgId, 'invitations'] as const,
    queryFn: async () => {
      const orgId = activeOrgId!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      const result = await getOrgInvitations(httpClient, orgId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: !!activeOrgId && isOwner,
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (params: { email: string; role: OrgRole }) => {
      const orgId = activeOrgId!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      return inviteMember(httpClient, orgId, params.email, params.role);
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({
          queryKey: ['orgs', activeOrgId, 'invitations'],
        });
      }
    },
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: async (userId: UserId) => {
      const orgId = activeOrgId!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      return removeMember(httpClient, orgId, userId);
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({
          queryKey: ['orgs', activeOrgId, 'members'],
        });
      }
    },
  });

  // Cancel invitation mutation
  const cancelMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const orgId = activeOrgId!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      return cancelInvitation(httpClient, orgId, invitationId);
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({
          queryKey: ['orgs', activeOrgId, 'invitations'],
        });
      }
    },
  });

  const membersError: AppError | null =
    membersQuery.error != null ? toAppError(membersQuery.error) : null;

  const invitationsError: AppError | null =
    invitationsQuery.error != null ? toAppError(invitationsQuery.error) : null;

  return {
    members: membersQuery.data ?? [],
    invitations: invitationsQuery.data ?? [],
    isOwner,
    isLoading: membersQuery.isLoading || invitationsQuery.isLoading,
    error: membersError ?? invitationsError,
    invite: inviteMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    cancelInvitation: cancelMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
    isRemoving: removeMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}
