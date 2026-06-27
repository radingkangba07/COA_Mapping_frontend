import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { CompanyId } from '@/shared/types/common.types';
import type { ProjectGroup } from '../../types/projects.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    primary: '#003399',
    primaryForeground: '#FAFAFA',
  },
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const COMPANY_ID = 'co-1' as CompanyId;

const companyGroup: ProjectGroup = {
  companyId: COMPANY_ID,
  companyName: 'Acme Corp',
  companyOrgType: 'employer',
  projects: [],
};

const mockUseUserOrgs = jest.fn(() => ({
  orgs: [companyGroup],
  employerOrgs: [{ id: 'co-1', name: 'Acme Corp', orgType: 'employer' as const }],
  clientOrgs: [],
  isLoading: false,
  error: null,
}));

jest.mock('../../hooks/useUserOrgs', () => ({
  useUserOrgs: (...args: unknown[]) => mockUseUserOrgs(...(args as [])),
}));

// DA-139 removed useCreateProject from the dialog. Mock the service so we can
// assert no create/POST is invoked on submit (navigation-only flow).
const mockCreateProject = jest.fn();

jest.mock('../../services/projects.service', () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// Stub the nested create-company dialog — it pulls in TanStack Query +
// toast and is irrelevant to the navigation-only submit flow under test.
jest.mock('../CreateClientOrgDialog', () => ({
  CreateClientOrgDialog: (): null => null,
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { NewProjectDialog } from '../NewProjectDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderDialog(visible = true): ReturnType<typeof render> {
  return render(<NewProjectDialog visible={visible} onClose={jest.fn()} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('NewProjectDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog form when visible', () => {
    renderDialog();
    expect(screen.getByTestId('new-project-form')).toBeTruthy();
    expect(screen.getByTestId('new-project-name-input')).toBeTruthy();
  });

  it('navigates to ProjectScope with {companyId, name, description} and does NOT POST', async () => {
    renderDialog();

    // Open the company dropdown (the trigger shows the placeholder), then pick
    // the option. Provide a synthetic event so the Dialog's stopPropagation
    // handler (an ancestor Pressable) is event-safe.
    const stopEvent = { stopPropagation: jest.fn() };
    fireEvent.press(screen.getByText('Select company...'), stopEvent);
    fireEvent.press(screen.getByText('Acme Corp'), stopEvent);

    // Fill name + description.
    fireEvent.changeText(
      screen.getByTestId('new-project-name-input'),
      'Q1 2024 Migration',
    );
    fireEvent.changeText(
      screen.getByTestId('new-project-description'),
      'A migration project',
    );

    fireEvent.press(screen.getByTestId('create-project-submit-btn'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    expect(mockNavigate).toHaveBeenCalledWith('ProjectScope', {
      companyId: COMPANY_ID,
      name: 'Q1 2024 Migration',
      description: 'A migration project',
    });

    // Navigation-only: no create/POST service call.
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('does not navigate when the project name is empty (validation blocks)', async () => {
    renderDialog();

    fireEvent.press(screen.getByTestId('create-project-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeTruthy();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockCreateProject).not.toHaveBeenCalled();
  });
});
