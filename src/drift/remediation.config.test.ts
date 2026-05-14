import {
  buildRemediationConfigFromEnv,
  validateRemediationConfig,
  mergeRemediationConfig,
} from './remediation.config';

describe('buildRemediationConfigFromEnv', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('defaults to dryRun=true', () => {
    delete process.env.DRIFTCHECK_REMEDIATION_DRY_RUN;
    const config = buildRemediationConfigFromEnv();
    expect(config.dryRun).toBe(true);
  });

  it('sets dryRun=false when env var is "false"', () => {
    process.env.DRIFTCHECK_REMEDIATION_DRY_RUN = 'false';
    const config = buildRemediationConfigFromEnv();
    expect(config.dryRun).toBe(false);
  });

  it('sets autoApply from env', () => {
    process.env.DRIFTCHECK_REMEDIATION_AUTO_APPLY = 'true';
    process.env.DRIFTCHECK_REMEDIATION_DRY_RUN = 'false';
    const config = buildRemediationConfigFromEnv();
    expect(config.autoApply).toBe(true);
  });

  it('parses maxActions from env', () => {
    process.env.DRIFTCHECK_REMEDIATION_MAX_ACTIONS = '10';
    const config = buildRemediationConfigFromEnv();
    expect(config.maxActions).toBe(10);
  });

  it('ignores non-numeric maxActions env var', () => {
    process.env.DRIFTCHECK_REMEDIATION_MAX_ACTIONS = 'not-a-number';
    const config = buildRemediationConfigFromEnv();
    expect(config.maxActions).toBeUndefined();
  });
});

describe('validateRemediationConfig', () => {
  it('returns no errors for valid config', () => {
    expect(validateRemediationConfig({ maxActions: 10, dryRun: true, autoApply: false })).toHaveLength(0);
  });

  it('errors when maxActions <= 0', () => {
    const errors = validateRemediationConfig({ maxActions: 0 });
    expect(errors).toContain('maxActions must be a positive integer');
  });

  it('errors when maxActions is negative', () => {
    const errors = validateRemediationConfig({ maxActions: -5 });
    expect(errors).toContain('maxActions must be a positive integer');
  });

  it('errors when autoApply and dryRun are both true', () => {
    const errors = validateRemediationConfig({ autoApply: true, dryRun: true });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('mergeRemediationConfig', () => {
  it('merges overrides with defaults', () => {
    const config = mergeRemediationConfig({ maxActions: 5 });
    expect(config.maxActions).toBe(5);
    expect(config.dryRun).toBe(true);
  });

  it('override dryRun=false takes precedence over default', () => {
    const config = mergeRemediationConfig({ dryRun: false });
    expect(config.dryRun).toBe(false);
  });
});
