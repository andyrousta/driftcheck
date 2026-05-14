import { Command } from 'commander';
import { registerGroupCommand } from './group-command';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerGroupCommand(program);
  return program;
}

describe('registerGroupCommand', () => {
  it('registers the group command', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'group');
    expect(cmd).toBeDefined();
  });

  it('has expected options', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'group')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--group-by');
    expect(optionNames).toContain('--tag-key');
    expect(optionNames).toContain('--suppress');
  });

  it('exits with error for invalid --group-by value', async () => {
    const program = makeProgram();
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      program.parseAsync(['node', 'driftcheck', 'group', 'plan.json', '--group-by', 'invalid'])
    ).rejects.toThrow('process.exit(1)');

    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Invalid --group-by value'));
    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it('exits with error when group-by is tag but no tag-key provided', async () => {
    const program = makeProgram();
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      program.parseAsync(['node', 'driftcheck', 'group', 'plan.json', '--group-by', 'tag'])
    ).rejects.toThrow('process.exit(1)');

    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('tagKey is required'));
    mockExit.mockRestore();
    mockError.mockRestore();
  });
});
