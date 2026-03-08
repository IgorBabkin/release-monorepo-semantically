export const RELEASE_PLUGIN_NAMES = ['package-json', 'changelog', 'git', 'github', 'npm'] as const;

export type ReleasePluginName = (typeof RELEASE_PLUGIN_NAMES)[number];

export interface ReleasePluginConfig {
  name: ReleasePluginName;
  disabled?: boolean;
  template?: string;
  changelogName?: string;
  [key: string]: unknown;
}

export const DEFAULT_RELEASE_PLUGINS: readonly ReleasePluginConfig[] = [
  { name: 'package-json' },
  { name: 'changelog', template: 'templates/changelog.hbs' },
  { name: 'git', template: 'templates/release-commit-msg.hbs' },
  { name: 'github', template: 'templates/github-release-notes.hbs' },
  { name: 'npm' },
];
