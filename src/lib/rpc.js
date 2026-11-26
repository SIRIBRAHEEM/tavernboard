// Reading board state from the Gno realm.
// Primary path: JSON-RPC abci_query vm/qrender against the testnet RPC.
// Fallback path: fetch the gnoweb page for the realm and parse its text.
// Both feed the same tolerant parser, which accepts embedded JSON or
// markdown list and table layouts. Any failure returns null so the UI
// can fall back to sample data instead of showing a broken board.

import { CONFIG, realmWebUrl } from "../config.js";

const ADDRESS_RE = /g1[0-9a-z]{20,}/;

export function utf8ToHex(str) {
  const bytes = new TextEncoder().encode(str);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function base64ToUtf8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

// Extract the decoded Render string from an abci_query JSON-RPC response.
// Throws with a readable reason when the node reports an error.
export function parseAbciResponse(json) {
  if (!json || typeof json !== "object") {
    throw new Error("Empty RPC response");
  }
  if (json.error) {
    throw new Error(`RPC error: ${json.error.message || json.error.code || "unknown"}`);
  }
  const response = json.result && json.result.response;
  if (!response) {
    throw new Error("RPC response has no result");
  }
  if (response.code && response.code !== 0) {
    throw new Error(response.log || `Realm query failed with code ${response.code}`);
  }
  if (!response.value) {
    throw new Error("Realm returned no data");
  }
  return base64ToUtf8(response.value);
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function toIsoTime(value, fallbackIndex) {
  if (value === undefined || value === null || value === "") {
    return new Date(Date.now() - fallbackIndex * 60 * 60 * 1000).toISOString();
  }
  if (typeof value === "number") {
    // Accept unix seconds or milliseconds.
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return new Date(Date.now() - fallbackIndex * 60 * 60 * 1000).toISOString();
}

function normalizeMessage(raw, index) {
  const text = String(raw.text || raw.message || raw.body || raw.content || "").trim();
  if (!text) return null;
  const author = String(raw.author || raw.address || raw.from || raw.sender || "unknown").trim();
  const likesRaw = raw.likes ?? raw.cheers ?? raw.likeCount ?? raw.cheerCount ?? 0;
  const likes = Number.parseInt(likesRaw, 10);
  return {
    id: raw.id ? String(raw.id) : `chain-${index}-${simpleHash(author + text)}`,
    author,
    name: raw.name ? String(raw.name).trim() : "",
    text: text.slice(0, 2000),
    createdAt: toIsoTime(raw.createdAt || raw.time || raw.timestamp || raw.date, index),
    likes: Number.isNaN(likes) || likes < 0 ? 0 : likes,
    source: "chain",
    pending: false,
  };
}

function tryParseJsonMessages(text) {
  const candidates = [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidates.push(fenced[1]);
  const bracketStart = text.indexOf("[");
  const bracketEnd = text.lastIndexOf("]");
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    candidates.push(text.slice(bracketStart, bracketEnd + 1));
  }
  candidates.push(text);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const list = Array.isArray(parsed) ? parsed : parsed.messages || parsed.posts || parsed.notes;
      if (Array.isArray(list)) {
        const messages = list.map((item, i) => normalizeMessage(item, i)).filter(Boolean);
        if (messages.length > 0) return messages;
      }
    } catch {
      // Not JSON. Try the next candidate.
    }
  }
  return null;
}

function parseLikesSuffix(line) {
  const match = line.match(/\(\s*(\d+)\s*(?:likes?|cheers?)\s*\)/i);
  if (!match) return { likes: 0, rest: line };
  return { likes: Number.parseInt(match[1], 10), rest: line.replace(match[0], "").trim() };
}

function parseMarkdownMessages(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Table row: | author | text | likes | time |
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.split("|").map((c) => c.trim()).filter((c, i, arr) => !(i === 0 || i === arr.length - 1) || c !== "");
      const joined = cells.join(" ");
      if (/^-+$/.test(cells[0] || "") || /author/i.test(cells[0] || "")) continue;
      if (cells.length >= 2 && ADDRESS_RE.test(joined)) {
        const authorCell = cells.find((c) => ADDRESS_RE.test(c)) || "";
        const author = (authorCell.match(ADDRESS_RE) || ["unknown"])[0];
        const textCell = cells.find((c) => c !== authorCell && !/^\d+$/.test(c) && c.length > 3) || "";
        const likesCell = cells.find((c) => /^\d+$/.test(c));
        const timeCell = cells.find((c) => /\d{4}-\d{2}-\d{2}/.test(c));
        const msg = normalizeMessage(
          { author, text: textCell, likes: likesCell || 0, createdAt: timeCell },
          messages.length,
        );
        if (msg) messages.push(msg);
      }
      continue;
    }
    // List item or plain line carrying an address and a message.
    const body = line.replace(/^[-*]\s+/, "").replace(/^>\s+/, "");
    const addrMatch = body.match(ADDRESS_RE);
    if (!addrMatch) continue;
    const { likes, rest } = parseLikesSuffix(body);
    const timeMatch = rest.match(/\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?/);
    let messageText = rest
      .replace(addrMatch[0], "")
      .replace(timeMatch ? timeMatch[0] : "", "")
      .replace(/\*\*/g, "")
      .replace(/^[\s:;|()[\]-]+/, "")
      .replace(/[\s:;|()[\]-]+$/, "")
      .trim();
    // Drop a leading display name separated by a colon, keep the note itself.
    const colonSplit = messageText.match(/^([^:]{1,40}):\s+(.+)$/);
    let name = "";
    if (colonSplit && !/^https?$/.test(colonSplit[1].trim())) {
      name = colonSplit[1].trim();
      messageText = colonSplit[2].trim();
    }
    if (messageText.length < 2) continue;
    const msg = normalizeMessage(
      { author: addrMatch[0], name, text: messageText, likes, createdAt: timeMatch ? timeMatch[0] : undefined },
      messages.length,
    );
    if (msg) messages.push(msg);
  }
  return messages;
}

// Parse the TavernBoard realm Render format (see realm/tavernboard.gno
// renderEntry): one section per message, newest first.
//
//   ## Message #2
//
//   - Author: `g1q5ra30...89rl`
//   - Block: 7
//   - Cheers: 0
//
//   Third round is on the board. Pull up a stool and say hello
//
// The realm shortens author addresses for display, so the author here
// can be the short form. Full addresses stay available on chain through
// GetMessage. The same shape survives the gnoweb HTML to text step,
// where headings and backticks may be gone, so matching stays tolerant.
function parseRealmSections(text) {
  const headingRe = /^#{0,3}\s*Message\s*#(\d+)\s*$/gim;
  const headings = [...text.matchAll(headingRe)];
  if (headings.length === 0) return [];
  const messages = [];
  for (let h = 0; h < headings.length; h += 1) {
    const match = headings[h];
    const id = match[1];
    const start = match.index + match[0].length;
    const end = h + 1 < headings.length ? headings[h + 1].index : text.length;
    const section = text.slice(start, end);
    const authorMatch = section.match(/Author:\s*`?(g1[0-9a-z]+(?:\.\.\.[0-9a-z]+)?)`?/i);
    const cheersMatch = section.match(/Cheers:\s*(\d+)/i);
    const blockMatch = section.match(/Block:\s*(\d+)/i);
    const textLines = [];
    for (const rawLine of section.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line === "---") continue;
      if (/^-\s*(Author|Block|Cheers):/i.test(line)) continue;
      if (/^Showing the newest\b/i.test(line)) continue;
      textLines.push(line);
    }
    const bodyText = textLines.join(" ").trim();
    if (!bodyText) continue;
    const msg = normalizeMessage(
      {
        id: `chain-${id}`,
        author: authorMatch ? authorMatch[1] : "unknown",
        text: bodyText,
        likes: cheersMatch ? cheersMatch[1] : 0,
      },
      messages.length,
    );
    if (msg) {
      if (blockMatch) msg.block = Number.parseInt(blockMatch[1], 10);
      messages.push(msg);
    }
  }
  return messages;
}

// Parse realm Render output (or gnoweb page text) into board messages.
// Returns an empty array when nothing recognisable is found.
export function parseRenderText(text) {
  if (!text || typeof text !== "string") return [];
  const jsonMessages = tryParseJsonMessages(text);
  if (jsonMessages && jsonMessages.length > 0) return jsonMessages;
  const realmMessages = parseRealmSections(text);
  if (realmMessages.length > 0) return realmMessages;
  return parseMarkdownMessages(text);
}

async function fetchWithTimeout(url, options, timeoutMs, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Query the realm Render output through the testnet RPC.
export async function fetchRealmRender(config = CONFIG, fetchImpl = fetch) {
  const data = `${config.REALM_PATH}:${config.RENDER_PATH || ""}`;
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "abci_query",
    params: {
      path: "vm/qrender",
      data: utf8ToHex(data),
      prove: false,
    },
  };
  const res = await fetchWithTimeout(
    config.RPC_ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    config.READ_TIMEOUT_MS,
    fetchImpl,
  );
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json();
  return parseAbciResponse(json);
}

// Fetch the gnoweb page for the realm and return its plain text.
export async function fetchGnowebText(config = CONFIG, fetchImpl = fetch) {
  const url = realmWebUrl(config);
  const res = await fetchWithTimeout(url, { method: "GET" }, config.READ_TIMEOUT_MS, fetchImpl);
  if (!res.ok) throw new Error(`gnoweb HTTP ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Try the chain, then gnoweb. Returns { messages, source } or null.
// source is "chain" when either read path produced messages.
export async function loadChainMessages(config = CONFIG, fetchImpl = fetch) {
  try {
    const render = await fetchRealmRender(config, fetchImpl);
    const messages = parseRenderText(render);
    if (messages.length > 0) return { messages, source: "chain", via: "rpc" };
  } catch {
    // Fall through to gnoweb.
  }
  try {
    const text = await fetchGnowebText(config, fetchImpl);
    const messages = parseRenderText(text);
    if (messages.length > 0) return { messages, source: "chain", via: "gnoweb" };
  } catch {
    // Both read paths failed. Caller falls back to sample data.
  }
  return null;
}
