export interface TemplateOverrides {
  changelogTemplate?: string;
  releaseCommitTemplate?: string;
}

export interface CliOptions extends TemplateOverrides {
  help: boolean;
  dryRun: boolean;
  noPush: boolean;
  noPublish: boolean;
}
