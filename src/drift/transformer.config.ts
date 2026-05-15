import { TransformRule } from './transformer';

export interface TransformerConfig {
  rules: TransformRule[];
  enabled: boolean;
}

const VALID_OPERATIONS = ['rename', 'mask', 'truncate', 'uppercase', 'lowercase'] as const;

export function isValidOperation(op: string): op is TransformRule['operation'] {
  return (VALID_OPERATIONS as readonly string[]).includes(op);
}

export function buildTransformerConfigFromEnv(): TransformerConfig {
  const enabled = process.env.DRIFTCHECK_TRANSFORM_ENABLED !== 'false';
  const rulesJson = process.env.DRIFTCHECK_TRANSFORM_RULES;

  let rules: TransformRule[] = [];
  if (rulesJson) {
    try {
      rules = JSON.parse(rulesJson) as TransformRule[];
    } catch {
      rules = [];
    }
  }

  return { rules, enabled };
}

export function validateTransformerConfig(
  config: TransformerConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of config.rules) {
    if (!rule.field || typeof rule.field !== 'string') {
      errors.push(`Rule is missing a valid 'field' property`);
    }
    if (!isValidOperation(rule.operation)) {
      errors.push(`Invalid operation '${rule.operation}' in rule for field '${rule.field}'`);
    }
    if (rule.operation === 'rename' && !rule.target) {
      errors.push(`Rename rule for field '${rule.field}' requires a 'target'`);
    }
    if (rule.operation === 'truncate' && rule.maxLength !== undefined && rule.maxLength < 1) {
      errors.push(`Truncate rule for field '${rule.field}' requires maxLength >= 1`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function mergeTransformerConfig(
  base: TransformerConfig,
  overrides: Partial<TransformerConfig>
): TransformerConfig {
  return {
    ...base,
    ...overrides,
    rules: overrides.rules ?? base.rules,
  };
}
