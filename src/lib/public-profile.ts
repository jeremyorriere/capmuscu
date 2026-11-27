export const PROFILE_COLORS = ['#1d4ed8', '#047857', '#b45309', '#7e22ce', '#be123c', '#0e7490'] as const;
export const PUBLIC_NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 _-]{3,24}$/;

export interface PublicProfile {
  displayName: string;
  avatarColor: (typeof PROFILE_COLORS)[number];
  updatedAt?: unknown;
}

export function isPublicProfile(value: unknown): value is PublicProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const profile = value as Partial<PublicProfile>;
  const keys = Object.keys(value);
  return keys.every((key) => ['displayName', 'avatarColor', 'updatedAt'].includes(key))
    && typeof profile.displayName === 'string'
    && profile.displayName.trim() === profile.displayName
    && PUBLIC_NAME_PATTERN.test(profile.displayName)
    && PROFILE_COLORS.includes(profile.avatarColor as (typeof PROFILE_COLORS)[number]);
}

export function profileInitials(displayName: string): string {
  return displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('');
}
