interface Participation {
  type: 'casting' | 'round';
  castingId?: string;
  roundId?: string;
  role: string;
  [key: string]: unknown;
}

interface RoleBadgeConfig {
  label: string;
  icon: string;
  className: string;
}

export const ROLE_CONFIG: Record<string, RoleBadgeConfig> = {
  director: {
    label: 'DIRECTOR',
    icon: '\u{1F464}',
    className: 'bg-[var(--color-blue,#3b82f6)]/10 text-[var(--color-blue,#3b82f6)] border-[var(--color-blue,#3b82f6)]/30',
  },
  actor: {
    label: 'ACTOR',
    icon: '\u{1F3AD}',
    className: 'bg-[var(--color-green,#22c55e)]/10 text-[var(--color-green,#22c55e)] border-[var(--color-green,#22c55e)]/30',
  },
  preselector: {
    label: 'PRESELECTOR',
    icon: '\u{1F441}\u{FE0F}',
    className: 'bg-[var(--color-amber,#f59e0b)]/10 text-[var(--color-amber,#f59e0b)] border-[var(--color-amber,#f59e0b)]/30',
  },
};

export function getRoleBadge(role: string): RoleBadgeConfig {
  return ROLE_CONFIG[role] || {
    label: role.toUpperCase(),
    icon: '\u{1F539}',
    className: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
  };
}

export function getRolesForCasting(participations: Participation[], castingId: string): string[] {
  const roles = new Set<string>();
  for (const p of participations) {
    if (p.type === 'casting' && p.castingId === castingId) {
      roles.add(p.role);
    }
    // if (p.type === 'round' && (p as Participation & { castingId?: string }).castingId === castingId) {
    if (p.type === 'round' && p.castingId === castingId) {
      roles.add(p.role);
    }
  }
  return Array.from(roles);
}

export function getRoleForRound(participations: Participation[], roundId: string): string | null {
  for (const p of participations) {
    if (p.type === 'round' && p.roundId === roundId) {
      return p.role;
    }
  }
  return null;
}
