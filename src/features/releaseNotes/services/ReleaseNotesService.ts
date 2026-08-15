import { SingleToken } from 'ts-ioc-container';

export interface ReleaseNotesCreateOptions {
  repository: string;
  token: string;
  tagName: string;
  title: string;
  notes: string;
  prerelease?: boolean;
}

export interface ReleaseNotesService {
  isCliAvailable(): boolean;
  createRelease(options: ReleaseNotesCreateOptions): void;
}

export const ReleaseNotesServiceKey = new SingleToken<ReleaseNotesService>('ReleaseNotesService');
