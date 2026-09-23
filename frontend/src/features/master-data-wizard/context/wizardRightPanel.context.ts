import { createContext } from 'react';

/**
 * Setter for the wizard's single MigrationLayout rightPanel slot, owned by
 * MasterDataWizardScreen (the sole MigrationLayout instance the whole
 * wizard shares). Defaults to a no-op so step screens still render
 * standalone with no MasterDataWizardScreen ancestor (their own test
 * suites render them that way) without needing a Provider.
 */
export const WizardRightPanelContext = createContext<(node: React.ReactNode) => void>(() => {});
