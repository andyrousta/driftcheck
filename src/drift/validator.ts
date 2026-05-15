import { DriftedResource, DriftReport } from './types';

export interface ValidationRule {
  id: string;
  description: string;
  resourceTypePattern?: string;
  attributePattern?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  ruleId: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  resourceAddress: string;
  attribute?: string;
  message: string;
}

export interface ValidationSummary {
  passed: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  results: ValidationResult[];
}

export function matchesPattern(value: string, pattern: string): boolean {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
  return regex.test(value);
}

export function validateResource(
  resource: DriftedResource,
  rules: ValidationRule[]
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const rule of rules) {
    if (rule.resourceTypePattern && !matchesPattern(resource.resourceType, rule.resourceTypePattern)) {
      continue;
    }

    if (rule.attributePattern) {
      for (const attr of resource.driftedAttributes) {
        if (matchesPattern(attr.attribute, rule.attributePattern)) {
          results.push({
            ruleId: rule.id,
            description: rule.description,
            severity: rule.severity,
            resourceAddress: resource.resourceAddress,
            attribute: attr.attribute,
            message: `Attribute "${attr.attribute}" on "${resource.resourceAddress}" violates rule: ${rule.description}`,
          });
        }
      }
    } else {
      results.push({
        ruleId: rule.id,
        description: rule.description,
        severity: rule.severity,
        resourceAddress: resource.resourceAddress,
        message: `Resource "${resource.resourceAddress}" violates rule: ${rule.description}`,
      });
    }
  }

  return results;
}

export function validateDrift(
  report: DriftReport,
  rules: ValidationRule[]
): ValidationSummary {
  const allResults: ValidationResult[] = [];

  for (const resource of report.driftedResources) {
    const results = validateResource(resource, rules);
    allResults.push(...results);
  }

  const errorCount = allResults.filter(r => r.severity === 'error').length;
  const warningCount = allResults.filter(r => r.severity === 'warning').length;
  const infoCount = allResults.filter(r => r.severity === 'info').length;

  return {
    passed: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    results: allResults,
  };
}

export function formatValidationSummary(summary: ValidationSummary): string {
  const lines: string[] = [
    `Validation ${summary.passed ? 'PASSED' : 'FAILED'}`,
    `  Errors:   ${summary.errorCount}`,
    `  Warnings: ${summary.warningCount}`,
    `  Info:     ${summary.infoCount}`,
  ];

  if (summary.results.length > 0) {
    lines.push('');
    for (const result of summary.results) {
      lines.push(`[${result.severity.toUpperCase()}] [${result.ruleId}] ${result.message}`);
    }
  }

  return lines.join('\n');
}
