import { DriftedResource } from './types';
import { Severity } from './scorer';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface PrioritizedResource {
  resource: DriftedResource;
  priority: PriorityLevel;
  score: number;
  reasons: string[];
}

export interface PrioritizerConfig {
  criticalTypes?: string[];
  criticalAttributes?: string[];
  boostSecurityAttributes?: boolean;
}

const SECURITY_ATTRIBUTES = [
  'password',
  'secret',
  'token',
  'key',
  'iam',
  'policy',
  'role',
  'encryption',
  'kms',
  'ssl',
  'tls',
  'certificate',
];

const SEVERITY_SCORE_MAP: Record<Severity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  none: 0,
};

export function scoreToPriority(score: number): PriorityLevel {
  if (score >= 90) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function prioritizeResource(
  resource: DriftedResource,
  config: PrioritizerConfig = {}
): PrioritizedResource {
  const reasons: string[] = [];
  let score = SEVERITY_SCORE_MAP[resource.severity ?? 'none'];

  if (config.criticalTypes?.includes(resource.type)) {
    score = Math.min(100, score + 20);
    reasons.push(`resource type '${resource.type}' is marked critical`);
  }

  const driftedAttrNames = resource.driftedAttributes.map((a) =>
    a.attribute.toLowerCase()
  );

  if (config.criticalAttributes) {
    for (const attr of config.criticalAttributes) {
      if (driftedAttrNames.includes(attr.toLowerCase())) {
        score = Math.min(100, score + 15);
        reasons.push(`critical attribute '${attr}' has drifted`);
      }
    }
  }

  if (config.boostSecurityAttributes !== false) {
    for (const secAttr of SECURITY_ATTRIBUTES) {
      if (driftedAttrNames.some((a) => a.includes(secAttr))) {
        score = Math.min(100, score + 25);
        reasons.push(`security-sensitive attribute matched '${secAttr}'`);
        break;
      }
    }
  }

  const priority = scoreToPriority(score);
  return { resource, priority, score, reasons };
}

export function prioritizeDrift(
  resources: DriftedResource[],
  config: PrioritizerConfig = {}
): PrioritizedResource[] {
  return resources
    .map((r) => prioritizeResource(r, config))
    .sort((a, b) => b.score - a.score);
}

export function formatPrioritySummary(prioritized: PrioritizedResource[]): string {
  const counts: Record<PriorityLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const p of prioritized) counts[p.priority]++;
  const lines = [
    `Priority Summary (${prioritized.length} resources):`,
    `  critical : ${counts.critical}`,
    `  high     : ${counts.high}`,
    `  medium   : ${counts.medium}`,
    `  low      : ${counts.low}`,
  ];
  return lines.join('\n');
}
