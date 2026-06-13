export interface VerificationResult {
  path: string;
  expectedBytes: number;
  actualBytes: number;
  expectedSha256: string;
  actualSha256: string;
  ok: boolean;
}
export function sha256File(path: string | URL): string;
export function verifyManifest(root: URL, manifest: { artifacts: Array<{ path: string; bytes: number; sha256: string }> }): VerificationResult[];
