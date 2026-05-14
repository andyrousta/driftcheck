import { Command } from 'commander';
import { registerScheduleCommand } from './schedule-command';
import { DriftScheduler } from '../drift/scheduler';
import { parsePlanFile } from '../drift/parser';
import { detectDrift } from '../drift/detector';
import { buildReport, hasDrift } from '../drift/report';

jest.mock('../drift/scheduler');
jest.mock('../drift/parser');
jest.mock('../drift/detector');
jest.mock('../drift/report');
jest.mock('../drift/suppressor');

const MockScheduler = DriftScheduler as jest.MockedClass<typeof DriftScheduler>;

describe('registerScheduleCommand', () => {
  let program: Command;
  let mockRegister: jest.Mock;
  let mockStart: jest.Mock;
  let mockOn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    program = new Command();
    program.exitOverride();

    mockRegister = jest.fn();
    mockStart = jest.fn();
    mockOn = jest.fn().mockReturnThis();

    MockScheduler.mockImplementation(() => ({
      register: mockRegister,
      start: mockStart,
      on: mockOn,
      stop: jest.fn(),
      listTasks: jest.fn(),
      emit: jest.fn(),
    } as unknown as DriftScheduler));

    registerScheduleCommand(program);
  });

  it('registers the schedule command', () => {
    const cmd = program.commands.find((c) => c.name() === 'schedule');
    expect(cmd).toBeDefined();
  });

  it('calls scheduler.register and scheduler.start', async () => {
    (parsePlanFile as jest.Mock).mockResolvedValue({});
    (detectDrift as jest.Mock).mockReturnValue([]);
    (buildReport as jest.Mock).mockReturnValue('No drift');
    (hasDrift as jest.Mock).mockReturnValue(false);

    await program.parseAsync(['node', 'driftcheck', 'schedule', '--plan', 'plan.json']);

    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('uses custom cron expression when provided', async () => {
    (parsePlanFile as jest.Mock).mockResolvedValue({});
    (detectDrift as jest.Mock).mockReturnValue([]);
    (buildReport as jest.Mock).mockReturnValue('');
    (hasDrift as jest.Mock).mockReturnValue(false);

    await program.parseAsync([
      'node', 'driftcheck', 'schedule',
      '--plan', 'plan.json',
      '--cron', '*/10 * * * *',
    ]);

    const registeredTask = mockRegister.mock.calls[0][0];
    expect(registeredTask.config.cronExpression).toBe('*/10 * * * *');
  });
});
