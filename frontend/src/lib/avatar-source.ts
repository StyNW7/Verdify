type AuthUser = {
  photoURL: string | null;
  displayName: string | null;
};

type UserDoc = {
  presetAvatar?: string;
};

export type AvatarSource =
  | { kind: 'photo'; value: string }
  | { kind: 'preset'; value: string }
  | { kind: 'initials'; value: string };

export function pickAvatar(
  authUser: AuthUser | null,
  userDoc: UserDoc | null,
): AvatarSource {
  if (authUser?.photoURL) {
    return { kind: 'photo', value: authUser.photoURL };
  }
  if (userDoc?.presetAvatar) {
    return { kind: 'preset', value: userDoc.presetAvatar };
  }
  const displayName = authUser?.displayName ?? '';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
  return { kind: 'initials', value: initials || 'VD' };
}
