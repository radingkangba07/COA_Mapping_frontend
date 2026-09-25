export interface ERPInfo {
  readonly id: string;
  readonly name: string;
  readonly fieldCount: number;
}

export interface CurrentUserInfo {
  readonly name: string;
  readonly userId: string;
}

export interface SidebarContentProps {
  readonly projectId: string | null;
  readonly displayCode?: string;
  readonly orgId?: string;
  readonly projectName?: string;
  readonly createdAt?: Date;
  readonly createdByName?: string;
  readonly updatedAt?: Date;
  readonly lastEditedBy?: string;
  readonly sourceERP: ERPInfo | null;
  readonly targetERP: ERPInfo | null;
  readonly sourceRowCount?: number;
  readonly targetRowCount?: number;
  /**
   * This entity's server-computed progress % (0-100) — currently only
   * populated by the master-data wizard (wizard.store's
   * entityProgressByEntity, via hydrateEntityProgress). Omitted entirely
   * for the classic COA migration flow, which has no equivalent field.
   */
  readonly entityProgressPercent?: number;
  readonly currentUser: CurrentUserInfo | null;
  readonly onToggle?: () => void;
  readonly testID?: string;
}

export interface ProjectSidebarProps extends SidebarContentProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}
