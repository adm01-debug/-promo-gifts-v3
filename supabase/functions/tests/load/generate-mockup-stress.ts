/**
 * generate-mockup-stress.ts
 * 
 * Stress test simulation for the mockup generation endpoint.
 * This script simulates concurrent requests and monitors response times and success rates.
 * Run with: deno run --allow-net --allow-env supabase/functions/tests/load/generate-mockup-stress.ts
 */

const FUNCTION_URL = Deno.env.get('SUPABASE_URL') + '/functions/v1/generate-mockup';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'YOUR_ANON_KEY';
const CONCURRENT_USERS = 5;
const REQUESTS_PER_USER = 3;

async function simulateUser(userId: number) {
  const results = [];
  console.log(`User ${userId} starting stress test...`);

  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const start = Date.now();
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
          'X-Test-Mode': 'true'
        },
        body: JSON.stringify({
          productImageUrl: "https://example.com/mug.jpg",
          logoUrl: "https://example.com/logo.png",
          positionX: 50,
          positionY: 50,
          productName: `Stress Test Product ${userId}-${i}`
        })
      });

      const latency = Date.now() - start;
      const status = response.status;
      results.push({ latency, status, success: response.ok });
      console.log(`User ${userId} | Req ${i} | Status ${status} | Latency ${latency}ms`);
    } catch (err) {
      console.error(`User ${userId} | Req ${i} | Error: ${err.message}`);
      results.push({ latency: Date.now() - start, status: 0, success: false });
    }
  }
  return results;
}

async function runLoadTest() {
  console.log(`Starting load test with ${CONCURRENT_USERS} concurrent users...`);
  const userPromises = Array.from({ length: CONCURRENT_USERS }, (_, i) => simulateUser(i));
  const allResults = (await Promise.all(userPromises)).flat();

  const total = allResults.length;
  const successes = allResults.filter(r => r.success).length;
  const failures = total - successes;
  const avgLatency = allResults.reduce((acc, r) => acc + r.latency, 0) / total;

  console.log("\n--- LOAD TEST SUMMARY ---");
  console.log(`Total Requests: ${total}`);
  console.log(`Successes:      ${successes}`);
  console.log(`Failures:       ${failures}`);
  console.log(`Avg Latency:    ${avgLatency.toFixed(2)}ms`);
  console.log("-------------------------\n");

  if (failures > 0) Deno.exit(1);
}

if (import.meta.main) {
  runLoadTest();
}
