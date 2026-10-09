import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from '../site/config.js';
import { serviceDefinitions, normalizeStatus, overallStatus, validDate, isFresh } from '../site/status-model.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const maxBytes = 1024 * 1024;

async function boundedText(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('invalid_response');
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('invalid_response');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString('utf8');
}

export async function probe(url, kind, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const attempts = options.attempts ?? config.attempts;
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;
  let result;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const started = Date.now();
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: kind === 'website' ? 'text/html' : 'application/json', 'User-Agent': 'PCTU-IMS-Status/1.0' },
        signal: AbortSignal.timeout(timeoutMs), redirect: 'follow', cache: 'no-store'
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('http_error');
      }
      // A redirect to an unrelated site, such as a login or captive portal, is not a successful health check.
      if (response.url && new URL(response.url).origin !== new URL(url).origin) {
        await response.body?.cancel();
        throw new Error('invalid_response');
      }
      const body = await boundedText(response);
      let data;
      if (kind === 'website') {
        if (!/<html(?:\s|>)/i.test(body) || !/PCTU/i.test(body) || !/IMS/i.test(body)) throw new Error('invalid_response');
      } else {
        try { data = JSON.parse(body); } catch { throw new Error('invalid_response'); }
        if (data?.success !== true) throw new Error('invalid_response');
        if (kind === 'status' && (!data.modules || typeof data.modules !== 'object' || Array.isArray(data.modules) || !Object.keys(data.modules).length || !isFresh(data.timestamp))) throw new Error('invalid_response');
      }
      const elapsed = Date.now() - started;
      return { status: elapsed > config.slowResponseMs ? 'degraded' : 'operational', checkedAt: new Date().toISOString(), responseMs: elapsed, ...(elapsed > config.slowResponseMs ? { reason: 'slow' } : {}), data };
    } catch (error) {
      const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
      const known = ['http_error', 'invalid_response'].includes(error.message);
      result = { status: 'down', checkedAt: new Date().toISOString(), responseMs: null, reason: timedOut ? 'timeout' : known ? error.message : 'network_error' };
    }
    if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, options.retryDelayMs ?? 750));
  }
  return result;
}

function safeService(result) {
  return {
    status: normalizeStatus(result.status), checkedAt: result.checkedAt,
    responseMs: Number.isFinite(result.responseMs) && result.responseMs >= 0 ? result.responseMs : null,
    ...(result.reason ? { reason: result.reason } : {})
  };
}

export function buildSnapshot(probes, maintenance = {}, previous = null, now = Date.now()) {
  const checkedAt = new Date(now).toISOString();
  const services = Object.fromEntries(serviceDefinitions.map(def => [def.id, { status: 'unknown', checkedAt, responseMs: null, reason: 'not_measured' }]));
  for (const id of ['WEBSITE', 'API', 'STATUS']) services[id] = safeService(probes[id]);
  const reported = probes.STATUS.data;
  if (reported?.success === true && reported.modules && isFresh(reported.timestamp, now)) {
    for (const def of serviceDefinitions.filter(s => !s.infrastructure && !['WEBSITE', 'API', 'STATUS'].includes(s.id))) {
      const item = reported.modules[def.id];
      if (!item || typeof item !== 'object') continue;
      const timestamp = item.lastChecked || reported.timestamp;
      const responseMatch = typeof item.responseTime === 'string' ? /^(\d+(?:\.\d+)?)ms$/.exec(item.responseTime) : null;
      const responseMs = Number.isFinite(item.responseMs) ? item.responseMs : responseMatch ? Number(responseMatch[1]) : null;
      services[def.id] = safeService({ status: isFresh(timestamp, now) ? item.status : 'unknown', checkedAt: timestamp, responseMs, ...(isFresh(timestamp, now) ? {} : { reason: 'stale' }) });
    }
  }
  const overall = overallStatus(services, maintenance, now);
  const previousValid = previous?.schemaVersion === 1 && validDate(previous.checkedAt) && Date.parse(previous.checkedAt) <= now && previous.services && typeof previous.services === 'object';
  const history = (previousValid && Array.isArray(previous.history) ? previous.history : []).filter(item => validDate(item?.checkedAt) && Date.parse(item.checkedAt) >= now - 24 * 3600000 && Date.parse(item.checkedAt) < now).slice(-287).map(item => ({ checkedAt: item.checkedAt, overall: normalizeStatus(item.overall) }));
  history.push({ checkedAt, overall });
  const events = (previousValid && Array.isArray(previous.events) ? previous.events : []).filter(item => validDate(item?.at) && Date.parse(item.at) <= now && ['initial', 'transition'].includes(item.type)).slice(-39).map(item => ({ at: item.at, type: item.type, status: normalizeStatus(item.status) }));
  if (!previousValid) events.push({ at: checkedAt, type: 'initial', status: overall });
  else if (normalizeStatus(previous.overall) !== overall) events.push({ at: checkedAt, type: 'transition', status: overall });
  // Only a small public schema is exported. Raw health payloads, addresses and error messages stay out of Pages.
  return { schemaVersion: 1, checkedAt, overall, services, maintenance, history, events };
}

export function sanitizeMaintenance(value) {
  if (!value || typeof value !== 'object' || typeof value.active !== 'boolean') throw new Error('maintenance.json must contain an active boolean');
  for (const field of ['startsAt', 'endsAt', 'expectedReturnAt']) {
    if (value[field] != null && !validDate(value[field])) throw new Error(`Invalid maintenance ${field}: use an ISO timestamp with timezone`);
    if (value[field] && !/(Z|[+-]\d{2}:\d{2})$/.test(value[field])) throw new Error(`Maintenance ${field} must include a timezone`);
  }
  if (value.startsAt && value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt)) throw new Error('Maintenance endsAt must be later than startsAt');
  return { active: value.active, startsAt: value.startsAt ?? null, endsAt: value.endsAt ?? null, expectedReturnAt: value.expectedReturnAt ?? null, message: { vi: typeof value.message?.vi === 'string' ? value.message.vi.slice(0, 1000) : '', en: typeof value.message?.en === 'string' ? value.message.en.slice(0, 1000) : '' } };
}

function pagesBaseUrl() {
  if (process.env.STATUS_SITE_URL) return process.env.STATUS_SITE_URL.replace(/\/?$/, '/');
  if (config.statusUrl) return config.statusUrl;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return null;
  const [owner, repo] = repository.split('/');
  return `https://${owner.toLowerCase()}.github.io/${repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '' : `${repo}/`}`;
}

async function previousSnapshot() {
  const base = pagesBaseUrl();
  if (!base) return null;
  try {
    const url = new URL('status.json', base);
    if (url.protocol !== 'https:') return null;
    url.searchParams.set('t', String(Date.now()));
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) { await response.body?.cancel(); return null; }
    return JSON.parse(await boundedText(response));
  } catch { return null; } // First deployment has no previous snapshot.
}

async function main() {
  const output = path.resolve(root, process.argv[2] || 'dist/status.json');
  if (!output.startsWith(`${root}${path.sep}`) && !output.startsWith(root)) throw new Error('Output must be inside this project');
  const maintenance = sanitizeMaintenance(JSON.parse(await readFile(path.join(root, 'site/maintenance.json'), 'utf8')));
  const [WEBSITE, API, STATUS, previous] = await Promise.all([
    probe(config.websiteUrl, 'website'), probe(config.apiHealthUrl, 'health'), probe(config.statusApiUrl, 'status'), previousSnapshot()
  ]);
  const result = buildSnapshot({ WEBSITE, API, STATUS }, maintenance, previous);
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Snapshot saved: ${result.checkedAt}; overall=${result.overall}`);
  for (const [id, service] of Object.entries(result.services)) console.log(`${id}: ${service.status}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
