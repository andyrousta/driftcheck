import { DriftedResource } from './types';

export interface ComparisonResult {
  added: DriftedResource[];
  removed: DriftedResource[];
  unchanged: DriftedResource[];
  changed: DriftedResource[];
}

export interface AttributeChange {
  attribute: string;
  before: unknown;
  after: unknown;
}

export interface ResourceChange {
  resourceId: string;
  resourceType: string;
  attributeChanges: AttributeChange[];
}

export function compareResourceLists(
  before: DriftedResource[],
  after: DriftedResource[]
): ComparisonResult {
  const beforeMap = new Map(before.map((r) => [r.resourceId, r]));
  const afterMap = new Map(after.map((r) => [r.resourceId, r]));

  const added: DriftedResource[] = [];
  const removed: DriftedResource[] = [];
  const unchanged: DriftedResource[] = [];
  const changed: DriftedResource[] = [];

  for (const [id, resource] of afterMap) {
    if (!beforeMap.has(id)) {
      added.push(resource);
    }
  }

  for (const [id, resource] of beforeMap) {
    if (!afterMap.has(id)) {
      removed.push(resource);
    } else {
      const afterResource = afterMap.get(id)!;
      const hasChanges =
        JSON.stringify(resource.driftedAttributes) !==
        JSON.stringify(afterResource.driftedAttributes);
      if (hasChanges) {
        changed.push(afterResource);
      } else {
        unchanged.push(resource);
      }
    }
  }

  return { added, removed, unchanged, changed };
}

export function extractResourceChanges(
  before: DriftedResource[],
  after: DriftedResource[]
): ResourceChange[] {
  const beforeMap = new Map(before.map((r) => [r.resourceId, r]));
  const afterMap = new Map(after.map((r) => [r.resourceId, r]));
  const changes: ResourceChange[] = [];

  for (const [id, afterResource] of afterMap) {
    const beforeResource = beforeMap.get(id);
    if (!beforeResource) continue;

    const beforeAttrs = new Map(
      (beforeResource.driftedAttributes ?? []).map((a) => [a.attribute, a.liveValue])
    );
    const afterAttrs = afterResource.driftedAttributes ?? [];

    const attributeChanges: AttributeChange[] = afterAttrs
      .filter((a) => beforeAttrs.get(a.attribute) !== a.liveValue)
      .map((a) => ({
        attribute: a.attribute,
        before: beforeAttrs.get(a.attribute) ?? null,
        after: a.liveValue,
      }));

    if (attributeChanges.length > 0) {
      changes.push({
        resourceId: id,
        resourceType: afterResource.resourceType,
        attributeChanges,
      });
    }
  }

  return changes;
}

export function formatComparisonSummary(result: ComparisonResult): string {
  const lines: string[] = [
    `Comparison Summary:`,
    `  Added:     ${result.added.length}`,
    `  Removed:   ${result.removed.length}`,
    `  Changed:   ${result.changed.length}`,
    `  Unchanged: ${result.unchanged.length}`,
  ];
  return lines.join('\n');
}
