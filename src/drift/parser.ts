import { readFileSync } from "fs";

export interface TerraformPlanResource {
  address: string;
  type: string;
  name: string;
  plannedValues: Record<string, unknown>;
  priorValues?: Record<string, unknown>;
  action: "create" | "update" | "delete" | "no-op";
}

export interface ParsedPlan {
  formatVersion: string;
  resources: TerraformPlanResource[];
  rawPlan: unknown;
}

function extractResources(
  resourceChanges: unknown[]
): TerraformPlanResource[] {
  return resourceChanges
    .filter((rc: any) => rc.change && rc.change.actions)
    .map((rc: any) => {
      const actions: string[] = rc.change.actions;
      const action = actions.includes("delete")
        ? "delete"
        : actions.includes("create")
        ? "create"
        : actions.includes("update")
        ? "update"
        : "no-op";

      return {
        address: rc.address,
        type: rc.type,
        name: rc.name,
        plannedValues: rc.change.after ?? {},
        priorValues: rc.change.before ?? undefined,
        action,
      };
    });
}

export function parsePlanFile(filePath: string): ParsedPlan {
  const raw = readFileSync(filePath, "utf-8");
  return parsePlanJson(raw);
}

export function parsePlanJson(json: string): ParsedPlan {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Failed to parse Terraform plan JSON: ${(err as Error).message}`);
  }

  if (!parsed.format_version) {
    throw new Error("Invalid Terraform plan: missing format_version");
  }

  const resourceChanges: unknown[] = parsed.resource_changes ?? [];
  const resources = extractResources(resourceChanges);

  return {
    formatVersion: parsed.format_version,
    resources,
    rawPlan: parsed,
  };
}
