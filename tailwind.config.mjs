import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      // ---------------------------------------------------------------
      // The palettes are driven by CSS variables (channel triples, e.g.
      // "250 246 236") declared in src/styles/global.css, so `:root` and
      // `.dark` can hand the SAME utility class a different hue.
      //
      // Light mode is the original bakery-warm palette (crust = toasted
      // browns, burnt = UT Austin orange). Dark mode re-points every scale
      // at the blueberry palette. Each scale keeps its light-to-dark
      // ordering in both themes, so `dark:text-crust-50` still means "the
      // lightest tone" and every existing utility keeps working — no
      // markup changes needed to reskin.
      //
      // The `<alpha-value>` placeholder is what lets slash-opacity
      // utilities like `bg-crust-800/40` keep working.
      // ---------------------------------------------------------------
      colors: {
        crust: {
          50: "rgb(var(--c-crust-50) / <alpha-value>)",
          100: "rgb(var(--c-crust-100) / <alpha-value>)",
          200: "rgb(var(--c-crust-200) / <alpha-value>)",
          300: "rgb(var(--c-crust-300) / <alpha-value>)",
          400: "rgb(var(--c-crust-400) / <alpha-value>)",
          500: "rgb(var(--c-crust-500) / <alpha-value>)",
          600: "rgb(var(--c-crust-600) / <alpha-value>)",
          700: "rgb(var(--c-crust-700) / <alpha-value>)",
          800: "rgb(var(--c-crust-800) / <alpha-value>)",
          900: "rgb(var(--c-crust-900) / <alpha-value>)",
        },
        butter: {
          50: "rgb(var(--c-butter-50) / <alpha-value>)",
          100: "rgb(var(--c-butter-100) / <alpha-value>)",
          200: "rgb(var(--c-butter-200) / <alpha-value>)",
          300: "rgb(var(--c-butter-300) / <alpha-value>)",
          400: "rgb(var(--c-butter-400) / <alpha-value>)",
          500: "rgb(var(--c-butter-500) / <alpha-value>)",
        },
        burnt: {
          DEFAULT: "rgb(var(--c-burnt-500) / <alpha-value>)",
          50: "rgb(var(--c-burnt-50) / <alpha-value>)",
          100: "rgb(var(--c-burnt-100) / <alpha-value>)",
          200: "rgb(var(--c-burnt-200) / <alpha-value>)",
          300: "rgb(var(--c-burnt-300) / <alpha-value>)",
          400: "rgb(var(--c-burnt-400) / <alpha-value>)",
          500: "rgb(var(--c-burnt-500) / <alpha-value>)",
          600: "rgb(var(--c-burnt-600) / <alpha-value>)",
          700: "rgb(var(--c-burnt-700) / <alpha-value>)",
          800: "rgb(var(--c-burnt-800) / <alpha-value>)",
          900: "rgb(var(--c-burnt-900) / <alpha-value>)",
        },
        sage: {
          100: "rgb(var(--c-sage-100) / <alpha-value>)",
          300: "rgb(var(--c-sage-300) / <alpha-value>)",
          500: "rgb(var(--c-sage-500) / <alpha-value>)",
          700: "rgb(var(--c-sage-700) / <alpha-value>)",
        },
        ink: "rgb(var(--c-crust-900) / <alpha-value>)",
      },
      fontFamily: {
        serif: ['"Lora Variable"', "Lora", "Georgia", "serif"],
        sans: ['"Inter Variable"', "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Menlo", "monospace"],
      },
      // Shadows read off the same tint/alpha variables as `.card`, so they
      // pick up the blueberry theme's near-black shadows in dark mode
      // instead of staying brown.
      boxShadow: {
        "warm-sm":
          "0 1px 2px rgb(var(--shadow-tint) / var(--shadow-alpha-sm))",
        warm: "0 6px 20px -6px rgb(var(--shadow-tint) / var(--shadow-alpha-md))",
        "warm-lg":
          "0 20px 40px -20px rgb(var(--shadow-tint) / var(--shadow-alpha-lg))",
      },
      backgroundImage: {
        "flour-grain":
          "radial-gradient(rgb(var(--dot-color) / var(--dot-alpha)) 1px, transparent 1px)",
      },
      backgroundSize: {
        grain: "18px 18px",
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": theme("colors.crust.800"),
            "--tw-prose-headings": theme("colors.crust.900"),
            "--tw-prose-links": theme("colors.burnt.600"),
            "--tw-prose-bold": theme("colors.crust.900"),
            "--tw-prose-quotes": theme("colors.crust.700"),
            "--tw-prose-quote-borders": theme("colors.burnt.300"),
            "--tw-prose-bullets": theme("colors.burnt.400"),
            "--tw-prose-counters": theme("colors.crust.600"),
            "--tw-prose-hr": theme("colors.crust.200"),
            "--tw-prose-code": theme("colors.crust.800"),
            "--tw-prose-th-borders": theme("colors.crust.300"),
            "--tw-prose-td-borders": theme("colors.crust.200"),
            "--tw-prose-invert-body": theme("colors.crust.200"),
            "--tw-prose-invert-headings": theme("colors.crust.50"),
            "--tw-prose-invert-links": theme("colors.burnt.300"),
            "--tw-prose-invert-bold": theme("colors.crust.50"),
            "--tw-prose-invert-quotes": theme("colors.crust.200"),
            "--tw-prose-invert-quote-borders": theme("colors.burnt.400"),
            "--tw-prose-invert-bullets": theme("colors.burnt.300"),
            "--tw-prose-invert-counters": theme("colors.crust.300"),
            "--tw-prose-invert-hr": theme("colors.crust.700"),
            "--tw-prose-invert-code": theme("colors.crust.100"),
            "--tw-prose-invert-th-borders": theme("colors.crust.600"),
            "--tw-prose-invert-td-borders": theme("colors.crust.700"),
            fontFamily: theme("fontFamily.sans").join(", "),
            h1: { fontFamily: theme("fontFamily.serif").join(", ") },
            h2: { fontFamily: theme("fontFamily.serif").join(", ") },
            h3: { fontFamily: theme("fontFamily.serif").join(", ") },
          },
        },
      }),
    },
  },
  plugins: [typography],
};
