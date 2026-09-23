import { useContext, useEffect } from 'react';
import { WizardRightPanelContext } from '../context/wizardRightPanel.context';

/**
 * Registers `node` into the wizard's single MigrationLayout rightPanel slot
 * for as long as the calling screen is mounted, clearing it on unmount —
 * the nested stack navigator swaps step screens without remounting
 * MasterDataWizardScreen, so nothing else would clear a previous step's
 * panel otherwise. No-ops outside a WizardRightPanelContext.Provider.
 */
export function useSyncWizardRightPanel(node: React.ReactNode): void {
  const setRightPanel = useContext(WizardRightPanelContext);
  useEffect(() => {
    setRightPanel(node);
    return () => setRightPanel(null);
  }, [node, setRightPanel]);
}
