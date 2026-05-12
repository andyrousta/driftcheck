import * as fs from 'fs';
import * as path from 'path';
import { DriftedResource } from './types';

export interface SuppressionRule {
  resourceType?: string;
  resourceAddress?: string;
  attributes?: string[];
  reason?: string;
  expiresAt?: string;
}

export interface SuppressionConfig {
  rules: SuppressionRule[];
}

export function loadSuppressionConfig(filePath: string): SuppressionConfig {
  if (!fs.existsSync(filePath)) {
    return { rules: [] };
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as SuppressionConfig;
}

export function isRuleExpired(rule: SuppressionRule): boolean {
  if (!rule.expiresAt) return false;
  return new Date(rule.expiresAt) < new Date();
}

export function matchesRule(resource: DriftedResource, rule: SuppressionRule): boolean {
  if (isRuleExpired(rule)) return false;

  if (rule.resourceAddress && rule.resourceAddress !== resource.address) {
    return false;
  }

  if (rule.resourceType && !resource.address.startsWith(rule.resourceType)) {
    return false;
  }

  return true;
}

export function suppressDrift(
  driftedResources: DriftedResource[],
  config: SuppressionConfig
): { suppressed: DriftedResource[]; active: DriftedResource[] } {
  const suppressed: DriftedResource[] = [];
  const active: DriftedResource[] = [];

  for (const resource of driftedResources) {
    const matchingRule = config.rules.find((rule) => matchesRule(resource, rule));

    if (matchingRule) {
      if (matchingRule.attributes && matchingRule.attributes.length > 0) {
        const filteredAttributes = resource.driftedAttributes.filter(
          (attr) => !matchingRule.attributes!.includes(attr.attribute)
        );
        if (filteredAttributes.length === 0) {
          suppressed.push(resource);
        } else {
          active.push({ ...resource, driftedAttributes: filteredAttributes });
        }
      } else {
        suppressed.push(resource);
      }
    } else {
      active.push(resource);
    }
  }

  return { suppressed, active };
}
