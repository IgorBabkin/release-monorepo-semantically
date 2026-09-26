import { describe, expect, it } from 'vitest';
import { releaseConfigJsonSchema } from './releaseConfigSchema.js';

describe('releaseConfigJsonSchema', () => {
  const schema = releaseConfigJsonSchema() as {
    type: string;
    properties: Record<string, { properties: Record<string, unknown>; required?: string[] }>;
  };

  it('describes one section per step, plus $schema for editors', () => {
    expect(Object.keys(schema.properties).sort()).toEqual(['$schema', 'changelog', 'package-json', 'package-manager', 'release-notes', 'report', 'vcs']);
  });

  it('treats fields with defaults as optional input', () => {
    expect(schema.properties.changelog.required ?? []).not.toContain('changelogName');
    expect(schema.properties['package-manager'].properties).toHaveProperty('kind');
  });

  it('exposes the bump matcher fields for report', () => {
    const bumps = schema.properties.report.properties.bumps as { properties: Record<string, { items: { properties: object } }> };
    expect(Object.keys(bumps.properties.patch.items.properties).sort()).toEqual(['breaking', 'packages', 'scope', 'type']);
  });
});
