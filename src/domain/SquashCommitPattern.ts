export interface SquashPatternConfig {
  /** Regular expression tested against a commit's subject line; a match marks the commit as a squash commit. */
  detect: string;
  /** Regular expression tested against each body line of a squash commit; a match is the header of one squashed commit (capture group 1 if present, else the whole match). */
  entry: string;
}

export type SquashPreset = 'github';

// GitHub's default squash-merge message: the PR title suffixed with `(#<number>)`,
// and a body listing each squashed commit's header as a `* ` bullet.
export const SQUASH_PRESETS: Record<SquashPreset, SquashPatternConfig> = {
  github: { detect: '\\(#\\d+\\)$', entry: '^\\* (.+)$' },
};

// There is no standard for squash commit messages (Conventional Commits treats a
// squash as a single commit whose message the maintainer writes), so the
// consumer describes its own format here.
export class SquashCommitPattern {
  static fromConfig(config: SquashPreset | SquashPatternConfig): SquashCommitPattern {
    const { detect, entry } = typeof config === 'string' ? SQUASH_PRESETS[config] : config;
    return new SquashCommitPattern(new RegExp(detect), new RegExp(entry));
  }

  constructor(
    private readonly detect: RegExp,
    private readonly entry: RegExp,
  ) {}

  /**
   * Headers of the commits squashed into this one. Empty when the commit isn't a
   * squash commit or its body lists no recognizable entries, in which case the
   * commit should be read by its own subject.
   */
  findSquashedHeaders(subject: string, body: string): string[] {
    if (!this.detect.test(subject)) return [];
    return body
      .split(/\r?\n/)
      .map((line) => line.match(this.entry))
      .filter((match) => match !== null)
      .map((match) => (match[1] ?? match[0]).trim())
      .filter((header) => header.length > 0);
  }
}
