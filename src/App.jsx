import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, RefreshCw, ArrowUpDown, BookOpenText, LoaderCircle, PinOff } from "lucide-react";
import Header from "@/components/Header.jsx";
import StatsStrip from "@/components/StatsStrip.jsx";
import PostForm from "@/components/PostForm.jsx";
import MessageCard from "@/components/MessageCard.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { computeStats, filterMessages, makeLocalMessage, sortMessages, toggleLike } from "@/lib/messages.js";
import { SAMPLE_MESSAGES } from "@/lib/sampleData.js";
import { loadChainMessages } from "@/lib/rpc.js";
import {
  applyLikeOverlay,
  loadLikedIds,
  loadLocalPosts,
  saveLikedIds,
  saveLocalPosts,
  VISITOR_NAME_KEY,
} from "@/lib/storage.js";
import { CONFIG } from "@/config.js";
import { cn } from "@/lib/utils.js";

export default function App() {
  const [baseMessages, setBaseMessages] = useState(SAMPLE_MESSAGES);
  const [dataSource, setDataSource] = useState("sample"); // sample or chain
  const [loading, setLoading] = useState(true);
  const [loadNote, setLoadNote] = useState("");
  const [localPosts, setLocalPosts] = useState(() => loadLocalPosts());
  const [likedIds, setLikedIds] = useState(() => loadLikedIds());
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [visitorName] = useState(() => {
    try {
      return globalThis.localStorage?.getItem(VISITOR_NAME_KEY) || "";
    } catch {
      return "";
    }
  });
  const loadSeq = useRef(0);

  const loadBoard = useCallback(async () => {
    const seq = (loadSeq.current += 1);
    setLoading(true);
    const result = await loadChainMessages(CONFIG);
    if (loadSeq.current !== seq) return;
    if (result && result.messages.length > 0) {
      setBaseMessages(result.messages);
      setDataSource("chain");
      setLoadNote(
        result.via === "rpc"
          ? `Read ${result.messages.length} notes from the realm over RPC.`
          : `Read ${result.messages.length} notes from the realm on gnoweb.`,
      );
    } else {
      setBaseMessages(SAMPLE_MESSAGES);
      setDataSource("sample");
      setLoadNote(
        "The realm could not be read just now, so the board shows sample notes. Your own demo posts still save on this device.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const allMessages = useMemo(() => {
    const merged = [...localPosts, ...baseMessages];
    return applyLikeOverlay(merged, likedIds);
  }, [localPosts, baseMessages, likedIds]);

  const visibleMessages = useMemo(() => {
    return sortMessages(filterMessages(allMessages, query), sortMode);
  }, [allMessages, query, sortMode]);

  const stats = useMemo(() => computeStats(allMessages), [allMessages]);

  function handlePost({ text, name }) {
    const message = makeLocalMessage({ text, name });
    const next = [message, ...localPosts];
    setLocalPosts(next);
    saveLocalPosts(next);
    if (name) {
      try {
        globalThis.localStorage?.setItem(VISITOR_NAME_KEY, name);
      } catch {
        // Storage may be unavailable. The post still shows for this visit.
      }
    }
    setQuery("");
    setSortMode("newest");
  }

  function handleToggleLike(messageId) {
    const { messages: nextDisplay, likedIds: nextLiked } = toggleLike(allMessages, likedIds, messageId);
    setLikedIds(nextLiked);
    saveLikedIds(nextLiked);
    // Persist like counts for local posts, which live only on this device.
    const nextLocal = nextDisplay
      .filter((m) => m.source === "local")
      .map(({ likedByVisitor, ...rest }) => rest);
    setLocalPosts(nextLocal);
    saveLocalPosts(nextLocal);
  }

  return (
    <div className="min-h-screen">
      <Header dataSource={dataSource} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <section className="mb-8 max-w-3xl">
          <h1 className="font-display text-4xl leading-tight text-parchment-50 sm:text-5xl">
            The board by the fire
          </h1>
          <p className="mt-3 text-base leading-relaxed text-parchment-200 sm:text-lg">
            Every note here lives in a Gno realm on Gno.land testnet, pinned where the whole tavern
            can read it. Search the board, cheer the notes you like, and pin one of your own.
          </p>
          <p className="mt-2 font-mono text-xs text-parchment-300">
            Realm {CONFIG.REALM_PATH} on {CONFIG.CHAIN_ID}
          </p>
        </section>

        <StatsStrip stats={stats} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="space-y-6">
            <PostForm onPost={handlePost} initialName={visitorName} />

            <section
              aria-label="How TavernBoard works"
              className="rounded-2xl border border-night-700/70 bg-night-850/90 p-5 shadow-card"
            >
              <div className="flex items-center gap-2">
                <BookOpenText className="h-5 w-5 text-amber-glow" aria-hidden="true" />
                <h2 className="font-display text-xl text-parchment-50">How the board works</h2>
              </div>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-parchment-200">
                <li>
                  Notes are stored in the realm at{" "}
                  <span className="font-mono text-xs">{CONFIG.REALM_PATH}</span>. Anyone can read
                  them on gnoweb or through the testnet RPC.
                </li>
                <li>
                  This page reads the realm over RPC first, then gnoweb. If neither answers, it
                  shows sample notes with a demo data badge rather than an empty board.
                </li>
                <li>
                  Posting for real means signing a realm call with your own wallet. Demo posts save
                  on this device only and stay marked pending on chain.
                </li>
                <li>Cheers are one per visitor per note, kept in this browser.</li>
              </ul>
            </section>
          </div>

          <section aria-label="Message board" className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-52 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-parchment-300"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search notes, names, addresses..."
                  className="pl-10"
                  aria-label="Search the board"
                />
              </div>
              <div
                role="group"
                aria-label="Sort notes"
                className="inline-flex items-center rounded-xl border border-night-600 bg-night-900 p-1"
              >
                <ArrowUpDown className="ml-2 mr-1 h-4 w-4 text-parchment-300" aria-hidden="true" />
                {[
                  { value: "newest", label: "Newest" },
                  { value: "liked", label: "Most cheered" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSortMode(option.value)}
                    aria-pressed={sortMode === option.value}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                      sortMode === option.value
                        ? "bg-amber-glow text-night-950"
                        : "text-parchment-200 hover:bg-night-800",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button type="button" variant="secondary" onClick={loadBoard} disabled={loading}>
                {loading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                Refresh board
              </Button>
            </div>

            <p role="status" className="mt-3 text-sm text-parchment-300">
              {loading
                ? "Reading the realm..."
                : `${visibleMessages.length} of ${allMessages.length} notes shown. ${loadNote}`}
            </p>

            <div className="mt-4 space-y-4">
              {visibleMessages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  liked={likedIds.has(message.id)}
                  onToggleLike={handleToggleLike}
                />
              ))}
              {visibleMessages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-night-600 bg-night-850/60 px-6 py-12 text-center">
                  <PinOff className="mx-auto h-8 w-8 text-parchment-300" aria-hidden="true" />
                  <p className="mt-3 font-display text-xl text-parchment-50">No notes match that search</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-parchment-300">
                    Try a shorter word, or clear the search to see the whole board again.
                  </p>
                  <Button type="button" variant="secondary" className="mt-4" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-12 border-t border-night-700/60 pt-6 text-sm leading-relaxed text-parchment-300">
          <p>
            TavernBoard is a Gnome Tavern Hackathon entry. Board data comes from the realm at{" "}
            <span className="font-mono text-xs">{CONFIG.REALM_PATH}</span> on the {CONFIG.CHAIN_ID}{" "}
            testnet when it can be read, and from clearly labelled sample notes when it cannot.
            Demo posts never leave this browser until you sign them yourself.
          </p>
        </footer>
      </main>
    </div>
  );
}
