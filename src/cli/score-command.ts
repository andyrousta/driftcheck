import { Command } from 'commander';
import * as fs from 'fs';
import { parsePlanFile } from '../drift/parser';
import { detectDrift } from '../drift/detector';
import { scoreDrift, DriftScore } from '../drift/scorer';

function formatScoreOutput(score: DriftScore): string {
  const lines: string[] = [
    `Overall Severity : ${score.overallSeverity.toUpperCase()}`,
    `Total Score      : ${score.totalScore}`,
    '',
    'Resource Breakdown:',
  ];

  if (score.scoredResources.length === 0) {
    lines.push('  No drift detected.');
  } else {
    for (const r of score.scoredResources) {
      lines.push(`  [${r.severityLevel.toUpperCase().padEnd(8)}] ${r.resourceAddress} (score: ${r.score})`);
      for (const reason of r.reasons) {
        lines.push(`             - ${reason}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Validates that the provided --fail-on level is one of the accepted severity values.
 * Returns true if valid, false otherwise.
 */
function isValidFailOnLevel(level: string): boolean {
  return ['low', 'medium', 'high', 'critical'].includes(level);
}

export function registerScoreCommand(program: Command): void {
  program
    .command('score <plan-file> <state-file>')
    .description('Score detected drift by severity based on resource type and attribute sensitivity')
    .option('--json', 'Output score as JSON')
    .option('--fail-on <level>', 'Exit with code 1 if overall severity meets or exceeds level (low|medium|high|critical)', 'high')
    .action((planFile: string, stateFile: string, options: { json?: boolean; failOn: string }) => {
      if (!fs.existsSync(planFile)) {
        console.error(`Plan file not found: ${planFile}`);
        process.exit(1);
      }
      if (!fs.existsSync(stateFile)) {
        console.error(`State file not found: ${stateFile}`);
        process.exit(1);
      }

      if (!isValidFailOnLevel(options.failOn)) {
        console.error(`Invalid --fail-on level: "${options.failOn}". Must be one of: low, medium, high, critical`);
        process.exit(1);
      }

      const plan = parsePlanFile(planFile);
      const stateRaw = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      const driftResults = detectDrift(plan, stateRaw);
      const score = scoreDrift(driftResults);

      if (options.json) {
        console.log(JSON.stringify(score, null, 2));
      } else {
        console.log(formatScoreOutput(score));
      }

      const levels = ['low', 'medium', 'high', 'critical'];
      const failIndex = levels.indexOf(options.failOn);
      const actualIndex = levels.indexOf(score.overallSeverity);
      if (failIndex !== -1 && actualIndex >= failIndex) {
        process.exit(1);
      }
    });
}
