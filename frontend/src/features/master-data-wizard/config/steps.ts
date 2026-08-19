/** Wizard steps — source of truth for labels and order. Do not hardcode step numbers or labels in components. */
export const WIZARD_STEPS = [
  { n: 1, id: 'upload',     label: 'Upload Files',        short: 'Upload',     copilot: false },
  { n: 2, id: 'profile',    label: 'Source Data Profile', short: 'Profile',    copilot: true  },
  { n: 3, id: 'mapping',    label: 'Field Mapping',       short: 'Mapping',    copilot: true  },
  { n: 4, id: 'values',     label: 'Value Mapping',       short: 'Values',     copilot: true  },
  { n: 5, id: 'formats',    label: 'Formats',             short: 'Formats',    copilot: true  },
  { n: 6, id: 'validation', label: 'Validation',          short: 'Validation', copilot: true  },
  { n: 7, id: 'test',       label: 'Test Import',         short: 'Test',       copilot: true  },
  { n: 8, id: 'import',     label: 'Final Import',        short: 'Import',     copilot: true  },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];
