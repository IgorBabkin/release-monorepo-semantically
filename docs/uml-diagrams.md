# UML Models for Release Domain

This document contains UML diagrams of the release task domain using Mermaid format. These diagrams render directly on GitHub, GitLab, and in most modern **markdown** viewers.

> **💡 Viewing in Cursor?** Install the "Markdown Preview Mermaid Support" extension, then press `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux) to open the preview. See [`CURSOR-VISUALIZATION.md`](CURSOR-VISUALIZATION.md) for detailed instructions.

## 1. Complete Domain Model

This diagram shows the complete class structure of the release domain, including all classes, interfaces, and their relationships.

```mermaid
classDiagram
    class ReleaseController {
        -string rootPath
        -ReleaseOptions options
        -Map~string,string~ releasedVersions
        +execute() Promise~void~
        -discoverPackages() NpmPackage[]
        -buildDependencyGraph(packages) Map
        -topologicalSort(packages, graph) NpmPackage[]
        -processPackage(pkg) PackageRelease
        -checkDependencyUpdates(pkg) DependencyUpdate[]
        -releasePackage(release) Promise~void~
        -getLastTag(packageName) string
        -updatePackageDependencies(pkg, updates) void
        -runNpmVersion(pkg, version) void
        -generateChangelog(pkg, release) void
        -createTag(packageName, version) void
        -updateLockfile() void
        -createReleaseCommit(releases) void
        -pushToRemote(releases) void
        -printSummary(releases) void
    }

    class CommitParser {
        <<static>>
        +parse(commitMessage, hash) ConventionalCommit
        +getCommitsSince(sinceTag) ConventionalCommit[]
        +filterByScope(commits, packageName) ConventionalCommit[]
        +validateConventional(commits) ValidationResult
        +isReleaseTrigger(type) boolean
    }

    class SemverCalculator {
        <<static>>
        +calculateBump(commits, dependencyUpdates) SemVerBumpType
        +bumpVersion(version, bumpType) string
        +getBumpReason(commits, dependencyUpdates) string
        +filterReleaseCommits(commits) ConventionalCommit[]
        +isExactVersion(version) boolean
        +compareVersions(v1, v2) number
    }

    class NpmPackage {
        +string name
        +string path
        +string version
        +boolean private
        +Record~string,string~ dependencies
        +Record~string,string~ devDependencies
    }

    class ConventionalCommit {
        +string hash
        +CommitType type
        +string scope
        +string subject
        +string body
        +Record~string,string~ footer
        +boolean isBreaking
        +string authorName
        +string authorEmail
        +Date date
    }

    class PackageRelease {
        +NpmPackage package
        +ConventionalCommit[] commits
        +DependencyUpdate[] dependencyUpdates
        +SemVerBumpType bumpType
        +string oldVersion
        +string newVersion
    }

    class DependencyUpdate {
        +string packageName
        +string oldVersion
        +string newVersion
    }

    class ReleaseOptions {
        +boolean dryRun
    }

    class ChangelogEntry {
        +string version
        +string date
        +ConventionalCommit[] breakingChanges
        +ConventionalCommit[] features
        +ConventionalCommit[] fixes
        +ConventionalCommit[] performance
        +DependencyUpdate[] dependencyUpdates
    }

    class SemVerBumpType {
        <<enumeration>>
        NONE
        PATCH
        MINOR
        MAJOR
    }

    class CommitType {
        <<enumeration>>
        feat
        fix
        perf
        docs
        test
        ci
        chore
        refactor
        style
    }

    ReleaseController --> ReleaseOptions : uses
    ReleaseController --> NpmPackage : processes
    ReleaseController --> PackageRelease : creates
    ReleaseController --> DependencyUpdate : tracks
    ReleaseController --> ChangelogEntry : generates
    ReleaseController ..> CommitParser : uses
    ReleaseController ..> SemverCalculator : uses

    PackageRelease --> NpmPackage : contains
    PackageRelease --> ConventionalCommit : contains
    PackageRelease --> DependencyUpdate : contains
    PackageRelease --> SemVerBumpType : uses

    ChangelogEntry --> ConventionalCommit : contains
    ChangelogEntry --> DependencyUpdate : contains

    ConventionalCommit --> CommitType : uses

    CommitParser ..> ConventionalCommit : creates
    SemverCalculator ..> ConventionalCommit : analyzes
    SemverCalculator ..> DependencyUpdate : analyzes
    SemverCalculator --> SemVerBumpType : returns
```

## 2. Domain Entities (DDD Model)

This diagram focuses on the core domain entities using Domain-Driven Design concepts, showing aggregates, entities, and value objects.

```mermaid
classDiagram
    class PackageRelease {
        <<aggregate>>
        +NpmPackage package
        +ConventionalCommit[] commits
        +DependencyUpdate[] dependencyUpdates
        +SemVerBumpType bumpType
        +string oldVersion
        +string newVersion
    }

    class NpmPackage {
        <<entity>>
        +string name
        +string path
        +string version
        +boolean private
        +Record~string,string~ dependencies
        +Record~string,string~ devDependencies
    }

    class ConventionalCommit {
        <<entity>>
        +string hash
        +CommitType type
        +string scope
        +string subject
        +string body
        +Record~string,string~ footer
        +boolean isBreaking
        +string authorName
        +string authorEmail
        +Date date
    }

    class DependencyUpdate {
        <<value>>
        +string packageName
        +string oldVersion
        +string newVersion
    }

    class ChangelogEntry {
        <<value>>
        +string version
        +string date
        +ConventionalCommit[] breakingChanges
        +ConventionalCommit[] features
        +ConventionalCommit[] fixes
        +ConventionalCommit[] performance
        +DependencyUpdate[] dependencyUpdates
    }

    class SemVerBumpType {
        <<enumeration>>
        NONE
        PATCH
        MINOR
        MAJOR
    }

    class CommitType {
        <<enumeration>>
        feat
        fix
        perf
        docs
        test
        ci
        chore
        refactor
        style
    }

    PackageRelease *-- NpmPackage : contains
    PackageRelease *-- ConventionalCommit : contains (many)
    PackageRelease *-- DependencyUpdate : contains (many)
    PackageRelease --> SemVerBumpType : uses

    ChangelogEntry *-- ConventionalCommit : contains (many)
    ChangelogEntry *-- DependencyUpdate : contains (many)

    ConventionalCommit --> CommitType : uses
```

**Notes:**

- **PackageRelease** is the aggregate root that encapsulates all data needed to perform a release
- **NpmPackage** and **ConventionalCommit** are entities with identity (name/hash)
- **DependencyUpdate** and **ChangelogEntry** are value objects (immutable)

## 3. Service Layer Architecture

This diagram shows the service layer architecture and how services interact with domain entities.

```mermaid
classDiagram
    class ReleaseController {
        <<service>>
        -string rootPath
        -ReleaseOptions options
        -Map~string,string~ releasedVersions
    }

    class CommitParser {
        <<service>>
        <<static>>
        +parse(commitMessage, hash) ConventionalCommit
        +getCommitsSince(sinceTag) ConventionalCommit[]
        +filterByScope(commits, packageName) ConventionalCommit[]
        +validateConventional(commits) ValidationResult
        +isReleaseTrigger(type) boolean
    }

    class SemverCalculator {
        <<service>>
        <<static>>
        +calculateBump(commits, dependencyUpdates) SemVerBumpType
        +bumpVersion(version, bumpType) string
        +getBumpReason(commits, dependencyUpdates) string
        +filterReleaseCommits(commits) ConventionalCommit[]
        +isExactVersion(version) boolean
        +compareVersions(v1, v2) number
    }

    class VcsService {
        <<service>>
        +getCommits(sinceTag) GitCommit[]
        +getCurrentBranch() string
        +getLatestTag(packagePath) string
        +createTag(tagName, message) void
        +commit(message, files) void
        +push(includeTags) void
        +hasUncommittedChanges() boolean
    }

    class FileSystemService {
        <<service>>
        +readJson(filePath) any
        +writeJson(filePath, data) void
        +readFile(filePath) string
        +writeFile(filePath, content) void
        +fileExists(filePath) boolean
        +findPackages(rootPath) string[]
    }

    class ReleaseOptions {
        <<interface>>
        +boolean dryRun
    }

    class PackageRelease {
        <<domain>>
    }

    class ConventionalCommit {
        <<domain>>
    }

    class DependencyUpdate {
        <<value>>
    }

    class SemVerBumpType {
        <<enumeration>>
    }

    class CommitType {
        <<enumeration>>
    }

    ReleaseController ..> CommitParser : uses
    ReleaseController ..> SemverCalculator : uses
    ReleaseController ..> VcsService : uses
    ReleaseController ..> FileSystemService : uses
    ReleaseController --> ReleaseOptions : uses
    ReleaseController ..> PackageRelease : creates

    CommitParser ..> VcsService : uses
    CommitParser ..> ConventionalCommit : creates
    CommitParser ..> CommitType : uses

    SemverCalculator ..> ConventionalCommit : analyzes
    SemverCalculator ..> DependencyUpdate : analyzes
    SemverCalculator --> SemVerBumpType : returns
```

**Service Responsibilities:**

- **ReleaseController**: Main controller implementing the release workflow
- **CommitParser**: Domain service for parsing and validating conventional commits
- **SemverCalculator**: Domain service for semantic version calculations
- **VcsService**: Infrastructure service encapsulating all VCS/Git operations (commits, tags, push, etc.)
- **FileSystemService**: Infrastructure service encapsulating all file system operations (read/write JSON, file I/O, package discovery)

## 4. Release Workflow Sequence

This sequence diagram illustrates the complete release workflow from start to finish.

```mermaid
sequenceDiagram
    actor User
    participant CLI as CLI Entry Point
    participant Controller as ReleaseController
    participant Parser as CommitParser
    participant Semver as SemverCalculator
    participant VCS as VcsService
    participant FSS as FileSystemService
    participant Git as Git Repository
    participant FS as File System
    participant NPM as NPM

    User->>CLI: Execute release command
    activate CLI

    CLI->>Controller: new ReleaseController(rootPath, options)
    activate Controller

    CLI->>Controller: execute()
    activate Controller

    Note over Controller: Phase 1: Discovery
    Controller->>FSS: readJson(package.json)
    activate FSS
    FSS->>FS: read file
    activate FS
    FS-->>FSS: file content
    deactivate FS
    FSS-->>Controller: root package.json
    deactivate FSS

    Controller->>Controller: discoverPackages()
    Controller->>FSS: findPackages(rootPath)
    activate FSS
    FSS->>FS: glob workspace patterns
    activate FS
    FS-->>FSS: package paths
    deactivate FS
    FSS-->>Controller: package paths
    deactivate FSS

    loop For each package path
        Controller->>FSS: readJson(package.json)
        activate FSS
        FSS->>FS: read file
        activate FS
        FS-->>FSS: file content
        deactivate FS
        FSS-->>Controller: package data
        deactivate FSS
        Controller->>Controller: create NpmPackage
    end

    Note over Controller: Phase 2: Dependency Graph
    Controller->>Controller: buildDependencyGraph(packages)
    Controller->>Controller: topologicalSort(packages, graph)

    Note over Controller: Phase 3: Process Packages
    loop For each package (topologically sorted)
        Controller->>Controller: processPackage(pkg)

        Controller->>VCS: getLatestTag(packagePath)
        activate VCS
        VCS->>Git: git tag operations
        activate Git
        Git-->>VCS: lastTag or null
        deactivate Git
        VCS-->>Controller: lastTag or null
        deactivate VCS

        Controller->>Parser: getCommitsSince(lastTag)
        activate Parser
        Parser->>VCS: getCommits(sinceTag)
        activate VCS
        VCS->>Git: git log
        activate Git
        Git-->>VCS: commit messages
        deactivate Git
        VCS-->>Parser: GitCommit[]
        deactivate VCS
        Parser->>Parser: parse commits
        Parser-->>Controller: ConventionalCommit[]
        deactivate Parser

        Controller->>Parser: filterByScope(commits, packageName)
        activate Parser
        Parser-->>Controller: filtered commits
        deactivate Parser

        Controller->>Controller: checkDependencyUpdates(pkg)

        Controller->>Semver: calculateBump(commits, dependencyUpdates)
        activate Semver
        Semver-->>Controller: SemVerBumpType
        deactivate Semver

        Controller->>Semver: bumpVersion(oldVersion, bumpType)
        activate Semver
        Semver-->>Controller: newVersion
        deactivate Semver

        Controller->>Controller: create PackageRelease

        alt bumpType !== NONE
            Controller->>Controller: releasePackage(release)

            alt !dryRun
                Controller->>Controller: updatePackageDependencies()
                Controller->>FSS: writeJson(package.json, data)
                activate FSS
                FSS->>FS: write file
                activate FS
                deactivate FS
                FSS-->>Controller: success
                deactivate FSS

                Controller->>PNPM: pnpm version
                activate PNPM
                PNPM-->>Controller: version updated
                deactivate PNPM

                Controller->>Controller: generateChangelog()
                Controller->>FSS: readFile/writeFile(CHANGELOG.md)
                activate FSS
                FSS->>FS: read/write file
                activate FS
                deactivate FS
                FSS-->>Controller: success
                deactivate FSS

                Controller->>VCS: createTag(tagName, message)
                activate VCS
                VCS->>Git: git tag
                activate Git
                Git-->>VCS: tag created
                deactivate Git
                VCS-->>Controller: success
                deactivate VCS
            end
        end
    end

    Note over Controller: Phase 4: Finalization
    alt !dryRun
        Controller->>NPM: pnpm install --lockfile-only
        activate NPM
        NPM-->>Controller: lockfile updated
        deactivate NPM

        Controller->>Controller: createReleaseCommit(releases)
        Controller->>VCS: commit(message, files)
        activate VCS
        VCS->>Git: git add & git commit
        activate Git
        Git-->>VCS: commit created
        deactivate Git
        VCS-->>Controller: success
        deactivate VCS

        Controller->>Controller: pushToRemote(releases)
        Controller->>VCS: push(includeTags: false)
        activate VCS
        VCS->>Git: git push
        activate Git
        Git-->>VCS: pushed
        deactivate Git
        VCS-->>Controller: success
        deactivate VCS

        Controller->>VCS: push(includeTags: true)
        activate VCS
        VCS->>Git: git push --tags
        activate Git
        Git-->>VCS: tags pushed
        deactivate Git
        VCS-->>Controller: success
        deactivate VCS
    end

    Controller->>Controller: printSummary(releases)
    Controller-->>CLI: complete
    deactivate Controller

    CLI-->>User: Release complete
    deactivate CLI
```

## 5. Entity Relationship Diagram

This ER diagram shows the relationships between domain entities in a more traditional database-style view.

```mermaid
erDiagram
    PACKAGE_RELEASE ||--o{ CONVENTIONAL_COMMIT : "contains"
    PACKAGE_RELEASE ||--o{ DEPENDENCY_UPDATE : "contains"
    PACKAGE_RELEASE }o--|| NPM_PACKAGE : "references"
    PACKAGE_RELEASE }o--|| SEMVER_BUMP_TYPE : "uses"

    CHANGELOG_ENTRY ||--o{ CONVENTIONAL_COMMIT : "contains"
    CHANGELOG_ENTRY ||--o{ DEPENDENCY_UPDATE : "contains"

    CONVENTIONAL_COMMIT }o--|| COMMIT_TYPE : "uses"

    PACKAGE_RELEASE {
        string oldVersion
        string newVersion
        SemVerBumpType bumpType
    }

    NPM_PACKAGE {
        string name PK
        string path
        string version
        boolean private
        json dependencies
        json devDependencies
    }

    CONVENTIONAL_COMMIT {
        string hash PK
        CommitType type
        string scope
        string subject
        string body
        json footer
        boolean isBreaking
        string authorName
        string authorEmail
        datetime date
    }

    DEPENDENCY_UPDATE {
        string packageName
        string oldVersion
        string newVersion
    }

    CHANGELOG_ENTRY {
        string version
        string date
    }

    SEMVER_BUMP_TYPE {
        string value
    }

    COMMIT_TYPE {
        string value
    }
```

## Viewing These Diagrams

These Mermaid diagrams will render automatically on:

- **GitHub**: View this file directly in the repository
- **GitLab**: Native Mermaid support
- **VS Code**: Install "Markdown Preview Mermaid Support" extension
- **Online**: Use [Mermaid Live Editor](https://mermaid.live/)
- **Documentation sites**: Most static site generators (Docusaurus, MkDocs, etc.) support Mermaid

## Key Design Patterns

1. **Controller Pattern**: `ReleaseController` coordinates multiple services
2. **Static Utility Classes**: `CommitParser` and `SemverCalculator` provide stateless operations
3. **Value Objects**: Immutable objects like `DependencyUpdate` and `ChangelogEntry`
4. **Aggregate Pattern**: `PackageRelease` groups related entities and value objects
5. **Domain Services**: Services that contain domain logic but don't have state
