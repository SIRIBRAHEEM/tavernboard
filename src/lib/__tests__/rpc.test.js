import { describe, expect, it } from "vitest";
import {
  base64ToUtf8,
  loadChainMessages,
  parseAbciResponse,
  parseRenderText,
  utf8ToHex,
} from "../rpc.js";
import { CONFIG } from "../../config.js";

const ADDR_A = "g1tavernkeeper00000000000000000000000001";
const ADDR_B = "g1lanternlight00000000000000000000000002";

const MARKDOWN_FIXTURE = [
  "# TavernBoard",
  "",
  "Notes pinned by the tavern.",
  "",
  `- ${ADDR_A}: Innkeeper: Welcome to the board, mind the low beam (24 cheers) 2026-11-26T08:00:00Z`,
  `- ${ADDR_B}: Wren: Lost a brass key near the well (11 likes) 2026-11-26T10:30:00Z`,
  `- ${ADDR_B}: Found it again, thank you all`,
  "",
  "End of board.",
].join("\n");

const TABLE_FIXTURE = [
  "| Author | Note | Cheers | Time |",
  "| --- | --- | --- | --- |",
  `| ${ADDR_A} | Quiz night moves to Thursdays | 18 | 2026-11-25T19:00:00Z |`,
  `| ${ADDR_B} | Herb garden is open to everyone | 31 | 2026-11-24T07:15:00Z |`,
].join("\n");

// Real Render output from the local gnodev proof (realm/local-proof.log):
// 3 posts, message 0 cheered once, newest first, authors shortened by
// the realm to g1q5ra30...89rl.
const REALM_FIXTURE = [
  "# TavernBoard",
  "",
  "A community message board on Gno.land. Post a message, cheer the ones you like.",
  "",
  "Total messages: 3",
  "",
  "---",
  "",
  "## Message #2",
  "",
  "- Author: `g1q5ra30...89rl`",
  "- Block: 7",
  "- Cheers: 0",
  "",
  "Third round is on the board. Pull up a stool and say hello",
  "",
  "---",
  "",
  "## Message #1",
  "",
  "- Author: `g1q5ra30...89rl`",
  "- Block: 5",
  "- Cheers: 0",
  "",
  "Built with Gno realms: post a message, cheer the ones you like",
  "",
  "---",
  "",
  "## Message #0",
  "",
  "- Author: `g1q5ra30...89rl`",
  "- Block: 3",
  "- Cheers: 1",
  "",
  "Welcome to TavernBoard, our community board for the Gnome Tavern Hackathon",
].join("\n");

const REALM_SINGLE_FIXTURE = [
  "# TavernBoard",
  "",
  "## Message #0",
  "",
  "- Author: `g1q5ra30...89rl`",
  "- Block: 3",
  "- Cheers: 1",
  "",
  "Welcome to TavernBoard, our community board for the Gnome Tavern Hackathon",
].join("\n");

const JSON_FIXTURE = [
  "# TavernBoard",
  "```json",
  JSON.stringify([
    { id: "7", author: ADDR_A, name: "Innkeeper", text: "First JSON note", likes: 3, createdAt: "2026-11-26T06:00:00Z" },
    { author: ADDR_B, message: "Second JSON note", cheers: 9, timestamp: 1795680000 },
  ]),
  "```",
].join("\n");

function abciFixture(renderText) {
  return {
    jsonrpc: "2.0",
    id: 1,
    result: {
      response: {
        code: 0,
        log: "",
        value: Buffer.from(renderText, "utf-8").toString("base64"),
      },
    },
  };
}

describe("encoding helpers", () => {
  it("hex encodes utf8 text", () => {
    expect(utf8ToHex("gno.land/r/tavernboard:")).toBe(
      Buffer.from("gno.land/r/tavernboard:", "utf-8").toString("hex"),
    );
  });

  it("round trips base64 utf8 including unicode", () => {
    const text = "Tavern notes: cafe, naive, 42";
    expect(base64ToUtf8(Buffer.from(text, "utf-8").toString("base64"))).toBe(text);
  });
});

describe("parseAbciResponse", () => {
  it("decodes the render value from a successful response", () => {
    expect(parseAbciResponse(abciFixture(MARKDOWN_FIXTURE))).toBe(MARKDOWN_FIXTURE);
  });

  it("throws on rpc errors and realm errors", () => {
    expect(() => parseAbciResponse({ error: { message: "boom" } })).toThrow("boom");
    expect(() =>
      parseAbciResponse({ result: { response: { code: 5, log: "realm not found", value: "" } } }),
    ).toThrow("realm not found");
    expect(() => parseAbciResponse(null)).toThrow();
    expect(() => parseAbciResponse({ result: { response: { code: 0, value: "" } } })).toThrow();
  });
});

describe("parseRenderText", () => {
  it("parses markdown list notes with names, cheers and times", () => {
    const messages = parseRenderText(MARKDOWN_FIXTURE);
    expect(messages).toHaveLength(3);
    expect(messages[0].author).toBe(ADDR_A);
    expect(messages[0].name).toBe("Innkeeper");
    expect(messages[0].text).toBe("Welcome to the board, mind the low beam");
    expect(messages[0].likes).toBe(24);
    expect(messages[0].createdAt).toBe("2026-11-26T08:00:00.000Z");
    expect(messages[0].source).toBe("chain");
    expect(messages[1].likes).toBe(11);
    expect(messages[2].text).toBe("Found it again, thank you all");
    expect(messages[2].likes).toBe(0);
  });

  it("parses markdown table notes", () => {
    const messages = parseRenderText(TABLE_FIXTURE);
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe("Quiz night moves to Thursdays");
    expect(messages[0].likes).toBe(18);
    expect(messages[1].author).toBe(ADDR_B);
    expect(messages[1].likes).toBe(31);
  });

  it("parses embedded JSON notes with alternate field names", () => {
    const messages = parseRenderText(JSON_FIXTURE);
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe("7");
    expect(messages[0].text).toBe("First JSON note");
    expect(messages[1].text).toBe("Second JSON note");
    expect(messages[1].likes).toBe(9);
    expect(messages[1].createdAt).toBe(new Date(1795680000 * 1000).toISOString());
  });

  it("parses the real realm Render sections (local proof fixture)", () => {
    const messages = parseRenderText(REALM_FIXTURE);
    expect(messages).toHaveLength(3);
    // Newest first, stable realm ids.
    expect(messages.map((m) => m.id)).toEqual(["chain-2", "chain-1", "chain-0"]);
    expect(messages[0].text).toBe("Third round is on the board. Pull up a stool and say hello");
    expect(messages[0].author).toBe("g1q5ra30...89rl");
    expect(messages[0].likes).toBe(0);
    expect(messages[0].block).toBe(7);
    expect(messages[0].source).toBe("chain");
    expect(messages[2].text).toBe(
      "Welcome to TavernBoard, our community board for the Gnome Tavern Hackathon",
    );
    expect(messages[2].likes).toBe(1);
    expect(messages[2].block).toBe(3);
  });

  it("parses a single-message realm Render page", () => {
    const messages = parseRenderText(REALM_SINGLE_FIXTURE);
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe("chain-0");
    expect(messages[0].likes).toBe(1);
  });

  it("returns an empty array for the empty-board realm Render", () => {
    const empty = "# TavernBoard\n\nTotal messages: 0\n\nNo messages yet. Be the first to post.\n";
    expect(parseRenderText(empty)).toEqual([]);
  });

  it("returns an empty array for unrecognisable or empty input", () => {
    expect(parseRenderText("")).toEqual([]);
    expect(parseRenderText("Just a heading\n\nNo notes here.")).toEqual([]);
    expect(parseRenderText(null)).toEqual([]);
  });
});

describe("loadChainMessages", () => {
  it("reads messages over RPC when the realm answers", async () => {
    const fetchImpl = async (url, options) => {
      expect(url).toBe(CONFIG.RPC_ENDPOINT);
      const body = JSON.parse(options.body);
      expect(body.method).toBe("abci_query");
      expect(body.params.path).toBe("vm/qrender");
      expect(body.params.data).toBe(utf8ToHex(`${CONFIG.REALM_PATH}:`));
      return { ok: true, status: 200, json: async () => abciFixture(MARKDOWN_FIXTURE) };
    };
    const result = await loadChainMessages(CONFIG, fetchImpl);
    expect(result.via).toBe("rpc");
    expect(result.messages).toHaveLength(3);
  });

  it("falls back to gnoweb when RPC fails", async () => {
    const fetchImpl = async (url) => {
      if (url === CONFIG.RPC_ENDPOINT) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        text: async () => `<html><body><p>- ${ADDR_A}: Hello from gnoweb (2 cheers)</p></body></html>`,
      };
    };
    const result = await loadChainMessages(CONFIG, fetchImpl);
    expect(result.via).toBe("gnoweb");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toBe("Hello from gnoweb");
  });

  it("returns null when both read paths fail", async () => {
    const fetchImpl = async () => {
      throw new Error("network down");
    };
    await expect(loadChainMessages(CONFIG, fetchImpl)).resolves.toBeNull();
  });

  it("returns null when the realm renders no recognisable notes", async () => {
    const fetchImpl = async (url) => {
      if (url === CONFIG.RPC_ENDPOINT) {
        return { ok: true, status: 200, json: async () => abciFixture("# Empty board") };
      }
      return { ok: true, status: 200, text: async () => "<html><body>Nothing</body></html>" };
    };
    await expect(loadChainMessages(CONFIG, fetchImpl)).resolves.toBeNull();
  });
});
