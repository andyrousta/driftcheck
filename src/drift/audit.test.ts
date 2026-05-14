import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  appendAuditEntry,
  buildAuditEntry,
  formatAuditSummary,
  loadAuditLog,
} from './audit';
import { DriftReport } from './types';

const mockReport: DriftReport = {
  resources: [
    { address: 'aws_instance.web', hasDrift: true, suppressed: false, driftedAttributes: [] },
    { address: 'aws_s3_bucket.data', hasDrift: false, suppressed: false, driftedAttributes: [] },
    { address: 'aws_sg.main', hasDrift: true, suppressed: true, driftedAttributes: [] },
  ],
};

describe('buildAuditEntry', () => {
  it('correctly counts drifted and suppressed resources', () => {
    const entry = buildAuditEntry(mockReport, 'plan.json', 'ci');
    expect(entry.resourcesChecked).toBe(3);
    expect(entry.driftedResources).toBe(2);
    expect(entry.hasDrift).toBe(true);
    expect(entry.suppressedCount).toBe(1);
    expect(entry.planFile).toBe('plan.json');
    expect(entry.triggeredBy).toBe('ci');
  });

  it('defaults triggeredBy to manual', () => {
    const entry = buildAuditEntry(mockReport, 'plan.json');
    expect(entry.triggeredBy).toBe('manual');
  });

  it('sets hasDrift to false when no resources drifted', () => {
    const clean: DriftReport = {
      resources: [
        { address: 'aws_instance.web', hasDrift: false, suppressed: false, driftedAttributes: [] },
      ],
    };
    const entry = buildAuditEntry(clean, 'plan.json');
    expect(entry.hasDrift).toBe(false);
    expect(entry.driftedResources).toBe(0);
  });
});

describe('loadAuditLog / appendAuditEntry', () => {
  let tmpDir: string;
  let auditPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'driftcheck-audit-'));
    auditPath = path.join(tmpDir, 'audit.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty log when file does not exist', () => {
    const log = loadAuditLog(auditPath);
    expect(log.entries).toHaveLength(0);
    expect(log.version).toBe('1.0');
  });

  it('appends entries and persists them', () => {
    const entry = buildAuditEntry(mockReport, 'plan.json', 'schedule');
    appendAuditEntry(auditPath, entry);
    const log = loadAuditLog(auditPath);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0].triggeredBy).toBe('schedule');
  });
});

describe('formatAuditSummary', () => {
  it('returns message when no entries', () => {
    const summary = formatAuditSummary({ version: '1.0', entries: [] });
    expect(summary).toMatch(/No audit entries/);
  });

  it('includes drift counts and last run info', () => {
    const entry = buildAuditEntry(mockReport, 'plan.json', 'ci');
    const summary = formatAuditSummary({ version: '1.0', entries: [entry] });
    expect(summary).toMatch(/1\/1 runs/);
    expect(summary).toMatch(/plan.json/);
    expect(summary).toMatch(/ci/);
  });
});
