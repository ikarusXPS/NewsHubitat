/**
 * Bot Detection Middleware (D-04, D-05)
 * Detects social media crawlers and generates OG HTML for rich previews
 */

/**
 * Known social media bot user-agent substrings
 * These bots cannot execute JavaScript and need server-rendered HTML with OG tags
 */
const SOCIAL_BOTS = [
  'Twitterbot',
  'facebookexternalhit',
  'LinkedInBot',
  'WhatsApp',
  'TelegramBot',
  'Slackbot',
  'Discordbot',
  'Facebot',
  'Pinterest',
  'Embedly',
];

/**
 * Check if the user-agent belongs to a social media bot
 */
export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SOCIAL_BOTS.some((bot) => ua.includes(bot.toLowerCase()));
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate HTML page with Open Graph meta tags for social media crawlers
 * Includes meta refresh to redirect humans who somehow see this page
 */
export function generateOGHtml(tags: Record<string, string>): string {
  const metaTags = Object.entries(tags)
    .map(
      ([property, content]) =>
        `<meta property="${property}" content="${escapeHtml(content)}" />`
    )
    .join('\n    ');

  const title = tags['og:title'] || 'NewsHub';
  const url = tags['og:url'] || '/';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${metaTags}
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(url)}">${escapeHtml(title)}</a></p>
</body>
</html>`;
}
