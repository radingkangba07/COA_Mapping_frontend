export interface ERPInfo {
  readonly id: string;
  readonly name: string;
}

export interface CurrentUserInfo {
  readonly name: string;
}

export interface ProjectAsidePanelProps {
  readonly projectId: string | null;
  readonly orgId?: string;
  readonly projectName: string;
  readonly createdAt?: Date;
  readonly createdByName?: string;
  readonly updatedAt?: Date;
  readonly lastEditedBy?: string;
  readonly sourceERP: ERPInfo | null;
  readonly targetERP: ERPInfo | null;
  readonly sourceRowCount?: number;
  readonly targetRowCount?: number;
  readonly currentUser: CurrentUserInfo | null;
  readonly defaultOpen?: boolean;
  readonly testID?: string;
}
