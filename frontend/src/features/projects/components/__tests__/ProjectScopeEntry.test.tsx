import React from 'react';
import { View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { createCompanyId } from '@/shared/types/common.types';
import type { ProjectGroup } from '../../types/projects.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    primary: '#003399',
    accent: '#2563EB',
  },
}));

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { ProjectScopeEntry } from '../ProjectScopeEntry';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const companyOptions: ProjectGroup[] = [
  {
    companyId: createCompanyId('c1'),
    companyName: 'Acme Corp',
    companyOrgType: 'employer',
    projects: [],
  },
  {
    companyId: createCompanyId('c2'),
    companyName: 'Globex',
    companyOrgType: 'client',
    projects: [],
  },
];

const onSelectCompany = jest.fn();
const onChangeName = jest.fn();
const onChangeDescription = jest.fn();
const onCreateCompany = jest.fn();

function renderEntry(
  overrides: Partial<React.ComponentProps<typeof ProjectScopeEntry>> = {},
): ReturnType<typeof render> {
  return render(
    <ProjectScopeEntry
      companyId={null}
      name="Initial"
      description="Desc"
      companyOptions={companyOptions}
      onSelectCompany={onSelectCompany}
      onChangeName={onChangeName}
      onChangeDescription={onChangeDescription}
      onCreateCompany={onCreateCompany}
      testID="project-scope-entry"
      {...overrides}
    />,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProjectScopeEntry', () => {
  beforeAll(() => {
    // The shared Select menu only mounts after measureInWindow fires its
    // callback, which the test renderer never does — patch it once.
    (
      View.prototype as unknown as {
        measureInWindow: (
          cb: (x: number, y: number, w: number, h: number) => void,
        ) => void;
      }
    ).measureInWindow = (cb) => cb(0, 0, 100, 40);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onSelectCompany when a company option is chosen', () => {
    renderEntry();

    fireEvent.press(screen.getByTestId('project-scope-company-trigger'));
    fireEvent.press(screen.getByTestId('project-scope-company-option-c2'));

    expect(onSelectCompany).toHaveBeenCalledWith('c2');
  });

  it('calls onChangeName when the project name is edited', () => {
    renderEntry();

    fireEvent.changeText(screen.getByDisplayValue('Initial'), 'New Name');

    expect(onChangeName).toHaveBeenCalledWith('New Name');
  });

  it('calls onChangeDescription when the description is edited', () => {
    renderEntry();

    fireEvent.changeText(screen.getByDisplayValue('Desc'), 'New Desc');

    expect(onChangeDescription).toHaveBeenCalledWith('New Desc');
  });

  it('calls onCreateCompany when the New company affordance is pressed', () => {
    renderEntry();

    fireEvent.press(screen.getByTestId('project-scope-create-company-btn'));

    expect(onCreateCompany).toHaveBeenCalledTimes(1);
  });

  it('hides the New company affordance when onCreateCompany is undefined', () => {
    renderEntry({ onCreateCompany: undefined });

    expect(
      screen.queryByTestId('project-scope-create-company-btn'),
    ).toBeNull();
  });
});
