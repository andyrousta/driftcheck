export interface TerraformPlanResource {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, unknown>;
}

export interface LiveResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
}

export enum DriftStatus {
  OK = 'OK',
  DRIFTED = 'DRIFTED',
  MISSING = 'MISSING',
  UNPLANNED = 'UNPLANNED',
}

export interface DriftedAttribute {
  key: string;
  plannedValue?: unknown;
  liveValue?: unknown;
}

export interface DriftResult {
  resourceId: string;
  resourceType: string;
  status: DriftStatus;
  driftedAttributes: string[];
  message: string;
}

export interface DriftReport {
  timestamp: string;
  totalResources: number;
  driftedCount: number;
  missingCount: number;
  unplannedCount: number;
  okCount: number;
  results: DriftResult[];
}
