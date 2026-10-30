export const ALLOWED_UIDS = ['EJ9SoDzXCLgHBgXglBU703ZOcXH2', 'NJRJQyKj7JbSVBQeAYbKUOm8vcY2'] as const;
export const isAllowedUser = (uid: string) => ALLOWED_UIDS.some((allowed) => allowed === uid);
