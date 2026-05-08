import { TerraformPlanResource, LiveResource, DriftResult, DriftStatus } from './types';

export function detectDrift(
  plannedResources: TerraformPlanResource[],
  liveResources: LiveResource[]
): DriftResult[] {
  const results: DriftResult[] = [];

  const liveMap = new Map<string, LiveResource>();
  for (const live of liveResources) {
    liveMap.set(live.id, live);
  }

  for (const planned of plannedResources) {
    const live = liveMap.get(planned.id);

    if (!live) {
      results.push({
        resourceId: planned.id,
        resourceType: planned.type,
        status: DriftStatus.MISSING,
        driftedAttributes: [],
        message: `Resource '${planned.id}' exists in plan but not found in live infrastructure.`,
      });
      continue;
    }

    const driftedAttributes = findDriftedAttributes(planned.attributes, live.attributes);

    if (driftedAttributes.length > 0) {
      results.push({
        resourceId: planned.id,
        resourceType: planned.type,
        status: DriftStatus.DRIFTED,
        driftedAttributes,
        message: `Resource '${planned.id}' has ${driftedAttributes.length} drifted attribute(s).`,
      });
    } else {
      results.push({
        resourceId: planned.id,
        resourceType: planned.type,
        status: DriftStatus.OK,
        driftedAttributes: [],
        message: `Resource '${planned.id}' matches planned state.`,
      });
    }

    liveMap.delete(planned.id);
  }

  for (const [id, live] of liveMap.entries()) {
    results.push({
      resourceId: id,
      resourceType: live.type,
      status: DriftStatus.UNPLANNED,
      driftedAttributes: [],
      message: `Resource '${id}' exists in live infrastructure but not in plan.`,
    });
  }

  return results;
}

function findDriftedAttributes(
  planned: Record<string, unknown>,
  live: Record<string, unknown>
): string[] {
  const drifted: string[] = [];
  for (const key of Object.keys(planned)) {
    if (JSON.stringify(planned[key]) !== JSON.stringify(live[key])) {
      drifted.push(key);
    }
  }
  return drifted;
}
