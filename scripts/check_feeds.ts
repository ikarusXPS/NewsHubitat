import Parser from 'rss-parser';
import { NEWS_SOURCES } from '../server/config/sources';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'NewsHub/2.0 (https://newshub.com; contact@newshub.com)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
});

async function testAllFeeds() {
  console.log('--- News Feed Diagnostic ---');
  
  const regions = [...new Set(NEWS_SOURCES.map(s => s.region))];
  const resultsByRegion: Record<string, { total: number, functional: number, failing: number, noEndpoint: number, details: any[] }> = {};

  for (const region of regions) {
    resultsByRegion[region] = { total: 0, functional: 0, failing: 0, noEndpoint: 0, details: [] };
  }

  // Use batches to avoid overwhelming the system or being flagged as a bot
  const batchSize = 10;
  for (let i = 0; i < NEWS_SOURCES.length; i += batchSize) {
    const batch = NEWS_SOURCES.slice(i, i + batchSize);
    await Promise.all(batch.map(async (source) => {
        const region = source.region;
        resultsByRegion[region].total++;

        if (!source.apiEndpoint) {
          resultsByRegion[region].noEndpoint++;
          resultsByRegion[region].details.push({ id: source.id, name: source.name, status: 'NO_ENDPOINT' });
          return;
        }

        try {
          await parser.parseURL(source.apiEndpoint);
          resultsByRegion[region].functional++;
          resultsByRegion[region].details.push({ id: source.id, name: source.name, status: 'OK' });
        } catch (err: any) {
          resultsByRegion[region].failing++;
          resultsByRegion[region].details.push({ id: source.id, name: source.name, status: 'FAIL', error: err.message });
        }
    }));
  }

  console.log('\n--- Results Summary ---');
  for (const region of regions) {
    const r = resultsByRegion[region];
    const statusIcon = r.total >= 10 ? '✅' : '⚠️';
    console.log(`${statusIcon} Region: ${region.padEnd(15)} | Total: ${r.total} | OK: ${r.functional} | Fail: ${r.failing} | No URL: ${r.noEndpoint}`);
  }

  console.log('\n--- Critical: Regions with < 10 Sources ---');
  for (const region of regions) {
    if (resultsByRegion[region].total < 10) {
      console.log(`❌ ${region}: Only ${resultsByRegion[region].total} sources`);
    }
  }

  console.log('\n--- Detailed Failures (Active Feeds only) ---');
  for (const region of regions) {
    const failing = resultsByRegion[region].details.filter(d => d.status === 'FAIL');
    if (failing.length > 0) {
      console.log(`\n[${region.toUpperCase()}]`);
      failing.forEach(f => console.log(`  - ${f.name} (${f.id}): ${f.error}`));
    }
  }

  console.log('\n--- Sources Missing Endpoints ---');
  for (const region of regions) {
    const missing = resultsByRegion[region].details.filter(d => d.status === 'NO_ENDPOINT');
    if (missing.length > 0) {
      console.log(`\n[${region.toUpperCase()}]`);
      missing.forEach(m => console.log(`  - ${m.name} (${m.id})`));
    }
  }

  process.exit(0);
}

testAllFeeds();
