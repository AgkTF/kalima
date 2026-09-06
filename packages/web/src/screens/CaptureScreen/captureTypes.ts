export interface Capture {
  id: number;
  item: string;
  locator: string | null;
  sourceHint: string | null;
  entry: { status: string } | null;
}

export interface CaptureUpdateData {
  item?: string;
  locator?: string | null;
  sourceHint?: string | null;
}
