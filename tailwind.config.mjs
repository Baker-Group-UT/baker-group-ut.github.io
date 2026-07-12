import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        // Bakery-warm palette. Burnt orange doubles as the UT Austin accent.
        crust: {
          50: "#FAF6EC",
          100: "#F5EBD6",
          200: "#ECD9B3",
          300: "#DFBE86",
          400: "#C99A5A",
          500: "#B07A3A",
          600: "#8B5A2B",
          700: "#6B4320",
          800: "#4A2E17",
          900: "#2D1810",
        },
        butter: {
          50: "#FFFBEA",
          100: "#FFF3C4",
          200: "#FCE588",
          300: "#FADB5F",
          400: "#F4C430",
          500: "#E0A82E",
        },
        burnt: {
          // UT Austin burnt orange, slightly warmed toward caramel.
          DEFAULT: "#BF5700",
          50: "#FBEFE2",
          100: "#F6D7B7",
          200: "#EFB17A",
          300: "#E28947",
          400: "#CF6B1F",
          500: "#BF5700",
          600: "#9C4700",
          700: "#773600",
          800: "#552600",
          900: "#361700",
        },
        sage: {
          100: "#E7EBDD",
          300: "#C2CCA8",
          500: "#9CAF88",
          700: "#6F8060",
        },
        ink: "#2D1810",
      },
      fontFamily: {
        serif: ['"Lora Variable"', "Lora", "Georgia", "serif"],
        sans: ['"Inter Variable"', "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Menlo", "monospace"],
      },
      boxShadow: {
        "warm-sm": "0 1px 2px rgba(75, 46, 23, 0.08)",
        warm: "0 6px 20px -6px rgba(75, 46, 23, 0.18)",
        "warm-lg": "0 20px 40px -20px rgba(75, 46, 23, 0.28)",
      },
      backgroundImage: {
        "flour-grain":
          "radial-gradient(rgba(107, 67, 32, 0.06) 1px, transparent 1px)",
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
