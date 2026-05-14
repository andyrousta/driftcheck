export type ExportFormat = 'json' | 'csv' | 'markdown';

export interface ExporterConfig {
  format: ExportFormat;
  outputPath?: string;
}

const VALID_FORMATS: ExportFormat[] = ['json', 'csv', 'markdown'];

export function isValidExportFormat(value: string): value is ExportFormat {
  return VALID_FORMATS.includes(value as ExportFormat);
}

export function buildExporterConfigFromEnv(): Partial<ExporterConfig> {
  const config: Partial<ExporterConfig> = {};

  const format = process.env.DRIFTCHECK_EXPORT_FORMAT;
  if (format && isValidExportFormat(format)) {
    config.format = format;
  }

  const outputPath = process.env.DRIFTCHECK_EXPORT_PATH;
  if (outputPath) {
    config.outputPath = outputPath;
  }

  return config;
}

export function validateExporterConfig(
  config: Partial<ExporterConfig>
): ExporterConfig {
  if (!config.format) {
    throw new Error(
      `Exporter config missing required field: format. Valid values: ${VALID_FORMATS.join(', ')}`
    );
  }
  if (!isValidExportFormat(config.format)) {
    throw new Error(
      `Invalid export format: "${config.format}". Valid values: ${VALID_FORMATS.join(', ')}`
    );
  }
  return config as ExporterConfig;
}

export function mergeExporterConfig(
  base: Partial<ExporterConfig>,
  overrides: Partial<ExporterConfig>
): Partial<ExporterConfig> {
  return { ...base, ...overrides };
}
