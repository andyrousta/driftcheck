import * as fs from 'fs';
import * as path from 'path';
import { DriftReport } from './types';

export interface ArchivedReport {
  id: string;
  timestamp: string;
  reportPath: string;
  planHash: string;
  driftCount: number;
}

export interface ArchiverConfig {
  archiveDir: string;
  maxEntries: number;
  compress: boolean;
}

export function generateArchiveId(timestamp: Date = new Date()): string {
  return `archive-${timestamp.toISOString().replace(/[:.]/g, '-')}`;
}

export function buildArchivedReport(
  report: DriftReport,
  reportPath: string,
  planHash: string
): ArchivedReport {
  return {
    id: generateArchiveId(),
    timestamp: new Date().toISOString(),
    reportPath,
    planHash,
    driftCount: report.driftedResources.length,
  };
}

export function saveToArchive(
  entry: ArchivedReport,
  config: ArchiverConfig
): void {
  if (!fs.existsSync(config.archiveDir)) {
    fs.mkdirSync(config.archiveDir, { recursive: true });
  }
  const indexPath = path.join(config.archiveDir, 'index.json');
  const index = loadArchiveIndex(config.archiveDir);
  index.push(entry);
  const trimmed = index.slice(-config.maxEntries);
  fs.writeFileSync(indexPath, JSON.stringify(trimmed, null, 2), 'utf-8');
}

export function loadArchiveIndex(archiveDir: string): ArchivedReport[] {
  const indexPath = path.join(archiveDir, 'index.json');
  if (!fs.existsSync(indexPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as ArchivedReport[];
  } catch {
    return [];
  }
}

export function pruneArchive(
  archiveDir: string,
  maxEntries: number
): ArchivedReport[] {
  const index = loadArchiveIndex(archiveDir);
  if (index.length <= maxEntries) return index;
  const pruned = index.slice(-maxEntries);
  const indexPath = path.join(archiveDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(pruned, null, 2), 'utf-8');
  return pruned;
}
