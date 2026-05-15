import { EnricherConfig } from './enricher';

export function buildEnricherConfigFromEnv(): Partial<EnricherConfig> {
  const config: Partial<EnricherConfig> = {};

  if (process.env.DRIFTCHECK_ENRICHER_SOURCE) {
    config.source = process.env.DRIFTCHECK_ENRICHER_SOURCE;
  }

  if (process.env.DRIFTCHECK_ENRICHER_TAGS) {
    try {
      config.defaultTags = JSON.parse(process.env.DRIFTCHECK_ENRICHER_TAGS);
    } catch {
      // ignore malformed JSON
    }
  }

  if (process.env.DRIFTCHECK_ENRICHER_ANNOTATIONS) {
    try {
      config.defaultAnnotations = JSON.parse(process.env.DRIFTCHECK_ENRICHER_ANNOTATIONS);
    } catch {
      // ignore malformed JSON
    }
  }

  return config;
}

export function validateEnricherConfig(config: Partial<EnricherConfig>): string[] {
  const errors: string[] = [];
  if (!config.source || config.source.trim() === '') {
    errors.push('enricher source must be a non-empty string');
  }
  return errors;
}

export function mergeEnricherConfig(
  base: EnricherConfig,
  override: Partial<EnricherConfig>
): EnricherConfig {
  return {
    source: override.source ?? base.source,
    defaultTags: { ...base.defaultTags, ...override.defaultTags },
    defaultAnnotations: { ...base.defaultAnnotations, ...override.defaultAnnotations },
  };
}
