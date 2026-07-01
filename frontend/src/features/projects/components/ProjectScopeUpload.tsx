import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
// DA-48: reuse the migration file-upload UI for the CSV branch by IMPORTING it.
// This file is read-only from here — never modify any features/migration file.
import { FileUploadBox } from '@/features/migration/components/FileUploader/FileUploadBox';

interface PickedFileInfo {
  readonly name: string;
  readonly rowCount: number;
}

interface ProjectScopeUploadProps {
  readonly label: string;
  readonly testID?: string;
}

// Thin project-scope wrapper that composes the migration FileUploadBox so the
// CSV connection method has a working drag-drop / file-picker control. Row
// parsing belongs to the migration upload flow; here we only capture the file
// name for display, with no parse side effects.
export const ProjectScopeUpload = ({
  label,
  testID,
}: ProjectScopeUploadProps): React.JSX.Element => {
  const [file, setFile] = useState<PickedFileInfo | null>(null);

  const handleFilePicked = useCallback(
    (picked: File | { uri: string; name: string; mimeType: string }): void => {
      setFile({ name: picked.name, rowCount: 0 });
    },
    [],
  );

  const handleRemove = useCallback((): void => {
    setFile(null);
  }, []);

  return (
    <View testID={testID}>
      <FileUploadBox
        label={label}
        file={file}
        onFilePicked={handleFilePicked}
        onRemove={handleRemove}
        testID={
          testID !== undefined ? `${testID}-box` : 'project-scope-upload-box'
        }
      />
    </View>
  );
};
