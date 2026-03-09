import { ConventionalCommit } from '../models/ConventionalCommit';
import { NpmPackage } from '../models/NpmPackage';
import { constructor, GroupAliasToken, hook, HookClass, HookFn, HooksRunner, IContainer } from 'ts-ioc-container';

export interface ReleasePlugin {
  priority: number;
}

const byPriorityAsc = (a: { priority: number }, b: { priority: number }) => a.priority - b.priority;
export const ReleasePluginKey = new GroupAliasToken<ReleasePlugin>('ReleasePlugin');
export const releasePlugins = (c: IContainer) => ReleasePluginKey.resolve(c).sort(byPriorityAsc);

export interface PackageReleasedPluginContext {
  pkg: NpmPackage;
  releasedVersions: Map<string, string>;
  releasedPackages: NpmPackage[];
  releasedCommits: ConventionalCommit[];
}
export const onPackageReleasedHook = (...hooks: (HookFn | constructor<HookClass>)[]) => hook('onPackageReleased', ...hooks);
export const onPackageReleasedHooksRunner = new HooksRunner('onPackageReleased');

export interface ReleaseCompletePluginContext {
  releasedVersions: Map<string, string>;
  releasedPackages: NpmPackage[];
  releasedCommits: Map<string, ConventionalCommit[]>;
}
export const onReleaseCompleteHook = (...hooks: (HookFn | constructor<HookClass>)[]) => hook('onReleaseComplete', ...hooks);
export const onReleaseCompleteHooksRunner = new HooksRunner('onReleaseComplete');
