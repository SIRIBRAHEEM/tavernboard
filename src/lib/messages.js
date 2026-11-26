// Pure board logic: validation, sorting, filtering, likes, stats, formatting.
// A message is: { id, author, name, text, createdAt, likes, source, pending }
// source is one of "chain", "sample", "local". pending marks local demo posts
// that have not been written on chain.

export const MAX_MESSAGE_LENGTH = 280;
export const MAX_NAME_LENGTH = 40;

export function validateMessage(text, name = "") {
  const errors = {};
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    errors.text = "Write something first. Empty notes do not pin well.";
  } else if (trimmed.length > MAX_MESSAGE_LENGTH) {
    errors.text = `Keep it to ${MAX_MESSAGE_LENGTH} characters or fewer. This note is ${trimmed.length}.`;
  }
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (trimmedName.length > MAX_NAME_LENGTH) {
    errors.name = `Names can be ${MAX_NAME_LENGTH} characters at most.`;
  }
  return { valid: Object.keys(errors).length === 0, errors, text: trimmed, name: trimmedName };
}

export function sortMessages(messages, mode = "newest") {
  const copy = [...messages];
  if (mode === "liked") {
    copy.sort((a, b) => {
      if (b.likes !== a.likes) return b.likes - a.likes;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return copy;
  }
  // newest first, stable tie break on id so order never flickers
  copy.sort((a, b) => {
    const diff = new Date(b.createdAt) - new Date(a.createdAt);
    if (diff !== 0) return diff;
    return String(b.id).localeCompare(String(a.id));
  });
  return copy;
}

export function filterMessages(messages, query = "") {
  const q = query.trim().toLowerCase();
  if (!q) return [...messages];
  return messages.filter((m) => {
    const haystack = [m.text, m.name || "", m.author || ""].join(" ").toLowerCase();
    return q.split(/\s+/).every((word) => haystack.includes(word));
  });
}

// Toggle one visitor like. likedIds is a Set or array of message ids.
// Returns { messages, likedIds } as new objects. Counts never drop below zero.
export function toggleLike(messages, likedIds, messageId) {
  const liked = new Set(likedIds);
  const alreadyLiked = liked.has(messageId);
  if (alreadyLiked) {
    liked.delete(messageId);
  } else {
    liked.add(messageId);
  }
  const delta = alreadyLiked ? -1 : 1;
  const next = messages.map((m) =>
    m.id === messageId ? { ...m, likes: Math.max(0, (m.likes || 0) + delta) } : m,
  );
  return { messages: next, likedIds: liked };
}

export function computeStats(messages) {
  const totalMessages = messages.length;
  const totalLikes = messages.reduce((sum, m) => sum + (m.likes || 0), 0);
  let latestActivity = null;
  for (const m of messages) {
    const t = new Date(m.createdAt).getTime();
    if (!Number.isNaN(t) && (latestActivity === null || t > latestActivity)) {
      latestActivity = t;
    }
  }
  const authors = new Set(messages.map((m) => m.author).filter(Boolean));
  return {
    totalMessages,
    totalLikes,
    uniqueAuthors: authors.size,
    latestActivity: latestActivity === null ? null : new Date(latestActivity).toISOString(),
  };
}

export function shortAddress(address) {
  if (!address || typeof address !== "string") return "unknown";
  const a = address.trim();
  // Realm Render output already shortens authors (for example
  // g1q5ra30...89rl). Leave those as they are.
  if (a.includes("...")) return a;
  if (a.length <= 14) return a;
  return `${a.slice(0, 8)}...${a.slice(-5)}`;
}

export function formatTime(iso, now = new Date()) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "some time ago";
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function makeLocalMessage({ text, name, author, now = new Date(), id }) {
  return {
    id: id || `local-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    author: author || "g1localdemo0000000000000000000000000000",
    name: name || "",
    text: text.trim(),
    createdAt: now.toISOString(),
    likes: 0,
    source: "local",
    pending: true,
  };
}
