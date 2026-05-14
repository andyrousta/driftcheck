import {
  computeAttributeDelta,
  diffAttributes,
  buildDiffSummary,
  formatDiffSummary,
} from './differ';
import { DriftedResource } from './types';

const makeDriftedResource = (id: string, attrs: { attribute: string; plannedValue: unknown; liveValue: unknown }[]): DriftedResource => ({
  resourceId: id,
  resourceType: 'aws_instance',
  driftedAttributes: attrs.map((a) => ({ ...a, severity: 'medium' as const })),
});

describe('computeAttributeDelta', () => {
  it('computes numeric delta with sign', () => {
    expect(computeAttributeDelta(2, 5)).toBe('+3');
    expect(computeAttributeDelta(10, 7)).toBe('-3');
    expect(computeAttributeDelta(4, 4)).toBe('+0');
  });

  it('formats string changes as arrow notation', () => {
    expect(computeAttributeDelta('t2.micro', 't3.medium')).toBe('"t2.micro" → "t3.medium"');
  });

  it('falls back to JSON serialization for other types', () => {
    expect(computeAttributeDelta(true, false)).toBe('true → false');
    expect(computeAttributeDelta({ a: 1 }, { a: 2 })).toBe('{"a":1} → {"a":2}');
  });
});

describe('diffAttributes', () => {
  it('returns attribute diffs with delta strings', () => {
    const resource = makeDriftedResource('res-1', [
      { attribute: 'instance_type', plannedValue: 't2.micro', liveValue: 't3.medium' },
      { attribute: 'count', plannedValue: 1, liveValue: 3 },
    ]);
    const diffs = diffAttributes(resource.driftedAttributes);
    expect(diffs).toHaveLength(2);
    expect(diffs[0].delta).toBe('"t2.micro" → "t3.medium"');
    expect(diffs[1].delta).toBe('+2');
  });
});

describe('buildDiffSummary', () => {
  const planned = ['res-1', 'res-2', 'res-3'];
  const live = ['res-1', 'res-2', 'res-4'];
  const drifted = [makeDriftedResource('res-1', [{ attribute: 'ami', plannedValue: 'ami-old', liveValue: 'ami-new' }])];

  it('identifies added resources present only in live state', () => {
    const summary = buildDiffSummary(planned, live, drifted);
    expect(summary.added).toEqual(['res-4']);
  });

  it('identifies removed resources present only in plan', () => {
    const summary = buildDiffSummary(planned, live, drifted);
    expect(summary.removed).toEqual(['res-3']);
  });

  it('identifies unchanged resources', () => {
    const summary = buildDiffSummary(planned, live, drifted);
    expect(summary.unchanged).toEqual(['res-2']);
  });

  it('includes drifted resources in changed', () => {
    const summary = buildDiffSummary(planned, live, drifted);
    expect(summary.changed).toHaveLength(1);
    expect(summary.changed[0].resourceId).toBe('res-1');
  });
});

describe('formatDiffSummary', () => {
  it('renders a readable summary string', () => {
    const resource = makeDriftedResource('res-1', [{ attribute: 'ami', plannedValue: 'ami-old', liveValue: 'ami-new' }]);
    const summary = buildDiffSummary(['res-1', 'res-2'], ['res-1', 'res-3'], [resource]);
    const output = formatDiffSummary(summary);
    expect(output).toContain('Diff Summary:');
    expect(output).toContain('Added (live only):   1');
    expect(output).toContain('Removed (plan only): 1');
    expect(output).toContain('Changed (drifted):   1');
    expect(output).toContain('+ res-3');
    expect(output).toContain('- res-2');
    expect(output).toContain('~ res-1');
    expect(output).toContain('ami:');
  });
});
