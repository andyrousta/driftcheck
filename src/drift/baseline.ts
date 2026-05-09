import * as fs from "fs";
import * as path from "path";
import { DriftReport } from "./types";

export interface Baseline {
  createdAt: string;
  planHash: string;
  resources: Record<string, Record<string, unknown>>;
}

export function saveBaseline(
  report: DriftReport,
  outputPath: string
): void {
  const baseline: Baseline = {
    createdAt: new Date().toISOString(),
    planHash: report.planHash,
    resources: {},
  };

  for (const resource of report.resources) {
    baseline.resources[resource.address] = resource.plannedAttributes;
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2), "utf-8");
}

export function loadBaseline(inputPath: string): Baseline {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Baseline file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as Baseline;

  if (!parsed.createdAt || !parsed.planHash || !parsed.resources) {
    throw new Error(`Invalid baseline format in: ${inputPath}`);
  }

  return parsed;
}

export function baselineExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function compareWithBaseline(
  current: Record<string, Record<string, unknown>>,
  baseline: Baseline
): string[] {
  const newResources: string[] = [];

  for (const address of Object.keys(current)) {
    if (!baseline.resources[address]) {
      newResources.push(address);
    }
  }

  return newResources;
}
