/**
 * Generate HTML for OAuth popup callback
 * Posts result to parent window via postMessage, then closes popup
 * Per D-08: Popup flow preserves SPA state
 */
export function generateCallbackHtml(
  token: string | null,
  needsLinking: boolean,
  error: string | null,
  email?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>NewsHub OAuth</title>
  <style>
    body {
      background: #0a0a0f;
      color: #e5e7eb;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .loading { color: #00f0ff; }
    .error { color: #ff0044; }
  </style>
</head>
<body>
  <div class="${error ? 'error' : 'loading'}">${error || 'Completing sign in...'}</div>
  <script>
    (function() {
      const message = {
        type: ${error ? "'OAUTH_ERROR'" : "'OAUTH_SUCCESS'"},
        ${error ? `error: ${JSON.stringify(error)},` : ''}
        ${token ? `token: ${JSON.stringify(token)},` : ''}
        needsLinking: ${needsLinking},
        ${email ? `email: ${JSON.stringify(email)},` : ''}
      };

      if (window.opener) {
        window.opener.postMessage(message, window.location.origin);
        setTimeout(() => window.close(), 100);
      } else {
        // Fallback: redirect to app with params
        ${token ? `window.location.href = '/?oauth_token=' + encodeURIComponent(${JSON.stringify(token)});` : ''}
        ${error ? `window.location.href = '/?oauth_error=' + encodeURIComponent(${JSON.stringify(error)});` : ''}
      }
    })();
  </script>
</body>
</html>
  `;
}
