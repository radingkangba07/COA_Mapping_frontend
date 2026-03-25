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
  readonly projectName?: string;
  readonly createdAt?: Date;
  readonly createdByName?: string;
  readonly updatedAt?: Date;
  readonly lastEditedBy?: string;
  readonly sourceERP: ERPInfo | null;
  readonly targetERP: ERPInfo | null;
  readonly currentUser: CurrentUserInfo | null;
  readonly testID?: string;
}

export interface ProjectSidebarProps extends SidebarContentProps {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}
