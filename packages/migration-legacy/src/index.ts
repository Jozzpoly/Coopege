export type MigrationStatus =
  | "MIGRATED"
  | "MIGRATED_WITH_TRANSFORM"
  | "PLACEHOLDER"
  | "UNSUPPORTED"
  | "MANUAL_REVIEW_REQUIRED";

export interface MigrationFinding {
  category: string;
  sourcePath: string;
  status: MigrationStatus;
  targetPath?: string;
  message: string;
}

export interface MigrationReport {
  reportVersion: 1;
  sourceSha256: Record<string, string>;
  findings: MigrationFinding[];
}
