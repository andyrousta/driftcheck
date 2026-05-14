import * as fs from 'fs';
import * as path from 'path';
import { DriftReport } from './types';

export interface AuditEntry {
  timestamp: string;
  planFile: string;
  resourcesChecked: number;
  driftedResources: number;
  hasDrift: boolean;
  triggeredBy: string;
  suppressedCount: number;
}

export interface AuditLog {
  version: string;
  entries: AuditEntry[];
}

const AUDIT_LOG_VERSION = '1.0';

export function buildAuditEntry(
  report: DriftReport,
  planFile: string,
  triggeredBy: string = 'manual'
): AuditEntry {
  const driftedResources = report.resources.filter((r) => r.hasDrift).length;
  const suppressedCount = report.resources.filter((r) => r.suppressed).length;

  return {
    timestamp: new Date().toISOString(),
    planFile,
    resourcesChecked: report.resources.length,
    driftedResources,
    hasDrift: driftedResources > 0,
    triggeredBy,
    suppressedCount,
  };
}

export function loadAuditLog(auditLogPath: string): AuditLog {
  if (!fs.existsSync(auditLogPath)) {
    return { version: AUDIT_LOG_VERSION, entries: [] };
  }
  const raw = fs.readFileSync(auditLogPath, 'utf-8');
  return JSON.parse(raw) as AuditLog;
}

export function appendAuditEntry(auditLogPath: string, entry: AuditEntry): void {
  const log = loadAuditLog(auditLogPath);
  log.entries.push(entry);
  const dir = path.dirname(auditLogPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(auditLogPath, JSON.stringify(log, null, 2), 'utf-8');
}

export function formatAuditSummary(log: AuditLog): string {
  const total = log.entries.length;
  if (total === 0) return 'No audit entries found.';

  const drifted = log.entries.filter((e) => e.hasDrift).length;
  const latest = log.entries[log.entries.length - 1];

  const lines = [
    `Audit Log Summary (${total} runs)`,
    `  Drift detected: ${drifted}/${total} runs`,
    `  Last run: ${latest.timestamp}`,
    `  Last plan: ${latest.planFile}`,
    `  Last triggered by: ${latest.triggeredBy}`,
  ];

  return lines.join('\n');
}
