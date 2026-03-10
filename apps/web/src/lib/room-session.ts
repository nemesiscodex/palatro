const KEY_PREFIX = "pointing-poker:guest-token:";
const GUEST_OWNER_KEY = "pointing-poker:guest-owner-token";

export function getGuestTokenStorageKey(slug: string) {
  return `${KEY_PREFIX}${slug}`;
}

export function readGuestToken(slug: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(getGuestTokenStorageKey(slug));
}

export function writeGuestToken(slug: string, token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getGuestTokenStorageKey(slug), token);
}

export function clearGuestToken(slug: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getGuestTokenStorageKey(slug));
}

export function readGuestOwnerToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(GUEST_OWNER_KEY);
}

export function writeGuestOwnerToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GUEST_OWNER_KEY, token);
}

export function ensureGuestOwnerToken() {
  const existingToken = readGuestOwnerToken();
  if (existingToken) {
    return existingToken;
  }

  const nextToken = crypto.randomUUID();
  writeGuestOwnerToken(nextToken);
  return nextToken;
}
