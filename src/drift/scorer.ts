import { DriftResult, DriftedAttribute } from './types';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface ScoredDrift {
  resourceAddress: string;
  severityLevel: SeverityLevel;
  score: number;
  reasons: string[];
}

export interface DriftScore {
  totalScore: number;
  overallSeverity: SeverityLevel;
  scoredResources: ScoredDrift[];
}

const SENSITIVE_ATTRIBUTES = ['password', 'secret', 'token', 'key', 'credentials', 'private'];
const CRITICAL_RESOURCE_PREFIXES = ['aws_iam', 'aws_security_group', 'aws_kms', 'google_iam'];

export function scoreAttribute(attr: DriftedAttribute): number {
  let score = 1;
  const nameLower = attr.attribute.toLowerCase();
  if (SENSITIVE_ATTRIBUTES.some((s) => nameLower.includes(s))) score += 4;
  if (attr.expected === null || attr.actual === null) score += 2;
  return score;
}

export function scoreResource(result: DriftResult): ScoredDrift {
  const reasons: string[] = [];
  let score = 0;

  for (const attr of result.driftedAttributes) {
    const attrScore = scoreAttribute(attr);
    score += attrScore;
    if (attrScore > 3) {
      reasons.push(`Sensitive attribute changed: ${attr.attribute}`);
    }
  }

  if (CRITICAL_RESOURCE_PREFIXES.some((p) => result.resourceAddress.startsWith(p))) {
    score += 3;
    reasons.push(`Critical resource type: ${result.resourceAddress.split('.')[0]}`);
  }

  const severityLevel = scoreToSeverity(score);
  return { resourceAddress: result.resourceAddress, severityLevel, score, reasons };
}

export function scoreToSeverity(score: number): SeverityLevel {
  if (score >= 10) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

export function scoreDrift(results: DriftResult[]): DriftScore {
  const scoredResources = results.map(scoreResource);
  const totalScore = scoredResources.reduce((sum, r) => sum + r.score, 0);
  const overallSeverity = scoreToSeverity(totalScore);
  return { totalScore, overallSeverity, scoredResources };
}
