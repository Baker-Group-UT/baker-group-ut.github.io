// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Used for canonical URLs, the sitemap, and the RSS feed. Update this
  // when the site moves to a UT domain.
  site: "https://baker-group-ut.github.io",
  integrations: [
    tailwind({
      // Inject a base stylesheet ourselves so we can control the order of
      // our custom CSS variables / typography layer vs Tailwind's preflight.
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  markdown: {
    shikiConfig: {
      theme: "github-light",
      wrap: true,
    },
  },
});
