const KEY_PREFIX = "pointing-poker:guest-token:";

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
