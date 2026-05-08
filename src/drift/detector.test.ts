import { detectDrift } from './detector';
import { DriftStatus, TerraformPlanResource, LiveResource } from './types';

const makePlanned = (overrides?: Partial<TerraformPlanResource>): TerraformPlanResource => ({
  id: 'aws_instance.web',
  type: 'aws_instance',
  name: 'web',
  attributes: { instance_type: 't3.micro', ami: 'ami-12345678' },
  ...overrides,
});

const makeLive = (overrides?: Partial<LiveResource>): LiveResource => ({
  id: 'aws_instance.web',
  type: 'aws_instance',
  attributes: { instance_type: 't3.micro', ami: 'ami-12345678' },
  ...overrides,
});

describe('detectDrift', () => {
  it('returns OK when planned and live attributes match', () => {
    const results = detectDrift([makePlanned()], [makeLive()]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe(DriftStatus.OK);
    expect(results[0].driftedAttributes).toHaveLength(0);
  });

  it('returns DRIFTED when an attribute differs', () => {
    const results = detectDrift(
      [makePlanned()],
      [makeLive({ attributes: { instance_type: 't3.large', ami: 'ami-12345678' } })]
    );
    expect(results[0].status).toBe(DriftStatus.DRIFTED);
    expect(results[0].driftedAttributes).toContain('instance_type');
  });

  it('returns MISSING when resource is in plan but not live', () => {
    const results = detectDrift([makePlanned()], []);
    expect(results[0].status).toBe(DriftStatus.MISSING);
  });

  it('returns UNPLANNED when resource is live but not in plan', () => {
    const results = detectDrift([], [makeLive()]);
    expect(results[0].status).toBe(DriftStatus.UNPLANNED);
    expect(results[0].resourceId).toBe('aws_instance.web');
  });

  it('handles multiple resources with mixed statuses', () => {
    const planned = [
      makePlanned({ id: 'res.a', name: 'a' }),
      makePlanned({ id: 'res.b', name: 'b' }),
    ];
    const live = [
      makeLive({ id: 'res.a', attributes: { instance_type: 't3.large', ami: 'ami-12345678' } }),
      makeLive({ id: 'res.c' }),
    ];
    const results = detectDrift(planned, live);
    const statusMap = Object.fromEntries(results.map((r) => [r.resourceId, r.status]));
    expect(statusMap['res.a']).toBe(DriftStatus.DRIFTED);
    expect(statusMap['res.b']).toBe(DriftStatus.MISSING);
    expect(statusMap['res.c']).toBe(DriftStatus.UNPLANNED);
  });
});
