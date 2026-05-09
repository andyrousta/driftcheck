export interface PlannedResource {
  address: string;
  type: string;
  name: string;
  plannedAttributes: Record<string, unknown>;
}

export interface LiveResource {
  address: string;
  attributes: Record<string, unknown>;
}

export interface DriftedAttribute {
  key: string;
  planned: unknown;
  live: unknown;
}

export interface ResourceDriftResult {
  address: string;
  plannedAttributes: Record<string, unknown>;
  liveAttributes: Record<string, unknown>;
  driftedAttributes: DriftedAttribute[];
}

export interface DriftReport {
  planHash: string;
  hasDrift: boolean;
  resources: ResourceDriftResult[];
  generatedAt: string;
}

export interface BaselineOptions {
  baselinePath: string;
  updateBaseline?: boolean;
  failOnNewResources?: boolean;
}

export interface DriftCheckOptions {
  planPath: string;
  liveStatePath?: string;
  baseline?: BaselineOptions;
  outputFormat?: "text" | "json";
  exitOnDrift?: boolean;
}
