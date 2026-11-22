import { createFileRoute, redirect } from "@tanstack/react-router";

// The home page is owned by a separate module; until it lands, send visitors to the play preview.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/play-preview" });
  },
  head: () => ({
    meta: [
      { title: "PyArena · Learn Python with Pip" },
      { name: "description", content: "A jungle adventure where every Python answer helps Pip the snake grow." },
      { property: "og:title", content: "PyArena · Learn Python with Pip" },
      { property: "og:description", content: "A jungle adventure where every Python answer helps Pip the snake grow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
