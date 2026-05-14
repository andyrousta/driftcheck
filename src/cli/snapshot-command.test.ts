import { Command } from 'commander';
import * as fs from 'fs';
import { registerSnapshotCommand } from './snapshot-command';
import * as snapshotModule from '../drift/snapshot';
import * as parserModule from '../drift/parser';
import * as detectorModule from '../drift/detector';
import * as reportModule from '../drift/report';

const TEST_DIR = '/tmp/driftcheck-snap-cmd-test';

beforeEach(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
  jest.clearAllMocks();
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
});

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerSnapshotCommand(program);
  return program;
}

describe('snapshot create', () => {
  it('creates a snapshot and logs the id', () => {
    jest.spyOn(parserModule, 'parsePlanFile').mockReturnValue({ planned: [], live: [] } as any);
    jest.spyOn(detectorModule, 'detectDrift').mockReturnValue([]);
    jest.spyOn(reportModule, 'buildReport').mockReturnValue({ driftedResources: [], totalDrifted: 0, generatedAt: '' });
    jest.spyOn(snapshotModule, 'saveSnapshot').mockReturnValue(`${TEST_DIR}/snap_123.json`);
    jest.spyOn(snapshotModule, 'buildSnapshot').mockReturnValue({
      id: 'snap_123',
      timestamp: '',
      planFile: 'plan.json',
      report: { driftedResources: [], totalDrifted: 0, generatedAt: '' },
    });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const program = makeProgram();
    program.parse(['node', 'driftcheck', 'snapshot', 'create', 'plan.json', '--dir', TEST_DIR]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('snap_123'));
  });
});

describe('snapshot list', () => {
  it('prints no snapshots message when empty', () => {
    jest.spyOn(snapshotModule, 'listSnapshots').mockReturnValue([]);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const program = makeProgram();
    program.parse(['node', 'driftcheck', 'snapshot', 'list', '--dir', TEST_DIR]);
    expect(consoleSpy).toHaveBeenCalledWith('No snapshots found.');
  });

  it('lists snapshots', () => {
    jest.spyOn(snapshotModule, 'listSnapshots').mockReturnValue([
      { id: 'snap_abc', timestamp: '2024-01-01T00:00:00Z', planFile: 'plan.json' },
    ]);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const program = makeProgram();
    program.parse(['node', 'driftcheck', 'snapshot', 'list', '--dir', TEST_DIR]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('snap_abc'));
  });
});

describe('snapshot delete', () => {
  it('deletes a snapshot and logs confirmation', () => {
    jest.spyOn(snapshotModule, 'deleteSnapshot').mockImplementation(() => {});
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const program = makeProgram();
    program.parse(['node', 'driftcheck', 'snapshot', 'delete', 'snap_abc', '--dir', TEST_DIR]);
    expect(snapshotModule.deleteSnapshot).toHaveBeenCalledWith('snap_abc', expect.any(String));
    expect(consoleSpy).toHaveBeenCalledWith('Snapshot deleted: snap_abc');
  });
});
