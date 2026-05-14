export interface RemediationConfig {
  dryRun: boolean;
  autoApply: boolean;
  maxActions: number;
  targetWorkspace: string | undefined;
}

const DEFAULTS: RemediationConfig = {
  dryRun: true,
  autoApply: false,
  maxActions: 50,
  targetWorkspace: undefined,
};

export function buildRemediationConfigFromEnv(): RemediationConfig {
  return {
    dryRun: process.env.DRIFTCHECK_REMEDIATION_DRY_RUN !== 'false',
    autoApply: process.env.DRIFTCHECK_REMEDIATION_AUTO_APPLY === 'true',
    maxActions: parseInt(process.env.DRIFTCHECK_REMEDIATION_MAX_ACTIONS ?? '50', 10),
    targetWorkspace: process.env.DRIFTCHECK_REMEDIATION_WORKSPACE,
  };
}

export function validateRemediationConfig(
  config: Partial<RemediationConfig>
): string[] {
  const errors: string[] = [];

  if (config.maxActions !== undefined && config.maxActions <= 0) {
    errors.push('maxActions must be a positive integer');
  }

  if (config.autoApply && config.dryRun) {
    errors.push('autoApply and dryRun cannot both be true');
  }

  return errors;
}

export function mergeRemediationConfig(
  overrides: Partial<RemediationConfig>
): RemediationConfig {
  return { ...DEFAULTS, ...overrides };
}
