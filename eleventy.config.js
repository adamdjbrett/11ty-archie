import { DateTime } from "luxon";
import { IdAttributePlugin } from "@11ty/eleventy";
import pluginRss from "@11ty/eleventy-plugin-rss";
import { createRequire } from "node:module";
import yaml from "js-yaml";
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItAttrs from "markdown-it-attrs";
import markdownItFootnote from "markdown-it-footnote";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function(eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(IdAttributePlugin);

  if (typeof globalThis.File === "undefined") {
    const nodeBuffer = require("node:buffer");
    globalThis.File = nodeBuffer.File || class FileShim {};
  }
  const { default: pluginTOC } = await import("eleventy-plugin-toc");
  eleventyConfig.addPlugin(pluginTOC, {
    tags: ["h2", "h3", "h4"],
    ul: true,
    wrapper: "nav"
  });
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));
  eleventyConfig.addDataExtension("yml", (contents) => yaml.load(contents));

  const md = markdownIt({
    html: true,
    breaks: false,
    linkify: true,
    typographer: true
  })
    .use(markdownItAnchor, {
      permalink: false,
      level: [1, 2, 3, 4]
    })
    .use(markdownItFootnote)
    .use(markdownItAttrs);
  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  eleventyConfig.addPassthroughCopy({ "src/feed/pretty-atom-feed.xsl": "/feed/pretty-atom-feed.xsl" });
  eleventyConfig.addPassthroughCopy({ "src/sitemap.xsl": "/sitemap.xsl" });

  eleventyConfig.addGlobalData("eleventyVersion", pkg.devDependencies["@11ty/eleventy"] || "3.1.2");

  eleventyConfig.addFilter("readableDate", (value, format = "LLL d, yyyy") => {
    const date = toDate(value);
    return date ? DateTime.fromJSDate(date, { zone: "utc" }).toFormat(format) : "";
  });

  eleventyConfig.addFilter("htmlDateString", (value) => {
    const date = toDate(value);
    return date ? DateTime.fromJSDate(date, { zone: "utc" }).toFormat("yyyy-LL-dd") : "";
  });

  eleventyConfig.addFilter("isoDate", (value) => {
    const date = toDate(value) || new Date();
    return DateTime.fromJSDate(date, { zone: "utc" }).toUTC().toISO();
  });

  eleventyConfig.addFilter("rfc822Date", (value) => {
    const date = toDate(value) || new Date();
    return DateTime.fromJSDate(date, { zone: "utc" }).toRFC2822();
  });

  eleventyConfig.addFilter("deployYear", (value) => {
    const date = toDate(value) || new Date();
    return DateTime.fromJSDate(date, { zone: "utc" }).toFormat("yyyy");
  });

  eleventyConfig.addFilter("slug", (value) => String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-"));

  eleventyConfig.addCollection("posts", (api) =>
    api
      .getFilteredByGlob("src/posts/**/*.{md,njk,html}")
      .filter((item) => item.data.published !== false)
      .sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addCollection("tagList", (api) => {
    const tags = new Set();
    for (const item of api.getFilteredByGlob("src/posts/**/*.{md,njk,html}")) {
      if (item.data.published === false) continue;
      for (const tag of item.data.tags || []) {
        if (tag === "all" || tag === "posts") continue;
        tags.add(tag);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  });

  eleventyConfig.addCollection("sitemap", (api) =>
    api.getAll().filter((item) => item.url && item.data.eleventyExcludeFromCollections !== true)
  );

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
}
