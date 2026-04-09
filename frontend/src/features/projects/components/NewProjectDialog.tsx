import React, { useCallback } from 'react';
import { Dialog } from '@/shared/components/ui/Dialog';
import { useCreateProject } from '../hooks/useCreateProject';
import { useUserOrgs } from '../hooks/useUserOrgs';
import { ProjectForm } from './ProjectForm';
import type { ProjectCreate } from '../types/projects.types';
import type { CompanyId } from '@/shared/types/common.types';

interface NewProjectDialogProps {
  visible: boolean;
  onClose: () => void;
  companyId?: CompanyId;
  testID?: string;
}

export const NewProjectDialog = ({
  visible,
  onClose,
  companyId,
  testID,
}: NewProjectDialogProps): React.JSX.Element => {
  const mutation = useCreateProject(onClose);
  const { orgs } = useUserOrgs(visible);

  const handleSubmit = useCallback(
    (data: ProjectCreate) => {
      mutation.mutate(data);
    },
    [mutation],
  );

  return (
    <Dialog visible={visible} onClose={onClose} testID={testID}>
      <Dialog.Header>
        <Dialog.Title>Create New Project</Dialog.Title>
        <Dialog.Close onPress={onClose} testID="new-project-close" />
      </Dialog.Header>

      <Dialog.Content>
        <ProjectForm
          onSubmit={handleSubmit}
          isPending={mutation.isPending}
          onCancel={onClose}
          defaultCompanyId={companyId}
          companyOptions={orgs}
          testID="new-project-form"
        />
      </Dialog.Content>
    </Dialog>
  );
};