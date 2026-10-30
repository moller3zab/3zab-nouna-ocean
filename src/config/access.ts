export const ALLOWED_UIDS = ['EJ9SoDzXCLgHBgXglBU703ZOcXH2', 'NJRJQyKj7JbSVBQeAYbKUOm8vcY2'] as const;
export const isAllowedUser = (uid: string) => ALLOWED_UIDS.some((allowed) => allowed === uid);

// Matched against the existing Firebase Auth accounts during the free-push audit.
export const MEMBER_IDENTITIES: Record<string, '3zab' | 'Nouna'> = { EJ9SoDzXCLgHBgXglBU703ZOcXH2: 'Nouna', NJRJQyKj7JbSVBQeAYbKUOm8vcY2: '3zab' };
