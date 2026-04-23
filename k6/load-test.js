import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { login } from './lib/auth.js';
import { checkStatus, checkSchema } from './lib/checks.js';
import { BASE_URL } from './lib/config.js';

// D-03, D-24: Load test users once and share across VUs (gitignored file)
const users = new SharedArray('users', function () {
  const data = open('./data/users.json');
  return JSON.parse(data);
});

// D-15, D-27: Load AI questions once
const questions = new SharedArray('questions', function () {
  const data = open('./data/questions.json');
  return JSON.parse(data);
});

// D-07: Mark 429 rate limit responses as expected (not failures)
http.setResponseCallback(
  http.expectedStatuses(200, 201, 429, { min: 200, max: 299 })
);

// D-13: Smoke test scenario definition
const smokeScenario = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 10 },
  ],
  gracefulRampDown: '10s',
  exec: 'userJourney',
  env: { SCENARIO: 'smoke' },
};

// D-04, D-11: Full load test scenario definition
const loadScenario = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '2m', target: 1000 },   // Ramp to 1k
    { duration: '3m', target: 5000 },   // Ramp to 5k
    { duration: '3m', target: 10000 },  // Ramp to 10k (D-18: hard requirement)
    { duration: '2m', target: 10000 },  // Hold at 10k peak
    { duration: '2m', target: 0 },      // Ramp down
  ],
  gracefulRampDown: '30s',
  exec: 'userJourney',
  env: { SCENARIO: 'load' },
};

// D-04, D-11, D-13, D-20, D-25: Scenario configuration
// Select scenario based on K6_SCENARIO env var (smoke, load, or both)
const selectedScenario = __ENV.K6_SCENARIO || 'both';
const scenarios = {};
if (selectedScenario === 'smoke' || selectedScenario === 'both') {
  scenarios.smoke = smokeScenario;
}
if (selectedScenario === 'load' || selectedScenario === 'both') {
  scenarios.load = { ...loadScenario, startTime: selectedScenario === 'both' ? '2m' : '0s' };
}

export const options = {
  scenarios,

  // D-36, D-37, D-38, D-39: Performance baselines (thresholds)
  thresholds: {
    'http_req_duration{endpoint:news}': ['p(95)<500'],      // D-36: news p95 < 500ms
    'http_req_duration{endpoint:ai}': ['p(95)<5000'],       // D-37: AI p95 < 5s
    'http_req_duration{endpoint:auth}': ['p(95)<300'],      // D-38: auth p95 < 300ms
    'http_req_failed': ['rate<0.01'],  // D-39: <1% error rate (excludes 429 per D-07)
  },
};

// D-02, D-05, D-06, D-10, D-16, D-17: User journey simulation
export function userJourney() {
  // Select random user from pool
  const user = users[Math.floor(Math.random() * users.length)];

  // Step 1: Login (D-02)
  const token = login(user.email, user.password, BASE_URL);
  if (!token) return; // Skip iteration if login fails

  // D-17: Random think time 1-3 seconds
  sleep(Math.random() * 2 + 1);

  // Step 2: Browse news (D-06: 90% read-heavy)
  const newsRes = http.get(`${BASE_URL}/api/news?limit=20`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { endpoint: 'news' },
  });

  check(newsRes, {
    'news loaded': (r) => checkStatus(r, [200]),
    'news has data': (r) => checkSchema(r, ['success', 'data']),
  });

  // D-17: Random think time 2-5 seconds (reading articles)
  sleep(Math.random() * 3 + 2);

  // Step 3: Ask AI (D-05: ~5% of requests)
  if (Math.random() < 0.05) {
    const question = questions[Math.floor(Math.random() * questions.length)];
    const context = newsRes.status === 200
      ? newsRes.json('data').slice(0, 3).map(a => a.content || a.title)
      : [];

    const aiRes = http.post(`${BASE_URL}/api/ai/ask`, JSON.stringify({
      question,
      context,
    }), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'ai' },
      timeout: '10s',
    });

    check(aiRes, {
      'ai response': (r) => checkStatus(r, [200]),
    });

    // D-17: Random think time
    sleep(Math.random() * 2 + 1);
  }

  // Step 4: Bookmark (D-06: ~10% writes)
  if (Math.random() < 0.1 && newsRes.status === 200) {
    const articles = newsRes.json('data');
    if (articles && articles.length > 0) {
      // D-10: Fetch real article IDs
      const articleId = articles[Math.floor(Math.random() * articles.length)].id;

      const bookmarkRes = http.post(`${BASE_URL}/api/bookmarks`, JSON.stringify({
        articleId,
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        tags: { endpoint: 'bookmarks' },
      });

      check(bookmarkRes, {
        'bookmark created': (r) => checkStatus(r, [200, 201]),
      });
    }
  }

  // D-17: Random think time before next iteration
  sleep(Math.random() * 2 + 1);
}

// D-28: Post-test report generation (HTML + JSON)
export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data, {
      title: 'NewsHub Load Test Report',
      theme: 'default',
    }),
    'summary.json': JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}
