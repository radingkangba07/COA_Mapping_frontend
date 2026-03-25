import React, { useCallback } from 'react';
import { Dialog } from '@/shared/components/ui/Dialog';
import { useCreateProject } from '../hooks/useCreateProject';
import { ProjectForm } from './ProjectForm';
import type { ProjectCreate } from '../types/projects.types';

interface NewProjectDialogProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

export const NewProjectDialog = ({
  visible,
  onClose,
  testID,
}: NewProjectDialogProps): React.JSX.Element => {
  const mutation = useCreateProject(onClose);

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
          testID="new-project-form"
        />
      </Dialog.Content>
    </Dialog>
  );
};
