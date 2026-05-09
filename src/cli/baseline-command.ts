import * as path from "path";
import { parsePlanFile } from "../drift/parser";
import { detectDrift } from "../drift/detector";
import { buildReport } from "../drift/report";
import {
  saveBaseline,
  loadBaseline,
  baselineExists,
  compareWithBaseline,
} from "../drift/baseline";

export interface BaselineCommandArgs {
  planPath: string;
  baselinePath: string;
  update?: boolean;
  failOnNew?: boolean;
}

export async function runBaselineCommand(
  args: BaselineCommandArgs
): Promise<{ exitCode: number; message: string }> {
  const { planPath, baselinePath, update = false, failOnNew = false } = args;

  const resolvedPlan = path.resolve(planPath);
  const resolvedBaseline = path.resolve(baselinePath);

  const planned = parsePlanFile(resolvedPlan);
  const driftResults = detectDrift(planned, []);
  const report = buildReport(driftResults, resolvedPlan);

  if (!baselineExists(resolvedBaseline)) {
    saveBaseline(report, resolvedBaseline);
    return {
      exitCode: 0,
      message: `Baseline created at ${resolvedBaseline}`,
    };
  }

  if (update) {
    saveBaseline(report, resolvedBaseline);
    return {
      exitCode: 0,
      message: `Baseline updated at ${resolvedBaseline}`,
    };
  }

  const baseline = loadBaseline(resolvedBaseline);
  const currentResources: Record<string, Record<string, unknown>> = {};

  for (const resource of report.resources) {
    currentResources[resource.address] = resource.plannedAttributes;
  }

  const newResources = compareWithBaseline(currentResources, baseline);

  if (newResources.length > 0) {
    const msg = `New resources detected not in baseline:\n${newResources.map((r) => `  - ${r}`).join("\n")}`;
    return { exitCode: failOnNew ? 1 : 0, message: msg };
  }

  return { exitCode: 0, message: "No new resources detected against baseline." };
}
