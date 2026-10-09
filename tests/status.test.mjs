import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serviceDefinitions, viewSnapshot, overallStatus, historyBins, maintenanceIsActive } from '../site/status-model.js';
import { probe, buildSnapshot, sanitizeMaintenance } from '../scripts/monitor.mjs';

const now = Date.now();
const timestamp = new Date(now).toISOString();
const service = (status = 'operational', at = timestamp) => ({ status, checkedAt: at, responseMs: 20 });
const allServices = () => Object.fromEntries(serviceDefinitions.filter(s => !s.infrastructure).map(s => [s.id, service()]));
const healthyProbes = () => ({ WEBSITE: service(), API: service(), STATUS: { ...service(), data: { success: true, timestamp, modules: Object.fromEntries(['LMS', 'TESTING', 'STUDENT', 'DOCUMENTS'].map(id => [id, { status: 'operational', lastChecked: timestamp, responseTime: '12ms', port: 5000, response: { private: 'must never be published' } }])) } } });
const fakeFetch = response => async () => response;
const options = { attempts: 1, retryDelayMs: 0 };

test('no data is unknown, never green', () => {
  const view = viewSnapshot(null, now);
  assert.equal(view.overall, 'unknown');
  assert.equal(view.fresh, false);
  assert.ok(Object.values(view.services).every(s => s.status === 'unknown'));
});
test('green requires every monitored service to be operational', () => {
  assert.equal(overallStatus(allServices(), {}, now), 'operational');
  const services = allServices();
  delete services.LMS;
  assert.equal(overallStatus(services, {}, now), 'unknown');
});
test('website and API failure is an outage; hidden modules remain unknown', () => {
  const probes = { WEBSITE: service('down'), API: service('down'), STATUS: service('down') };
  const result = buildSnapshot(probes, {}, null, now);
  assert.equal(result.overall, 'down');
  assert.equal(result.services.LMS.status, 'unknown');
  assert.equal(result.services.HOST.status, 'unknown');
  assert.equal(result.services.DOCKER.status, 'unknown');
  assert.equal(result.services.DATABASE.status, 'unknown');
});
test('a partial service failure is distinguished from a total outage', () => {
  const services = allServices();
  services.TESTING.status = 'down';
  assert.equal(overallStatus(services, {}, now), 'degraded');
  services.TESTING.status = 'operational';
  services.WEBSITE.status = 'down';
  assert.equal(overallStatus(services, {}, now), 'degraded');
});
test('stale results are unknown even if all old results were green', () => {
  const old = new Date(now - 21 * 60000).toISOString();
  const view = viewSnapshot({ checkedAt: old, services: allServices(), maintenance: { active: true } }, now);
  assert.equal(view.overall, 'unknown');
  assert.equal(view.fresh, false);
  assert.ok(Object.values(view.services).every(s => s.responseMs === null));
});
test('individual stale module results do not become green with a fresh snapshot', () => {
  const services = allServices();
  services.TESTING.checkedAt = new Date(now - 21 * 60000).toISOString();
  const view = viewSnapshot({ checkedAt: timestamp, services }, now);
  assert.equal(view.services.TESTING.status, 'unknown');
  assert.equal(view.overall, 'unknown');
});
test('future and malformed timestamps cannot make a snapshot fresh', () => {
  for (const at of ['invalid', null, new Date(now + 3600000).toISOString()]) assert.equal(viewSnapshot({ checkedAt: at, services: allServices() }, now).overall, 'unknown');
});
test('planned maintenance has explicit activation and a bounded time window', () => {
  assert.equal(maintenanceIsActive({ active: true }, now), true);
  assert.equal(maintenanceIsActive({ active: 'true' }, now), false);
  assert.equal(maintenanceIsActive({ active: true, startsAt: new Date(now + 60000).toISOString() }, now), false);
  assert.equal(maintenanceIsActive({ active: true, endsAt: new Date(now - 60000).toISOString() }, now), false);
  assert.equal(maintenanceIsActive({ active: true, startsAt: 'invalid' }, now), false);
  assert.equal(overallStatus(allServices(), { active: true }, now), 'maintenance');
});
test('manual maintenance config rejects ambiguous dates and invalid windows', () => {
  assert.throws(() => sanitizeMaintenance({ active: 'true' }));
  assert.throws(() => sanitizeMaintenance({ active: true, startsAt: '2026-10-09T10:00:00' }));
  assert.throws(() => sanitizeMaintenance({ active: true, startsAt: '2026-10-09T11:00:00+07:00', endsAt: '2026-10-09T10:00:00+07:00' }));
  assert.equal(sanitizeMaintenance({ active: false }).active, false);
});
test('history does not invent uptime for missing observations', () => {
  assert.ok(historyBins([], now).every(bin => bin.status === 'unknown' && bin.count === 0));
  const bins = historyBins([{ checkedAt: timestamp, overall: 'operational' }], now);
  assert.equal(bins.filter(bin => bin.status === 'operational').length, 1);
  assert.equal(bins.at(-1).count, 1);
});
test('history uses the worst observed status in each hour', () => {
  const bins = historyBins([{ checkedAt: timestamp, overall: 'operational' }, { checkedAt: timestamp, overall: 'down' }], now);
  assert.equal(bins.at(-1).status, 'down');
});
test('monitor exports only public service fields', () => {
  const result = buildSnapshot(healthyProbes(), {}, null, now);
  assert.equal(result.overall, 'operational');
  assert.equal(result.services.LMS.responseMs, 12);
  assert.equal(result.services.DOCKER.status, 'unknown');
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('must never be published'), false);
  assert.equal(serialized.includes('port'), false);
  assert.equal(result.events[0].type, 'initial');
});
test('monitor preserves real history, emits transitions and does not repeat unchanged events', () => {
  const before = buildSnapshot(healthyProbes(), {}, null, now - 60000);
  const unchanged = buildSnapshot(healthyProbes(), {}, before, now);
  assert.equal(unchanged.events.length, 1);
  assert.equal(unchanged.history.length, 2);
  const failed = buildSnapshot({ WEBSITE: service('down'), API: service('down'), STATUS: service('down') }, {}, unchanged, now + 60000);
  assert.equal(failed.events.at(-1).type, 'transition');
  assert.equal(failed.events.at(-1).status, 'down');
  assert.equal(failed.history.length, 3);
});
test('HTML fallback cannot pass a JSON health check', async () => {
  const result = await probe('https://example.org/api/health', 'health', { ...options, fetchImpl: fakeFetch(new Response('<html>PCTU IMS</html>', { status: 200 })) });
  assert.equal(result.status, 'down');
  assert.equal(result.reason, 'invalid_response');
});
test('a 200 JSON response with success=false cannot pass a health check', async () => {
  const result = await probe('https://example.org/health', 'health', { ...options, fetchImpl: fakeFetch(new Response('{"success":false}')) });
  assert.equal(result.status, 'down');
});
test('website check verifies the IMS page rather than accepting any 200', async () => {
  const unrelated = await probe('https://example.org', 'website', { ...options, fetchImpl: fakeFetch(new Response('<html>Proxy error</html>')) });
  assert.equal(unrelated.status, 'down');
  const valid = await probe('https://example.org', 'website', { ...options, fetchImpl: fakeFetch(new Response('<html><title>PCTU IMS</title></html>')) });
  assert.equal(valid.status, 'operational');
});
test('failed HTTP and disconnected networks are persisted rather than crashing monitoring', async () => {
  const http = await probe('https://example.org', 'health', { ...options, fetchImpl: fakeFetch(new Response('unavailable', { status: 503 })) });
  assert.equal(http.reason, 'http_error');
  const disconnected = await probe('https://example.org', 'health', { ...options, fetchImpl: async () => { throw new TypeError('connection refused, private host'); } });
  assert.equal(disconnected.reason, 'network_error');
  assert.equal(JSON.stringify(disconnected).includes('private host'), false);
});
test('timeouts are recorded distinctly from invalid responses', async () => {
  const result = await probe('https://example.org', 'health', { ...options, fetchImpl: async () => { throw new DOMException('Timed out', 'TimeoutError'); } });
  assert.equal(result.status, 'down');
  assert.equal(result.reason, 'timeout');
});
test('transient failures are retried before declaring a service unreachable', async () => {
  let calls = 0;
  const result = await probe('https://example.org', 'health', { attempts: 2, retryDelayMs: 0, fetchImpl: async () => { calls++; if (calls === 1) throw new Error('temporary'); return new Response('{"success":true}'); } });
  assert.equal(calls, 2);
  assert.equal(result.status, 'operational');
});
test('malformed or old status API payloads cannot provide green module status', async () => {
  for (const body of [{ success: true, modules: [] }, { success: true, modules: {}, timestamp }, { success: true, modules: { LMS: { status: 'operational' } }, timestamp: new Date(now - 3600000).toISOString() }]) {
    const result = await probe('https://example.org/status', 'status', { ...options, fetchImpl: fakeFetch(new Response(JSON.stringify(body))) });
    assert.equal(result.status, 'down');
  }
});
test('responses are bounded to prevent oversized health payloads', async () => {
  const result = await probe('https://example.org', 'health', { ...options, fetchImpl: fakeFetch(new Response('x'.repeat(1024 * 1024 + 1))) });
  assert.equal(result.reason, 'invalid_response');
});
test('a redirect to a foreign origin is not treated as healthy', async () => {
  const response = new Response('{"success":true}');
  Object.defineProperty(response, 'url', { value: 'https://foreign.example/health' });
  const result = await probe('https://example.org/health', 'health', { ...options, fetchImpl: fakeFetch(response) });
  assert.equal(result.reason, 'invalid_response');
});
test('all static references work under a GitHub project subpath', async () => {
  const html = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)].map(match => match[1]);
  assert.ok(refs.length >= 4);
  for (const ref of refs) assert.ok((await readFile(new URL(`../site/${ref.slice(2)}`, import.meta.url))).length > 0);
  assert.equal(/(?:src|href)="\/(?!\/)/.test(html), false);
});
