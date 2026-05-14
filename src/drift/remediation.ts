import { DriftResult, DriftedResource } from './types';

export interface RemediationAction {
  resourceAddress: string;
  attribute: string;
  expectedValue: unknown;
  actualValue: unknown;
  command: string;
}

export interface RemediationPlan {
  actions: RemediationAction[];
  generatedAt: string;
  dryRun: boolean;
}

export function buildRemediationPlan(
  driftResult: DriftResult,
  dryRun = true
): RemediationPlan {
  const actions: RemediationAction[] = [];

  for (const resource of driftResult.driftedResources) {
    for (const attr of resource.driftedAttributes) {
      actions.push({
        resourceAddress: resource.address,
        attribute: attr.attribute,
        expectedValue: attr.expected,
        actualValue: attr.actual,
        command: buildTerraformCommand(resource, attr.attribute, dryRun),
      });
    }
  }

  return {
    actions,
    generatedAt: new Date().toISOString(),
    dryRun,
  };
}

function buildTerraformCommand(
  resource: DriftedResource,
  attribute: string,
  dryRun: boolean
): string {
  const planFlag = dryRun ? '-plan-only' : '';
  return `terraform apply -target=${resource.address} ${planFlag} # fix: ${attribute}`.trim();
}

export function formatRemediationPlan(plan: RemediationPlan): string {
  if (plan.actions.length === 0) {
    return 'No remediation actions required.';
  }

  const lines: string[] = [
    `Remediation Plan (${plan.dryRun ? 'DRY RUN' : 'LIVE'}) — ${plan.generatedAt}`,
    '='.repeat(60),
  ];

  for (const action of plan.actions) {
    lines.push(`Resource: ${action.resourceAddress}`);
    lines.push(`  Attribute : ${action.attribute}`);
    lines.push(`  Expected  : ${JSON.stringify(action.expectedValue)}`);
    lines.push(`  Actual    : ${JSON.stringify(action.actualValue)}`);
    lines.push(`  Command   : ${action.command}`);
    lines.push('');
  }

  return lines.join('\n');
}
