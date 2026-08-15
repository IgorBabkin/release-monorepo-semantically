export abstract class DomainException extends Error {
  protected constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class MissingDependencyVersionException extends DomainException {
  constructor(packageName: string, dependencyName: string) {
    super('MISSING_DEPENDENCY_VERSION', `Dependency ${dependencyName} not found in ${packageName}`);
  }
}

export class GithubCliUnavailableException extends DomainException {
  constructor() {
    super('GITHUB_CLI_UNAVAILABLE', 'GitHub release creation requires `gh` CLI when running in GitHub Actions');
  }
}

export class TemplateInvocationTargetException extends DomainException {
  constructor(methodName: string) {
    super('TEMPLATE_INVOCATION_TARGET_INVALID', `Cannot call method ${methodName} on non-object target`);
  }
}

export class TemplateMethodNotFunctionException extends DomainException {
  constructor(methodName: string) {
    super('TEMPLATE_METHOD_NOT_FUNCTION', `Method ${methodName} is not a function`);
  }
}

export class DirtyWorkingTreeException extends DomainException {
  constructor() {
    super('DIRTY_WORKING_TREE', 'Release requires a clean working tree (commit or stash local changes first)');
  }
}

export class InvalidReleasePluginsConfigException extends DomainException {
  constructor(reason: string) {
    super('INVALID_RELEASE_PLUGINS_CONFIG', `Invalid release plugin configuration: ${reason}. Allowed plugin ids: package-json, changelog, git, github, npm`);
  }
}

export class InvalidConfigException extends DomainException {
  constructor(section: string, detail: string) {
    super('INVALID_CONFIG', `Invalid release configuration for "${section}": ${detail}`);
  }
}

export class MissingGithubCredentialsException extends DomainException {
  constructor() {
    super(
      'MISSING_GITHUB_CREDENTIALS',
      'GitHub releases need a repository and token: set release.release-notes.repository/token, or the GITHUB_REPOSITORY/GITHUB_TOKEN environment variables',
    );
  }
}

export class MissingControllerException extends DomainException {
  constructor() {
    super('MISSING_CONTROLLER', 'Usage: monorepo-semantic-release <controller> [action] [--flags...]');
  }
}
