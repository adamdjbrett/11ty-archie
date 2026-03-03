export default {
  layout: "layouts/post.njk",
  tags: ["posts"],
  published: true,
  eleventyComputed: {
    permalink: (data) => (data.published === false ? false : data.permalink)
  }
};
