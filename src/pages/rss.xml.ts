import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("news", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  return rss({
    title: "The Baker Group — News",
    description:
      "Updates from The Baker Group at UT Austin — empirical error-corrected quantum computer architecture.",
    site: context.site ?? "https://baker.utexas.edu",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary ?? "",
      pubDate: post.data.date,
      link: `/news/${post.slug}/`,
    })),
    customData: "<language>en-us</language>",
  });
}
