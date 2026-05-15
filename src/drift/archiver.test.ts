import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  generateArchiveId,
  buildArchivedReport,
  saveToArchive,
  loadArchiveIndex,
  pruneArchive,
} from './archiver';
import { DriftReport } from './types';

function makeDriftReport(count: number): DriftReport {
  return {
    driftedResources: Array.from({ length: count }, (_, i) => ({
      resourceId: `res-${i}`,
      resourceType: 'aws_instance',
      driftedAttributes: [],
    })),
    generatedAt: new Date().toISOString(),
  } as unknown as DriftReport;
}

describe('generateArchiveId', () => {
  it('should include the prefix archive-', () => {
    expect(generateArchiveId()).toMatch(/^archive-/);
  });

  it('should be deterministic for a given date', () => {
    const d = new Date('2024-01-15T10:00:00.000Z');
    expect(generateArchiveId(d)).toBe('archive-2024-01-15T10-00-00-000Z');
  });
});

describe('buildArchivedReport', () => {
  it('should capture driftCount from report', () => {
    const report = makeDriftReport(3);
    const entry = buildArchivedReport(report, '/tmp/report.json', 'abc123');
    expect(entry.driftCount).toBe(3);
    expect(entry.planHash).toBe('abc123');
    expect(entry.reportPath).toBe('/tmp/report.json');
  });
});

describe('saveToArchive and loadArchiveIndex', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archiver-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should save and reload archive entries', () => {
    const report = makeDriftReport(2);
    const entry = buildArchivedReport(report, '/tmp/r.json', 'hash1');
    saveToArchive(entry, { archiveDir: tmpDir, maxEntries: 10, compress: false });
    const index = loadArchiveIndex(tmpDir);
    expect(index).toHaveLength(1);
    expect(index[0].planHash).toBe('hash1');
  });

  it('should prune entries beyond maxEntries', () => {
    for (let i = 0; i < 5; i++) {
      const entry = buildArchivedReport(makeDriftReport(i), `/r${i}.json`, `h${i}`);
      saveToArchive(entry, { archiveDir: tmpDir, maxEntries: 3, compress: false });
    }
    const index = loadArchiveIndex(tmpDir);
    expect(index).toHaveLength(3);
  });
});

describe('pruneArchive', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return unchanged index when under limit', () => {
    const entry = buildArchivedReport(makeDriftReport(1), '/r.json', 'h1');
    saveToArchive(entry, { archiveDir: tmpDir, maxEntries: 50, compress: false });
    const result = pruneArchive(tmpDir, 50);
    expect(result).toHaveLength(1);
  });
});
