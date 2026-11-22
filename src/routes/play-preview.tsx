import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlayScreen } from "@/game/play/PlayScreen";
import { LESSONS } from "@/game/data/lessons";
import { Badge } from "@/game/Badges";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=JetBrains+Mono:wght@400;600;700&family=Nunito:wght@400;600;700;800&display=swap";

export const Route = createFileRoute("/play-preview")({
  head: () => ({
    meta: [
      { title: "PyArena · Play preview" },
      { name: "description", content: "Solve Python challenges and help Pip the snake hop up the jungle path to the glowing temple." },
      { property: "og:title", content: "PyArena · Play preview" },
      { property: "og:description", content: "Solve Python challenges and help Pip the snake hop up the jungle path to the glowing temple." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: FONTS },
      { rel: "preload", as: "image", href: "/assets/bg-keyart.png" },
    ],
  }),
  component: PlayPreview,
});

const TOPICS = LESSONS.flatMap((l) => l.topics);

function PlayPreview() {
  const [mounted, setMounted] = useState(false);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);

  if (mounted && topicId) {
    return (
      <PlayScreen
        key={topicId}
        topicId={topicId}
        onBack={() => setTopicId(null)}
        onTopicComplete={(id) => {
          setNotice(`Topic complete (preview): ${TOPICS.find((t) => t.id === id)?.title ?? id}`);
          setTopicId(null);
        }}
        onReward={({ xp }) => console.info(`[preview] +${xp} XP`)}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-10 text-foreground">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">PyArena · preview</p>
        <h1 className="mt-2 text-3xl font-bold">Pick a topic to play</h1>
      </div>
      {notice && (
        <p role="status" className="rounded-md border border-border bg-muted px-4 py-2 text-sm">
          {notice}
        </p>
      )}
      <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        {TOPICS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setNotice(null); setTopicId(t.id); }}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
          >
            <Badge id={t.badgeImage} size={44} />
            <span>
              <span className="block text-xs text-muted-foreground">Topic {i + 1}</span>
              <span className="block font-semibold">{t.title}</span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
