import * as fs from 'fs';
import * as path from 'path';
import {
  buildSnapshot,
  saveSnapshot,
  loadSnapshot,
  listSnapshots,
  deleteSnapshot,
  generateSnapshotId,
} from './snapshot';
import { DriftReport } from './types';

const TEST_DIR = '/tmp/driftcheck-snapshot-test';

const mockReport: DriftReport = {
  driftedResources: [],
  totalDrifted: 0,
  generatedAt: new Date().toISOString(),
};

beforeEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
});

describe('generateSnapshotId', () => {
  it('generates unique ids', () => {
    const a = generateSnapshotId();
    const b = generateSnapshotId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^snap_/);
  });
});

describe('buildSnapshot', () => {
  it('builds a snapshot with correct shape', () => {
    const snap = buildSnapshot(mockReport, 'plan.json', { env: 'staging' });
    expect(snap.planFile).toBe('plan.json');
    expect(snap.report).toEqual(mockReport);
    expect(snap.metadata).toEqual({ env: 'staging' });
    expect(snap.id).toMatch(/^snap_/);
  });
});

describe('saveSnapshot / loadSnapshot', () => {
  it('saves and loads a snapshot correctly', () => {
    const snap = buildSnapshot(mockReport, 'plan.json');
    saveSnapshot(snap, TEST_DIR);
    const loaded = loadSnapshot(snap.id, TEST_DIR);
    expect(loaded.id).toBe(snap.id);
    expect(loaded.planFile).toBe('plan.json');
  });

  it('throws if snapshot does not exist', () => {
    expect(() => loadSnapshot('nonexistent', TEST_DIR)).toThrow('Snapshot not found');
  });
});

describe('listSnapshots', () => {
  it('returns empty array when no snapshots exist', () => {
    expect(listSnapshots(TEST_DIR)).toEqual([]);
  });

  it('lists saved snapshots', () => {
    const snap = buildSnapshot(mockReport, 'plan.json');
    saveSnapshot(snap, TEST_DIR);
    const list = listSnapshots(TEST_DIR);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(snap.id);
  });
});

describe('deleteSnapshot', () => {
  it('deletes a snapshot and removes from index', () => {
    const snap = buildSnapshot(mockReport, 'plan.json');
    saveSnapshot(snap, TEST_DIR);
    deleteSnapshot(snap.id, TEST_DIR);
    expect(listSnapshots(TEST_DIR)).toHaveLength(0);
    expect(() => loadSnapshot(snap.id, TEST_DIR)).toThrow();
  });

  it('throws when deleting nonexistent snapshot', () => {
    expect(() => deleteSnapshot('bad_id', TEST_DIR)).toThrow('Snapshot not found');
  });
});
