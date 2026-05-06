import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das reqs < 500ms
  },
};

export default function () {
  const url = `${__ENV.VITE_SUPABASE_URL}/functions/v1/webhook-inbound?slug=test-endpoint`;
  const payload = JSON.stringify({ event: 'test', data: 'k6' });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Signature-256': 'sha256=invalid-for-test',
    },
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 401 (expected invalid sig)': (r) => r.status === 401,
  });
  sleep(1);
}
