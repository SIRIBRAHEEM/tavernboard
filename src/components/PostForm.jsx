import { useMemo, useState } from "react";
import { Pin, Wallet, ShieldCheck, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card.jsx";
import { Input, Textarea, Badge } from "@/components/ui/input.jsx";
import { MAX_MESSAGE_LENGTH, validateMessage } from "@/lib/messages.js";
import { CONFIG } from "@/config.js";
import { cn } from "@/lib/utils.js";

export default function PostForm({ onPost, initialName = "" }) {
  const [text, setText] = useState("");
  const [name, setName] = useState(initialName);
  const [errors, setErrors] = useState({});
  const [stage, setStage] = useState("edit"); // edit, sign, done
  const [copied, setCopied] = useState(false);
  const [justPosted, setJustPosted] = useState("");

  const trimmedLength = text.trim().length;
  const overLimit = trimmedLength > MAX_MESSAGE_LENGTH;

  const gnokeyCommand = useMemo(() => {
    const safeText = text.trim().replace(/"/g, '\\"') || "Your note here";
    return [
      "gnokey maketx call \\",
      `  -pkgpath "${CONFIG.REALM_PATH}" \\`,
      '  -func "PostMessage" \\',
      `  -args "${safeText}" \\`,
      "  -gas-fee 5000ugnot -gas-wanted 5000000 \\",
      `  -chainid "${CONFIG.CHAIN_ID}" -remote "${CONFIG.RPC_ENDPOINT}" \\`,
      "  <your-key-name>",
    ].join("\n");
  }, [text]);

  function handleReview(event) {
    event.preventDefault();
    const result = validateMessage(text, name);
    setErrors(result.errors);
    if (!result.valid) return;
    setStage("sign");
  }

  function handleSaveDemo() {
    const result = validateMessage(text, name);
    if (!result.valid) {
      setErrors(result.errors);
      setStage("edit");
      return;
    }
    onPost({ text: result.text, name: result.name });
    setJustPosted(result.text);
    setText("");
    setStage("done");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(gnokeyCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Pin a note</CardTitle>
          <Badge tone="amber">
            <Pin className="h-3 w-3" aria-hidden="true" />
            Board is open
          </Badge>
        </div>
        <CardDescription>
          Leave word for the tavern. Notes are stored in the realm at {CONFIG.REALM_PATH} on the{" "}
          {CONFIG.CHAIN_ID} testnet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stage === "done" && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Saved on this device as a demo post, marked pending on chain. It has not been written
              to the realm yet. To make it permanent, sign the call below with your own wallet.
            </p>
            <button
              type="button"
              onClick={() => setStage("edit")}
              className="ml-auto shrink-0 rounded-md p-1 text-emerald-200 hover:bg-emerald-400/20"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {stage !== "sign" ? (
          <form onSubmit={handleReview} noValidate className="space-y-4">
            <div>
              <label htmlFor="visitor-name" className="mb-1.5 block text-sm font-semibold text-parchment-100">
                Your name <span className="font-normal text-parchment-300">(optional)</span>
              </label>
              <Input
                id="visitor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How the tavern knows you"
                autoComplete="nickname"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" role="alert" className="mt-1.5 text-sm text-rose-300">
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="note-text" className="mb-1.5 block text-sm font-semibold text-parchment-100">
                Your note
              </label>
              <Textarea
                id="note-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Lost and found, quiz nights, fair trades, tall tales..."
                aria-invalid={Boolean(errors.text)}
                aria-describedby={errors.text ? "text-error text-count" : "text-count"}
              />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                {errors.text ? (
                  <p id="text-error" role="alert" className="text-sm text-rose-300">
                    {errors.text}
                  </p>
                ) : (
                  <p className="text-xs text-parchment-300">Short and clear pins best.</p>
                )}
                <p
                  id="text-count"
                  className={cn("font-mono text-xs", overLimit ? "font-bold text-rose-300" : "text-parchment-300")}
                >
                  {trimmedLength} / {MAX_MESSAGE_LENGTH}
                </p>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              <Pin className="h-4 w-4" aria-hidden="true" />
              Review and sign
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-night-600 bg-night-900 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-parchment-300">Your note</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-parchment-50">
                {text.trim()}
              </p>
              {name.trim() && <p className="mt-1 text-sm text-parchment-300">Signed as {name.trim()}</p>}
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-amber-glow/30 bg-amber-glow/10 px-4 py-3 text-sm leading-relaxed text-parchment-100">
              <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-amber-glow" aria-hidden="true" />
              <p>
                <strong className="text-parchment-50">Sign with wallet.</strong> Writing to the realm
                needs a signed transaction from your own Gno wallet, such as Adena or gnokey. This
                page has no wallet write path wired in, so it cannot send that transaction for you
                and will not pretend otherwise. Save a demo post on this device, or sign the real
                call yourself with the command below.
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-parchment-100">Sign it yourself with gnokey</p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-night-600 bg-night-800 px-2.5 py-1.5 text-xs font-semibold text-parchment-100 hover:border-amber-glow/50"
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl border border-night-700 bg-night-950 px-4 py-3 font-mono text-xs leading-relaxed text-parchment-200">
                {gnokeyCommand}
              </pre>
              <p className="mt-1.5 text-xs text-parchment-300">
                Function name and arguments follow the realm interface. Check the realm source on
                gnoweb before signing.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" size="lg" onClick={handleSaveDemo}>
                <Pin className="h-4 w-4" aria-hidden="true" />
                Save demo post on this device
              </Button>
              <Button type="button" variant="secondary" size="lg" onClick={() => setStage("edit")}>
                Back to editing
              </Button>
            </div>
            <p className="text-xs text-parchment-300">
              Demo posts stay in this browser, show a pending on chain badge, and are never shown as
              confirmed transactions.
            </p>
          </div>
        )}

        {stage === "done" && justPosted && (
          <p className="sr-only" role="status">
            Demo post saved: {justPosted}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
