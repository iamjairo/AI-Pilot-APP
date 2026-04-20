export type ExternalBackendState = 'disabled' | 'unpaired' | 'connecting' | 'connected';

export interface ExternalBackendStatus {
  enabled: boolean;
  isCompanion: boolean;
  hasToken: boolean;
  httpUrl: string | null;
  state: ExternalBackendState;
}

export interface ExternalBackendStatusInput {
  enabled: boolean;
  isCompanion: boolean;
  hasToken: boolean;
  httpUrl: string | null;
  authenticated: boolean;
}

export function deriveExternalBackendStatus(input: ExternalBackendStatusInput): ExternalBackendStatus {
  if (!input.enabled) {
    return {
      enabled: false,
      isCompanion: input.isCompanion,
      hasToken: false,
      httpUrl: null,
      state: 'disabled',
    };
  }

  if (!input.hasToken) {
    return {
      enabled: true,
      isCompanion: input.isCompanion,
      hasToken: false,
      httpUrl: input.httpUrl,
      state: 'unpaired',
    };
  }

  return {
    enabled: true,
    isCompanion: input.isCompanion,
    hasToken: true,
    httpUrl: input.httpUrl,
    state: input.authenticated ? 'connected' : 'connecting',
  };
}
