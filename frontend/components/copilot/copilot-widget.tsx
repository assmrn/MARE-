import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as api from "@/services/api";
import type { ChatMessage } from "@/types/mission";

const SUGGESTIONS = ["Explain the active anomaly", "How's the battery?", "Is the weather safe to fly?", "Suggest a route optimization"];

const INITIAL: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "MARE Copilot online. Ask me about telemetry, the active anomaly, weather, or route options.",
  timestampISO: new Date().toISOString(),
};

export function CopilotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text, timestampISO: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    const reply = await api.sendCopilotMessage(text);
    setMessages((prev) => [...prev, reply]);
    setThinking(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        aria-label={open ? "Close AI Copilot" : "Open AI Copilot"}
        className="fixed bottom-5 right-5 z-40 size-12 rounded-full shadow-elevated"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </Button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[480px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-elevated animate-slide-up">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary-muted text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold">MARE Copilot</p>
              <p className="text-[10px] text-muted-foreground">Context-aware mission assistant</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Analyzing telemetry…
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-center gap-2 border-t border-border p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the mission…"
              className="h-8 text-xs"
              aria-label="Message MARE Copilot"
            />
            <Button type="submit" size="icon" className="size-8 shrink-0" disabled={!input.trim() || thinking}>
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
