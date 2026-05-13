export type SecurityPanel = 'reset-password' | 'google-only';

export type SecurityCardState = {
  panel: SecurityPanel;
  providerLabel: string;
  email: string;
};

type Input = {
  providers: string[];
  email: string;
};

export function getSecurityCardState({ providers, email }: Input): SecurityCardState {
  const hasPassword = providers.includes('password');
  const hasGoogle = providers.includes('google.com');

  let providerLabel: string;
  if (hasPassword && hasGoogle) {
    providerLabel = 'Email & password · Google';
  } else if (hasPassword) {
    providerLabel = 'Email & password';
  } else {
    providerLabel = 'Google';
  }

  const panel: SecurityPanel = hasPassword ? 'reset-password' : 'google-only';

  return { panel, providerLabel, email };
}
