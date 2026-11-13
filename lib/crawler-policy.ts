// Preserve Next 16.4.6's default HTML-limited bots when extending its public
// htmlLimitedBots option. Revisit this baseline when upgrading the framework.
const defaultHtmlBots = /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/;
const aiSearchBots = /OAI-SearchBot|ChatGPT-User|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User/;
export const HTML_METADATA_BOTS = new RegExp(`${defaultHtmlBots.source}|${aiSearchBots.source}`, 'i');
