import { describe, expect, it } from "vitest";
import {
  applyLikeOverlay,
  loadLikedIds,
  loadLocalPosts,
  saveLikedIds,
  saveLocalPosts,
} from "../storage.js";

function fakeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    _data: data,
  };
}

describe("local posts persistence", () => {
  it("round trips posts through storage", () => {
    const store = fakeStore();
    const posts = [{ id: "local-1", text: "Hello", author: "g1x", likes: 2, source: "local" }];
    expect(saveLocalPosts(posts, store)).toBe(true);
    expect(loadLocalPosts(store)).toEqual(posts);
  });

  it("returns an empty list for missing or corrupt data", () => {
    expect(loadLocalPosts(fakeStore())).toEqual([]);
    expect(loadLocalPosts(fakeStore({ "tavernboard.localPosts.v1": "not json" }))).toEqual([]);
    expect(loadLocalPosts(fakeStore({ "tavernboard.localPosts.v1": '{"a":1}' }))).toEqual([]);
    expect(
      loadLocalPosts(fakeStore({ "tavernboard.localPosts.v1": '[{"id":1},{"id":"ok","text":"hi"}]' })),
    ).toEqual([{ id: "ok", text: "hi" }]);
  });
});

describe("liked ids persistence", () => {
  it("round trips liked ids as a set", () => {
    const store = fakeStore();
    expect(saveLikedIds(new Set(["a", "b"]), store)).toBe(true);
    expect(loadLikedIds(store)).toEqual(new Set(["a", "b"]));
  });

  it("returns an empty set for missing or corrupt data", () => {
    expect(loadLikedIds(fakeStore())).toEqual(new Set());
    expect(loadLikedIds(fakeStore({ "tavernboard.likes.v1": "oops" }))).toEqual(new Set());
  });
});

describe("applyLikeOverlay", () => {
  const messages = [
    { id: "chain-1", text: "On chain", likes: 10, source: "chain" },
    { id: "local-1", text: "Demo", likes: 2, source: "local" },
    { id: "sample-1", text: "Sample", likes: 4, source: "sample" },
  ];

  it("adds one to liked chain and sample notes and flags them", () => {
    const out = applyLikeOverlay(messages, new Set(["chain-1", "sample-1"]));
    expect(out[0].likes).toBe(11);
    expect(out[0].likedByVisitor).toBe(true);
    expect(out[2].likes).toBe(5);
    expect(out[2].likedByVisitor).toBe(true);
  });

  it("leaves local posts and unliked notes unchanged", () => {
    const out = applyLikeOverlay(messages, new Set(["local-1"]));
    expect(out[1].likes).toBe(2);
    expect(out[0].likes).toBe(10);
    expect(out[0].likedByVisitor).toBe(false);
  });
});
