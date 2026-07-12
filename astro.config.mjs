// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://baker.utexas.edu",
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
