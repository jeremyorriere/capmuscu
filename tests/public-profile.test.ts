import { describe, expect, it } from 'vitest';
import { isPublicProfile, profileInitials, PROFILE_COLORS } from '../src/lib/public-profile';

describe('profil public', () => {
  it('accepte uniquement un pseudo simple et une couleur autorisée', () => {
    expect(isPublicProfile({ displayName: 'Alex 42', avatarColor: PROFILE_COLORS[0] })).toBe(true);
    expect(isPublicProfile({ displayName: 'Élodie', avatarColor: PROFILE_COLORS[0] })).toBe(true);
    expect(isPublicProfile({ displayName: 'Alex@email.test', avatarColor: PROFILE_COLORS[0] })).toBe(false);
    expect(isPublicProfile({ displayName: 'AB', avatarColor: PROFILE_COLORS[0] })).toBe(false);
    expect(isPublicProfile({ displayName: 'Alex', avatarColor: '#ffffff' })).toBe(false);
    expect(isPublicProfile({ displayName: 'Alex', avatarColor: PROFILE_COLORS[0], email: 'alex@example.test' })).toBe(false);
  });

  it('crée des initiales lisibles à partir du pseudo', () => {
    expect(profileInitials('Élodie Martin')).toBe('ÉM');
    expect(profileInitials('capmuscu')).toBe('C');
  });
});
