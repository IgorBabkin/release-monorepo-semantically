# UML Models for Release Domain

This directory contains UML diagrams documenting the Object-Oriented design of the release task domain.

## Quick Start

**📊 View the diagrams**: Open [`uml-diagrams.md`](uml-diagrams.md) - it contains all diagrams in Mermaid format that render directly on GitHub/GitLab!

**👁️ Visualize in Cursor**: See [`CURSOR-VISUALIZATION.md`](CURSOR-VISUALIZATION.md) for step-by-step instructions on installing extensions and viewing diagrams in Cursor IDE.

**🔧 PlantUML versions**: The original PlantUML files (`.puml`) are also available for use with PlantUML tools.

## Diagrams Overview

### 1. `uml-release-domain.puml` - Complete Domain Model
This diagram shows the complete class structure of the release domain, including:
- **ReleaseController**: Main controller class that coordinates the release workflow
- **CommitParser**: Static utility class for parsing conventional commits
- **SemverCalculator**: Static utility class for semantic version calculations
- **Domain Entities**: NpmPackage, ConventionalCommit, PackageRelease, DependencyUpdate, ChangelogEntry
- **Enumerations**: SemVerBumpType, CommitType
- **Relationships**: Shows how classes interact and depend on each other

### 2. `uml-release-sequence.puml` - Release Workflow Sequence
This sequence diagram illustrates the complete release workflow:
1. Package discovery phase
2. Dependency graph building
3. Topological sorting
4. Package processing (commit analysis, version calculation)
5. Package release (updates, changelog, tagging)
6. Finalization (lockfile, commit, push)

### 3. `uml-domain-entities.puml` - Core Domain Entities
This diagram focuses on the core domain entities using DDD (Domain-Driven Design) concepts:
- **PackageRelease**: Aggregate root containing all release information
- **NpmPackage**: Entity representing a package in the monorepo
- **ConventionalCommit**: Entity representing a parsed commit
- **DependencyUpdate**: Value object for dependency changes
- **ChangelogEntry**: Value object for changelog entries

### 4. `uml-service-layer.puml` - Service Layer Architecture
This diagram shows the service layer architecture:
- **ReleaseController**: Main controller coordinating the workflow
- **CommitParser**: Domain service for commit parsing
- **SemverCalculator**: Domain service for version calculations
- Service dependencies and relationships

## Viewing the Diagrams

### Mermaid Format (Recommended)

The diagrams are available in **Mermaid format** in [`uml-diagrams.md`](uml-diagrams.md), which renders directly on:
- **GitHub**: View the file directly in the repository
- **GitLab**: Native Mermaid support
- **VS Code**: Install "Markdown Preview Mermaid Support" extension
- **Online**: Use [Mermaid Live Editor](https://mermaid.live/)

### PlantUML Format

The original PlantUML files (`.puml`) are also available. To view them:

1. **VS Code**: Install the "PlantUML" extension
2. **Online**: Use [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
3. **CLI**: Install PlantUML and render with:
   ```bash
   plantuml -tpng uml-*.puml
   ```

## Domain Concepts

### Aggregate Root
- **PackageRelease**: The main aggregate that encapsulates all information needed to release a package, including the package itself, commits, dependency updates, and version information.

### Domain Services
- **CommitParser**: Handles parsing and validation of conventional commits
- **SemverCalculator**: Implements semantic versioning logic and bump calculations

### Value Objects
- **DependencyUpdate**: Immutable representation of a dependency version change
- **ChangelogEntry**: Structured representation of changelog content

### Entities
- **NpmPackage**: Represents a package with identity (name)
- **ConventionalCommit**: Represents a commit with identity (hash)

## Key Design Patterns

1. **Controller Pattern**: ReleaseController coordinates multiple services
2. **Static Utility Classes**: CommitParser and SemverCalculator provide stateless operations
3. **Value Objects**: Immutable objects representing concepts without identity
4. **Aggregate Pattern**: PackageRelease groups related entities and value objects
