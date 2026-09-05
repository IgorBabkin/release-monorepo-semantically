import { describe, expect, it } from 'vitest';
import { isDryRun, STEP_OPTIONS, stepCommand } from './cli.js';

describe('isDryRun', () => {
  it('given the --dry-run flag when config has no dryRun then the step is a dry run', () => {
    expect(isDryRun({ dryRun: true }, { dryRun: false })).toBe(true);
  });

  it('given no --dry-run flag when config has dryRun then the step is still a dry run', () => {
    expect(isDryRun({ dryRun: false }, { dryRun: true })).toBe(true);
  });

  it('given neither the flag nor config request it then the step is not a dry run', () => {
    expect(isDryRun({ dryRun: false }, { dryRun: false })).toBe(false);
  });
});

describe('stepCommand', () => {
  it('given --context and --dry-run when parsed then options default dryRun to false when omitted', () => {
    const command = stepCommand();
    command.parse(['node', 'script', '--context', '{}'], { from: 'node' });

    const options = STEP_OPTIONS.parse(command.opts());

    expect(options).toEqual({ context: '{}', dryRun: false, verbose: false });
  });

  it('given --dry-run when parsed then it overrides the default', () => {
    const command = stepCommand();
    command.parse(['node', 'script', '--context', '{}', '--dry-run'], { from: 'node' });

    const options = STEP_OPTIONS.parse(command.opts());

    expect(options.dryRun).toBe(true);
  });

  it('given --verbose when parsed then the step reports its release plan', () => {
    const command = stepCommand();
    command.parse(['node', 'script', '--context', '{}', '--verbose'], { from: 'node' });

    expect(STEP_OPTIONS.parse(command.opts()).verbose).toBe(true);
  });

  it('given a flag meant for a sibling action when parsed then it is tolerated instead of raising an error', () => {
    // Regression: a controller's default action can fan out into several
    // methods sharing one argv (e.g. `vcs` runs commit, then tag, then
    // push); a flag understood only by one of them must not blow up the
    // others.
    const command = stepCommand();

    expect(() => command.parse(['node', 'script', '--context', '{}', '--template', 'templates/x.hbs'], { from: 'node' })).not.toThrow();
  });
});
