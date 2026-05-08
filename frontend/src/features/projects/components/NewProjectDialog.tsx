import React, { useCallback, useMemo, useState } from 'react';
import { Dialog } from '@/shared/components/ui/Dialog';
import { useCreateProject } from '../hooks/useCreateProject';
import { useUserOrgs } from '../hooks/useUserOrgs';
import { ProjectForm } from './ProjectForm';
import { CreateClientOrgDialog } from './CreateClientOrgDialog';
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
  const { orgs, employerOrgs } = useUserOrgs(visible);
  const [createCompanyVisible, setCreateCompanyVisible] = useState(false);

  const parentOrgId = useMemo(
    () => employerOrgs[0]?.id ?? null,
    [employerOrgs],
  );

  const handleSubmit = useCallback(
    (data: ProjectCreate) => {
      mutation.mutate(data);
    },
    [mutation],
  );

  const handleClose = useCallback(() => {
    setCreateCompanyVisible(false);
    onClose();
  }, [onClose]);

  return (
    <>
      <Dialog visible={visible} onClose={handleClose} testID={testID}>
        <Dialog.Header>
          <Dialog.Title>Create New Project</Dialog.Title>
          <Dialog.Close onPress={handleClose} testID="new-project-close" />
        </Dialog.Header>

        <Dialog.Content>
          <ProjectForm
            onSubmit={handleSubmit}
            isPending={mutation.isPending}
            onCancel={handleClose}
            onCreateCompany={
              parentOrgId !== null ? () => setCreateCompanyVisible(true) : undefined
            }
            defaultCompanyId={companyId}
            companyOptions={orgs}
            testID="new-project-form"
          />
        </Dialog.Content>
      </Dialog>

      {parentOrgId !== null && (
        <CreateClientOrgDialog
          visible={createCompanyVisible}
          onClose={() => setCreateCompanyVisible(false)}
          parentOrgId={parentOrgId}
          testID="new-project-create-company-dialog"
        />
      )}
    </>
  );
};
