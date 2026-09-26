import { describe, expect, it } from 'vitest';
import { SquashCommitPattern } from './SquashCommitPattern.js';

describe('SquashCommitPattern', () => {
  it('given the github preset and a squash-merge message when read then bullet headers are returned', () => {
    const pattern = SquashCommitPattern.fromConfig('github');

    const headers = pattern.findSquashedHeaders('Add feature (#42)', '* feat(pkg-a): add x\n\nlonger body\n\n* fix(pkg-b): y\r\n\nCo-authored-by: someone');

    expect(headers).toEqual(['feat(pkg-a): add x', 'fix(pkg-b): y']);
  });

  it('given a subject not matching detect when read then nothing is returned', () => {
    const pattern = SquashCommitPattern.fromConfig('github');

    expect(pattern.findSquashedHeaders('feat(pkg-a): add x', '* fix(pkg-b): y')).toEqual([]);
  });

  it('given a custom pattern without a capture group when read then the whole match is the header', () => {
    const pattern = SquashCommitPattern.fromConfig({ detect: '^Squashed commit of the following:', entry: '(?<=^    )\\w+(?:\\(.*\\))?!?: .+' });

    const body = 'commit abc\nAuthor: me\nDate: today\n\n    feat(pkg-a): add x\n\n    details\n';
    const headers = pattern.findSquashedHeaders('Squashed commit of the following:', body);

    expect(headers).toEqual(['feat(pkg-a): add x']);
  });
});
