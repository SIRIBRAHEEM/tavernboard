// localStorage persistence for demo posts and visitor likes.
// Every read is guarded: corrupt or unavailable storage returns safe defaults.

export const LOCAL_POSTS_KEY = "tavernboard.localPosts.v1";
export const LIKES_KEY = "tavernboard.likes.v1";
export const VISITOR_NAME_KEY = "tavernboard.visitorName.v1";

function getStore(store) {
  if (store) return store;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function loadLocalPosts(store) {
  const s = getStore(store);
  if (!s) return [];
  try {
    const raw = s.getItem(LOCAL_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m) => m && typeof m.text === "string" && typeof m.id === "string");
  } catch {
    return [];
  }
}

export function saveLocalPosts(posts, store) {
  const s = getStore(store);
  if (!s) return false;
  try {
    s.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
    return true;
  } catch {
    return false;
  }
}

export function loadLikedIds(store) {
  const s = getStore(store);
  if (!s) return new Set();
  try {
    const raw = s.getItem(LIKES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function saveLikedIds(likedIds, store) {
  const s = getStore(store);
  if (!s) return false;
  try {
    s.setItem(LIKES_KEY, JSON.stringify([...likedIds]));
    return true;
  } catch {
    return false;
  }
}

// Overlay visitor likes onto base counts for display.
// A liked message shows base + 1 unless the stored count already includes it.
// Local posts keep their own stored counts, so they are passed through.
export function applyLikeOverlay(messages, likedIds) {
  return messages.map((m) => {
    if (m.source === "local") return m;
    return likedIds.has(m.id) ? { ...m, likes: (m.likes || 0) + 1, likedByVisitor: true } : { ...m, likedByVisitor: false };
  });
}
