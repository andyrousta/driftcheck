import * as fs from 'fs';
import * as path from 'path';
import { DriftReport } from './types';

export interface Snapshot {
  id: string;
  timestamp: string;
  planFile: string;
  report: DriftReport;
  metadata?: Record<string, string>;
}

export interface SnapshotIndex {
  snapshots: Array<{ id: string; timestamp: string; planFile: string }>;
}

const DEFAULT_SNAPSHOT_DIR = '.driftcheck/snapshots';

export function generateSnapshotId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildSnapshot(
  report: DriftReport,
  planFile: string,
  metadata?: Record<string, string>
): Snapshot {
  return {
    id: generateSnapshotId(),
    timestamp: new Date().toISOString(),
    planFile,
    report,
    metadata,
  };
}

export function saveSnapshot(snapshot: Snapshot, dir: string = DEFAULT_SNAPSHOT_DIR): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, `${snapshot.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  updateSnapshotIndex(snapshot, dir);
  return filePath;
}

export function loadSnapshot(id: string, dir: string = DEFAULT_SNAPSHOT_DIR): Snapshot {
  const filePath = path.join(dir, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Snapshot not found: ${id}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Snapshot;
}

export function listSnapshots(dir: string = DEFAULT_SNAPSHOT_DIR): SnapshotIndex['snapshots'] {
  const indexPath = path.join(dir, 'index.json');
  if (!fs.existsSync(indexPath)) return [];
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as SnapshotIndex;
  return index.snapshots;
}

function updateSnapshotIndex(snapshot: Snapshot, dir: string): void {
  const indexPath = path.join(dir, 'index.json');
  const index: SnapshotIndex = fs.existsSync(indexPath)
    ? (JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as SnapshotIndex)
    : { snapshots: [] };
  index.snapshots.push({
    id: snapshot.id,
    timestamp: snapshot.timestamp,
    planFile: snapshot.planFile,
  });
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

export function deleteSnapshot(id: string, dir: string = DEFAULT_SNAPSHOT_DIR): void {
  const filePath = path.join(dir, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Snapshot not found: ${id}`);
  }
  fs.unlinkSync(filePath);
  const indexPath = path.join(dir, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as SnapshotIndex;
    index.snapshots = index.snapshots.filter((s) => s.id !== id);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}
