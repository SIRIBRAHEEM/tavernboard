import { describe, expect, it } from "vitest";
import {
  MAX_MESSAGE_LENGTH,
  computeStats,
  filterMessages,
  formatTime,
  makeLocalMessage,
  shortAddress,
  sortMessages,
  toggleLike,
  validateMessage,
} from "../messages.js";

const base = [
  { id: "a", author: "g1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", name: "Wren", text: "Lost a brass key", createdAt: "2026-11-26T08:00:00.000Z", likes: 5, source: "sample" },
  { id: "b", author: "g1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", name: "Borin", text: "Quiz night Thursday", createdAt: "2026-11-26T10:00:00.000Z", likes: 12, source: "sample" },
  { id: "c", author: "g1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", name: "Wren", text: "Found the key, thank you", createdAt: "2026-11-26T09:00:00.000Z", likes: 12, source: "sample" },
];

describe("validateMessage", () => {
  it("accepts a normal note", () => {
    const result = validateMessage("  Hello tavern  ", "Wren");
    expect(result.valid).toBe(true);
    expect(result.text).toBe("Hello tavern");
    expect(result.name).toBe("Wren");
  });

  it("rejects empty and whitespace only notes", () => {
    expect(validateMessage("").valid).toBe(false);
    expect(validateMessage("   \n\t ").valid).toBe(false);
    expect(validateMessage(null).valid).toBe(false);
  });

  it("rejects notes over the length limit and accepts exactly the limit", () => {
    expect(validateMessage("x".repeat(MAX_MESSAGE_LENGTH)).valid).toBe(true);
    const over = validateMessage("x".repeat(MAX_MESSAGE_LENGTH + 1));
    expect(over.valid).toBe(false);
    expect(over.errors.text).toContain(String(MAX_MESSAGE_LENGTH));
  });

  it("rejects overlong names but allows an empty name", () => {
    expect(validateMessage("hi", "n".repeat(41)).valid).toBe(false);
    expect(validateMessage("hi", "").valid).toBe(true);
    expect(validateMessage("hi").valid).toBe(true);
  });
});

describe("sortMessages", () => {
  it("sorts newest first by default", () => {
    expect(sortMessages(base).map((m) => m.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts most liked first with newest as tie break", () => {
    expect(sortMessages(base, "liked").map((m) => m.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input array", () => {
    const input = [...base];
    sortMessages(input, "liked");
    expect(input.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });
});

describe("filterMessages", () => {
  it("returns everything for an empty query", () => {
    expect(filterMessages(base, "")).toHaveLength(3);
    expect(filterMessages(base, "   ")).toHaveLength(3);
  });

  it("matches text, name and address case insensitively", () => {
    expect(filterMessages(base, "BRASS").map((m) => m.id)).toEqual(["a"]);
    expect(filterMessages(base, "borin").map((m) => m.id)).toEqual(["b"]);
    expect(filterMessages(base, "g1bbbb").map((m) => m.id)).toEqual(["b"]);
  });

  it("requires every word to match", () => {
    expect(filterMessages(base, "wren key").map((m) => m.id)).toEqual(["a", "c"]);
    expect(filterMessages(base, "wren quiz")).toHaveLength(0);
  });
});

describe("toggleLike", () => {
  it("adds a like once and removes it on the second toggle", () => {
    const first = toggleLike(base, new Set(), "a");
    expect(first.messages.find((m) => m.id === "a").likes).toBe(6);
    expect(first.likedIds.has("a")).toBe(true);

    const second = toggleLike(first.messages, first.likedIds, "a");
    expect(second.messages.find((m) => m.id === "a").likes).toBe(5);
    expect(second.likedIds.has("a")).toBe(false);
  });

  it("accepts an array of liked ids and never drops below zero", () => {
    const zero = [{ ...base[0], likes: 0 }];
    const result = toggleLike(zero, ["a"], "a");
    expect(result.messages[0].likes).toBe(0);
  });

  it("leaves other messages untouched", () => {
    const result = toggleLike(base, new Set(), "b");
    expect(result.messages.find((m) => m.id === "a").likes).toBe(5);
    expect(result.messages.find((m) => m.id === "b").likes).toBe(13);
  });
});

describe("computeStats", () => {
  it("counts messages, likes, authors and latest activity", () => {
    const stats = computeStats(base);
    expect(stats.totalMessages).toBe(3);
    expect(stats.totalLikes).toBe(29);
    expect(stats.uniqueAuthors).toBe(2);
    expect(stats.latestActivity).toBe("2026-11-26T10:00:00.000Z");
  });

  it("handles an empty board", () => {
    const stats = computeStats([]);
    expect(stats.totalMessages).toBe(0);
    expect(stats.totalLikes).toBe(0);
    expect(stats.latestActivity).toBeNull();
  });
});

describe("shortAddress and formatTime", () => {
  it("shortens long addresses and keeps short ones", () => {
    expect(shortAddress("g1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe("g1aaaaaa...aaaaa");
    expect(shortAddress("g1short")).toBe("g1short");
    expect(shortAddress("")).toBe("unknown");
    expect(shortAddress(null)).toBe("unknown");
  });

  it("formats relative times", () => {
    const now = new Date("2026-11-26T12:00:00.000Z");
    expect(formatTime("2026-11-26T11:59:30.000Z", now)).toBe("just now");
    expect(formatTime("2026-11-26T11:30:00.000Z", now)).toBe("30 min ago");
    expect(formatTime("2026-11-26T09:00:00.000Z", now)).toBe("3 hr ago");
    expect(formatTime("2026-11-25T12:00:00.000Z", now)).toBe("1 day ago");
    expect(formatTime("not a date", now)).toBe("some time ago");
  });
});

describe("makeLocalMessage", () => {
  it("creates a pending local demo post", () => {
    const msg = makeLocalMessage({
      text: "  Hello  ",
      name: "Wren",
      now: new Date("2026-11-26T12:00:00.000Z"),
      id: "local-test",
    });
    expect(msg.id).toBe("local-test");
    expect(msg.text).toBe("Hello");
    expect(msg.source).toBe("local");
    expect(msg.pending).toBe(true);
    expect(msg.likes).toBe(0);
    expect(msg.createdAt).toBe("2026-11-26T12:00:00.000Z");
  });
});
