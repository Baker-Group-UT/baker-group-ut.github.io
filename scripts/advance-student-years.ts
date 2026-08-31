#!/usr/bin/env tsx
/**
 * advance-student-years.ts
 *
 * Bumps the `year` field in src/content/people/*.md by one academic year:
 *
 *   PhD / Masters / Postdoc   "3rd year"  ->  "4th year"
 *   Undergraduate             "Junior"    ->  "Senior"
 *
 * Roles whose progression needs a human decision are deliberately left
 * alone and reported instead of guessed at:
 *
 *   - Undergraduates already marked "Senior" (they graduate, they don't
 *     become 5th-years — someone has to decide between Alumni, a masters
 *     entry, or staying on).
 *   - Alumni, External Members, Staff, Visiting Researchers and the PI.
 *     External members in particular are often students *somewhere else*,
 *     so their year isn't ours to advance.
 *   - Anything whose `year` doesn't match a shape we recognise.
 *
 * Edits are done as a targeted line rewrite rather than a YAML
 * parse-and-dump, so comments, key order, blank lines and quoting style in
 * the person files all survive untouched.
 *
 * Usage:
 *   npm run advance-years -- --dry-run     # print the plan, change nothing
 *   npm run advance-years                  # apply
 *
 * Annual automation lives in .github/workflows/advance-student-years.yml.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PEOPLE_DIR = path.join(ROOT, "src/content/people");

// Roles using the numeric "Nth year" form.
const NUMERIC_YEAR_ROLES = new Set(["PhD Student", "Masters Student", "Postdoc"]);
// Roles using named undergraduate standing.
const UNDERGRAD_ROLES = new Set(["Undergraduate"]);

const UNDERGRAD_LADDER = ["Freshman", "Sophomore", "Junior", "Senior"];

interface Change {
  file: string;
  name: string;
  role: string;
  from: string;
  to: string;
}
interface Skip {
  file: string;
  name: string;
  role: string;
  year: string | null;
  reason: string;
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th", 21 -> "21st". */
function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Pull a top-level scalar out of the frontmatter without a YAML parse.
 *  Only used for `name` / `role` / `year`, which are always simple quoted
 *  or bare scalars in these files. */
function readField(frontmatter: string, key: string): string | null {
  const m = frontmatter.match(
    new RegExp(`^${key}:[ \\t]*(.*?)[ \\t]*$`, "m"),
  );
  if (!m) return null;
  const raw = m[1].trim();
  if (!raw || raw.startsWith("#")) return null;
  return raw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

function splitFrontmatter(raw: string): { fm: string; rest: string } | null {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  return { fm: m[1], rest: raw.slice(m[0].length) };
}

/** Decide the new year, or explain why we're leaving this one alone. */
function nextYear(
  role: string,
  year: string | null,
): { to: string } | { skip: string } {
  if (!year) return { skip: "no `year` field" };

  if (NUMERIC_YEAR_ROLES.has(role)) {
    const m = year.match(/^(\d+)(?:st|nd|rd|th)\s+year$/i);
    if (!m) return { skip: `unrecognised year format "${year}"` };
    return { to: `${ordinal(Number(m[1]) + 1)} year` };
  }

  if (UNDERGRAD_ROLES.has(role)) {
    const i = UNDERGRAD_LADDER.findIndex(
      (s) => s.toLowerCase() === year.toLowerCase(),
    );
    if (i === -1) return { skip: `unrecognised standing "${year}"` };
    if (i === UNDERGRAD_LADDER.length - 1) {
      return {
        skip: "graduating senior — needs a human (Alumni? masters? staying on?)",
      };
    }
    return { to: UNDERGRAD_LADDER[i + 1] };
  }

  return { skip: `role "${role}" is not advanced automatically` };
}

/** Rewrite just the `year:` line, preserving its original quoting style. */
function replaceYearLine(frontmatter: string, to: string): string | null {
  let replaced = false;
  const out = frontmatter.replace(
    /^(year:[ \t]*)(.*)$/m,
    (_full, prefix: string, value: string) => {
      replaced = true;
      const trimmed = value.trim();
      // Match however the file already quotes it.
      if (/^".*"$/.test(trimmed)) return `${prefix}"${to}"`;
      if (/^'.*'$/.test(trimmed)) return `${prefix}'${to}'`;
      return `${prefix}${to}`;
    },
  );
  return replaced ? out : null;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const files = (await readdir(PEOPLE_DIR)).filter(
    (f) => f.endsWith(".md") && !f.startsWith("_"),
  );

  const changes: Change[] = [];
  const skips: Skip[] = [];
  const attention: Skip[] = [];

  for (const file of files) {
    const full = path.join(PEOPLE_DIR, file);
    const raw = await readFile(full, "utf8");
    const split = splitFrontmatter(raw);
    if (!split) {
      skips.push({
        file,
        name: file,
        role: "?",
        year: null,
        reason: "no frontmatter block",
      });
      continue;
    }

    const name = readField(split.fm, "name") ?? file;
    const role = readField(split.fm, "role") ?? "?";
    const year = readField(split.fm, "year");

    const decision = nextYear(role, year);
    if ("skip" in decision) {
      const entry = { file, name, role, year, reason: decision.skip };
      // Graduating seniors are the one skip a human actually has to act on.
      if (decision.skip.startsWith("graduating senior")) attention.push(entry);
      else skips.push(entry);
      continue;
    }

    const newFm = replaceYearLine(split.fm, decision.to);
    if (!newFm) {
      skips.push({ file, name, role, year, reason: "could not locate year line" });
      continue;
    }

    changes.push({ file, name, role, from: year!, to: decision.to });
    if (!dryRun) await writeFile(full, `---\n${newFm}\n---${split.rest}`);
  }

  // --- Report ---
  console.log(dryRun ? "=== DRY RUN (no files written) ===\n" : "=== Advancing ===\n");

  if (changes.length === 0) {
    console.log("No student years to advance.");
  } else {
    for (const c of changes) {
      console.log(`  ${c.name} (${c.role}): ${c.from} -> ${c.to}`);
    }
  }

  if (attention.length > 0) {
    console.log("\n--- Needs a human ---");
    for (const s of attention) console.log(`  ${s.name} (${s.role}): ${s.reason}`);
  }

  if (skips.length > 0) {
    console.log("\n--- Left alone ---");
    for (const s of skips) console.log(`  ${s.name} (${s.role}): ${s.reason}`);
  }

  console.log(
    `\n${changes.length} advanced, ${attention.length} needing review, ${skips.length} untouched.`,
  );

  // Hand the workflow a ready-made PR body without re-deriving any of this.
  if (process.env.GITHUB_STEP_SUMMARY || process.env.ADVANCE_SUMMARY_PATH) {
    const lines = [
      "### Advanced",
      ...(changes.length
        ? changes.map((c) => `- **${c.name}** (${c.role}): ${c.from} → ${c.to}`)
        : ["_none_"]),
    ];
    if (attention.length) {
      lines.push(
        "",
        "### Needs a human decision",
        ...attention.map((s) => `- **${s.name}** (${s.role}): ${s.reason}`),
      );
    }
    const target =
      process.env.ADVANCE_SUMMARY_PATH || process.env.GITHUB_STEP_SUMMARY!;
    await writeFile(target, lines.join("\n") + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
