import { config } from './config.js';
import { serviceDefinitions, viewSnapshot, historyBins, normalizeStatus, validDate } from './status-model.js';

const translations = {
  vi: {
    skip: 'Đến nội dung chính', university: 'Đại học Phan Châu Trinh', systemStatus: 'Trạng thái hệ thống', serviceCenter: 'TRUNG TÂM TRẠNG THÁI DỊCH VỤ',
    openIms: 'Truy cập IMS', tryIms: 'Thử truy cập IMS', refresh: 'Cập nhật trạng thái', refreshing: 'Đang cập nhật…', independent: 'Trang này hoạt động độc lập với máy chủ IMS.',
    connection: 'KẾT NỐI HỆ THỐNG', identityTagline: 'Đồng hành cùng bạn', teamWorking: 'Đội ngũ kỹ thuật đang khẩn trương khắc phục vấn đề.', hereForYou: 'Thông tin bạn cần, ngay tại đây.', lastCheck: 'Kiểm tra gần nhất', noData: 'Chưa có dữ liệu', atAGlance: 'TỔNG QUAN', servicesTitle: 'Trạng thái các dịch vụ',
    operational: 'Hoạt động', degraded: 'Gián đoạn một phần', down: 'Không truy cập được', unknown: 'Chưa xác định', maintenance: 'Đang bảo trì',
    helpTitle: 'Bạn có thể làm gì?', helpDescription: 'Một vài gợi ý để việc học tập và công việc của bạn tiếp tục thuận lợi.', stepOneTitle: 'Giữ trang này mở', stepOne: 'Trạng thái sẽ tự cập nhật khi có dữ liệu mới.',
    stepTwoTitle: 'Lưu công việc đang làm', stepTwo: 'Giữ bản sao nội dung chưa gửi, nếu có thể.', stepThreeTitle: 'Cần hỗ trợ gấp?', stepThree: 'Liên hệ giảng viên hoặc bộ phận phụ trách nếu bạn đang có bài thi hay hạn nộp.',
    independentTitle: 'Một kênh cập nhật độc lập', independentDescription: 'Bạn vẫn xem được thông tin tại đây khi máy chủ IMS gặp sự cố.',
    monitoringHistory: 'LỊCH SỬ GIÁM SÁT', historyTitle: '24 giờ gần đây', historyNote: 'Chỉ hiển thị kết quả đã ghi nhận', hoursAgo: '23 giờ trước', noDataLegend: 'Màu xám: chưa có dữ liệu', thisHour: 'Giờ hiện tại',
    updatesTitle: 'Cập nhật gần đây', vietnamTime: 'Giờ Việt Nam · UTC+7', goodToKnow: 'THÔNG TIN HỮU ÍCH', faqTitle: 'Giải đáp nhanh', faqIntro: 'Để bạn an tâm hơn trong lúc chờ hệ thống.',
    faqOneTitle: 'Khi nào tôi có thể truy cập lại?', faqOne: 'Khi các dịch vụ hoạt động trở lại, trạng thái sẽ được cập nhật. Nếu chưa có thông báo thời gian khôi phục, chúng tôi chưa thể đưa ra một mốc chính xác.',
    faqTwoTitle: 'Đây là bảo trì hay sự cố máy chủ?', faqTwo: 'Bảo trì theo kế hoạch chỉ được hiển thị khi có cấu hình thông báo. Trạng thái không truy cập được có thể do mạng, dịch vụ hoặc điện nguồn; kiểm tra từ bên ngoài chưa xác định được nguyên nhân.',
    faqThreeTitle: 'Trạng thái có được cập nhật tức thì không?', faqThree: 'GitHub kiểm tra theo lịch dự kiến mỗi 5 phút, sau đó xuất bản dữ liệu. Trang tải lại dữ liệu mỗi 60 giây. Lịch kiểm tra có thể bị trễ; luôn xem thời điểm kiểm tra gần nhất.',
    faqFourTitle: 'Nếu tôi đang thi hoặc có hạn nộp thì sao?', faqFour: 'Lưu nội dung đang làm nếu có thể và ghi lại thời điểm gặp sự cố. Liên hệ giảng viên hoặc bộ phận phụ trách để nhận hướng dẫn cho bài thi hoặc hạn nộp của bạn.',
    footer: 'Đồng hành cùng học tập & quản lý.', footerStatus: 'Trang bảo trì & trạng thái hệ thống', monitorFresh: 'Đang cập nhật tự động', monitorWaiting: 'Đang chờ dữ liệu', monitorStale: 'Dữ liệu cần được cập nhật',
    countdown: n => `Tải lại dữ liệu sau ${n} giây`, emptyEvents: 'Chưa có thay đổi trạng thái được ghi nhận.',
    initialEvent: 'Bắt đầu ghi nhận trạng thái hệ thống.', transitionEvent: state => `Trạng thái hệ thống: ${state}.`, expected: date => `Dự kiến khôi phục: ${date} (có thể thay đổi).`,
    staleNotice: 'Thời điểm kiểm tra không hợp lệ hoặc kết quả không còn đủ mới. Chưa thể xác nhận trạng thái hiện tại; các kết quả cũ không được xem là đang hoạt động.',
    waitingNotice: 'Chưa có kết quả kiểm tra. Trạng thái sẽ được cập nhật ngay khi có dữ liệu mới từ hệ thống giám sát.',
    fetchNotice: 'Chưa tải được dữ liệu mới. Kiểm tra kết nối mạng của bạn; thời điểm kiểm tra gần nhất vẫn được hiển thị bên trên.', offlineNotice: 'Thiết bị của bạn đang ngoại tuyến. Các trạng thái bên dưới không phải kết quả kiểm tra mới.',
    historyLabel: (date, state, count) => `${date}: ${state}${count ? ` · ${count} lần kiểm tra` : ''}`,
    unavailable: 'Chưa kiểm tra được', unknownReason: 'Chưa nhận được kết quả', timeout: 'Không phản hồi trong thời gian kiểm tra', http_error: 'Phản hồi không thành công', invalid_response: 'Phản hồi không hợp lệ', network_error: 'Không kết nối được từ GitHub', not_measured: 'Chưa có phép đo', stale: 'Dữ liệu chưa đủ mới', slow: 'Phản hồi chậm',
    hero: {
      unknown: ['Luôn kết nối.', 'Luôn được cập nhật.', 'Theo dõi tình trạng IMS tại một nơi. Trang đang chờ kết quả kiểm tra từ hệ thống giám sát độc lập.'],
      operational: ['Mọi thứ đã sẵn sàng.', 'Tiếp tục cùng IMS.', 'Các dịch vụ được giám sát đang phản hồi bình thường. Bạn có thể quay lại hệ thống để tiếp tục học tập và làm việc.'],
      maintenance: ['Một chút chờ đợi.', 'Để phục vụ tốt hơn.', 'Đội ngũ kỹ thuật đang khẩn trương bảo trì và kiểm tra hệ thống. Cảm ơn bạn đã kiên nhẫn; chúng tôi sẽ cập nhật thông tin mới ngay tại đây.'],
      down: ['Hệ thống tạm gián đoạn.', 'Chúng tôi đang khắc phục.', 'Hiện chưa kết nối được với website và máy chủ ứng dụng IMS. Đội ngũ kỹ thuật đang nỗ lực xác định nguyên nhân và khôi phục dịch vụ sớm nhất có thể. Cảm ơn bạn đã thông cảm.'],
      degraded: ['Một số dịch vụ gián đoạn.', 'Đội ngũ đang xử lý.', 'Một số dịch vụ đang phản hồi chậm hoặc chưa truy cập được. Đội ngũ kỹ thuật đang khẩn trương kiểm tra và khắc phục vấn đề; bạn có thể theo dõi chi tiết bên dưới.'],
      stale: ['Chờ một cập nhật mới.', 'Chúng tôi vẫn ở đây.', 'Kết quả giám sát gần nhất chưa đủ mới để xác nhận tình trạng hiện tại. Bạn có thể thử truy cập IMS hoặc tải lại dữ liệu sau.']
    }
  },
  en: {
    skip: 'Skip to main content', university: 'Phan Chau Trinh University', systemStatus: 'System status', serviceCenter: 'SERVICE STATUS CENTER',
    openIms: 'Open IMS', tryIms: 'Try opening IMS', refresh: 'Refresh status', refreshing: 'Refreshing…', independent: 'This page runs independently of the IMS server.',
    connection: 'SYSTEM CONNECTION', identityTagline: 'Here for you', teamWorking: 'Our technical team is working hard to restore service.', hereForYou: 'The information you need, right here.', lastCheck: 'Last checked', noData: 'No data yet', atAGlance: 'AT A GLANCE', servicesTitle: 'Service status',
    operational: 'Operational', degraded: 'Partial disruption', down: 'Unreachable', unknown: 'Unknown', maintenance: 'Under maintenance',
    helpTitle: 'What can you do?', helpDescription: 'A few helpful steps to keep your studies and work on track.', stepOneTitle: 'Keep this page open', stepOne: 'Status refreshes automatically when new data is available.',
    stepTwoTitle: 'Save your work', stepTwo: 'Keep a copy of any unsubmitted content, if possible.', stepThreeTitle: 'Need urgent help?', stepThree: 'Contact your lecturer or responsible team if you have an exam or a submission deadline.',
    independentTitle: 'An independent update channel', independentDescription: 'You can still see updates here when the IMS server is unavailable.',
    monitoringHistory: 'MONITORING HISTORY', historyTitle: 'The last 24 hours', historyNote: 'Recorded observations only', hoursAgo: '23 hours ago', noDataLegend: 'Gray: no data available', thisHour: 'Current hour',
    updatesTitle: 'Recent updates', vietnamTime: 'Vietnam time · UTC+7', goodToKnow: 'GOOD TO KNOW', faqTitle: 'Quick answers', faqIntro: 'A little clarity while you wait.',
    faqOneTitle: 'When can I access IMS again?', faqOne: 'Status will update when services become available again. Without a confirmed recovery estimate, we cannot provide an exact time.',
    faqTwoTitle: 'Is this maintenance or a server outage?', faqTwo: 'Scheduled maintenance appears only when a notice has been configured. Unreachable services may be caused by connectivity, services or power; external checks cannot determine the cause.',
    faqThreeTitle: 'Are these real-time updates?', faqThree: 'GitHub is scheduled to check every 5 minutes and then publish the results. This page reloads data every 60 seconds. Checks may be delayed; always look at the last checked time.',
    faqFourTitle: 'What if I have an exam or a deadline?', faqFour: 'Save your work if possible and note when the issue occurred. Contact your lecturer or responsible team for guidance on your exam or deadline.',
    footer: 'Supporting learning & administration.', footerStatus: 'Maintenance & system status', monitorFresh: 'Automatic updates enabled', monitorWaiting: 'Waiting for data', monitorStale: 'Awaiting an updated check',
    countdown: n => `Reloading data in ${n}s`, emptyEvents: 'No status changes have been recorded yet.',
    initialEvent: 'System status monitoring started.', transitionEvent: state => `System status: ${state}.`, expected: date => `Estimated recovery: ${date} (subject to change).`,
    staleNotice: 'The check timestamp is invalid or the results are no longer recent enough. Current status cannot be confirmed; old results are not treated as operational.',
    waitingNotice: 'No checks have been recorded yet. Status will update as soon as new monitoring results are available.',
    fetchNotice: 'New data could not be loaded. Check your connection; the last checked time is still shown above.', offlineNotice: 'Your device is offline. The statuses below are not new check results.',
    historyLabel: (date, state, count) => `${date}: ${state}${count ? ` · ${count} ${count === 1 ? 'check' : 'checks'}` : ''}`,
    unavailable: 'Not checked yet', unknownReason: 'No result received', timeout: 'No response within the check window', http_error: 'Unsuccessful response', invalid_response: 'Invalid response', network_error: 'GitHub could not connect', not_measured: 'No measurement', stale: 'Data is not recent enough', slow: 'Slow response',
    hero: {
      unknown: ['Stay connected.', 'Stay informed.', 'Follow IMS service status in one place. We are waiting for results from the independent monitoring system.'],
      operational: ['Everything is ready.', 'Welcome back to IMS.', 'Monitored services are responding normally. You can return to the platform to continue your studies and work.'],
      maintenance: ['A little pause.', 'A better experience.', 'Our technical team is carrying out maintenance and system checks. Thank you for your patience; the latest updates will appear here.'],
      down: ['Service is interrupted.', 'We’re working on it.', 'The IMS website and application server cannot currently be reached. Our technical team is investigating the cause and working hard to restore service as soon as possible. Thank you for your understanding.'],
      degraded: ['Some services are disrupted.', 'Our team is on it.', 'Some services are responding slowly or cannot be reached. Our technical team is investigating and working to resolve the issue. Follow the service details below for updates.'],
      stale: ['Waiting for an update.', 'Still here for you.', 'The latest monitoring results are not recent enough to confirm current status. You can try opening IMS or reload the data later.']
    }
  }
};

const paths = {
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  book: '<path d="M12 5c-3-2-7-2-10 0v14c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 0Zm0 0v14"/>',
  clipboard: '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="2" width="6" height="5" rx="1"/><path d="m9 14 2 2 4-4"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h6"/>',
  server: '<rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/><path d="M7 7h1m-1 10h1m5-10h4m-4 10h4"/>',
  box: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm-9 5 9 5 9-5m-9 5v10M7.5 4.5l9 5"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>'
};

const $ = id => document.getElementById(id);
let language = 'vi';
try { const saved = localStorage.getItem('ims-status-language'); language = ['vi', 'en'].includes(saved) ? saved : (navigator.language.startsWith('vi') ? 'vi' : 'en'); } catch { /* Storage is optional. */ }
let snapshot = null;
let fetching = false;
let loadFailed = false;
let lastFetch = 0;
let lastState = '';
let lastAnnouncement = '';

function text(key) { return translations[language][key]; }
function dateLabel(value, short = false) {
  if (!validDate(value)) return text('noData');
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: config.timeZone, day: '2-digit', month: '2-digit', ...(short ? {} : { year: 'numeric' }), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function icon(name) {
  const holder = element('span', 'service-icon');
  // Only hardcoded SVG paths are inserted; all remote content uses textContent.
  holder.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
  return holder;
}

function renderServices(view) {
  const rows = [];
  let up = 0;
  for (const def of serviceDefinitions.filter(def => !def.infrastructure)) {
    const service = view.services[def.id];
    if (service.status === 'operational') up++;
    const row = element('div', 'service-row');
    const copy = element('div', 'service-copy');
    copy.append(element('strong', '', def[language]), element('p', '', def[language === 'vi' ? 'descVi' : 'descEn']));
    const result = element('div', 'service-result');
    const state = element('span', `service-state ${service.status}`);
    state.append(element('span', 'dot'), element('span', '', text(service.status)));
    if (service.reason) state.title = text(service.reason) || text('unknownReason');
    result.append(state);
    if (service.responseMs !== null) result.append(element('span', 'service-latency', `${Math.round(service.responseMs).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB')} ms`));
    row.append(icon(def.icon), copy, result);
    rows.push(row);
  }
  $('service-list').replaceChildren(...rows);
  $('service-count').textContent = `${up} / 7 ${language === 'vi' ? 'hoạt động' : 'operational'}`;
}

function renderHistory() {
  $('history-bars').replaceChildren(...historyBins(snapshot?.history).map(bin => {
    const label = text('historyLabel')(dateLabel(new Date(bin.start).toISOString(), true), text(bin.status), bin.count);
    const bar = element('div', `history-bar ${bin.status}`);
    bar.title = label;
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', label);
    bar.tabIndex = 0;
    return bar;
  }));
  const events = (Array.isArray(snapshot?.events) ? snapshot.events : []).filter(item => validDate(item?.at)).slice(-4).reverse();
  $('events').replaceChildren(...(events.length ? events.map(event => {
    const row = element('div', 'event-row');
    const message = event.type === 'initial' ? text('initialEvent') : text('transitionEvent')(text(normalizeStatus(event.status)));
    const time = element('time', '', dateLabel(event.at, true));
    time.dateTime = event.at;
    row.append(element('span', 'dot'), element('p', '', message), time);
    return row;
  }) : [element('p', 'empty-events', text('emptyEvents'))]));
}

function render() {
  const view = viewSnapshot(snapshot);
  const hasTimestamp = validDate(snapshot?.checkedAt);
  const heroState = !view.fresh && hasTimestamp ? 'stale' : view.overall;
  document.body.dataset.state = view.overall;
  document.documentElement.lang = language;
  document.title = `${text('systemStatus')} · PCTU IMS`;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = text(node.dataset.i18n); });
  document.querySelectorAll('[data-language]').forEach(node => { node.setAttribute('aria-pressed', String(node.dataset.language === language)); });
  const hero = text('hero')[heroState];
  const titleSecond = element('span', '', hero[1]);
  $('hero-title').replaceChildren(document.createTextNode(hero[0]), document.createElement('br'), titleSecond);
  const manualMessage = view.maintenance.message?.[language];
  $('hero-description').textContent = view.overall === 'maintenance' && typeof manualMessage === 'string' && manualMessage.trim() ? manualMessage : hero[2];
  $('team-notice').hidden = !['down', 'degraded', 'maintenance'].includes(view.overall);
  $('overall-label').textContent = text(view.overall);
  $('visual-label').textContent = view.overall === 'unknown' ? text('unavailable') : text(view.overall);
  $('monitor-label').textContent = view.fresh ? text('monitorFresh') : hasTimestamp ? text('monitorStale') : text('monitorWaiting');
  $('monitor-label').parentElement.classList.toggle('is-fresh', view.fresh);
  $('last-checked').textContent = dateLabel(snapshot?.checkedAt);
  $('main-link').href = config.mainUrl;
  $('main-link').querySelector('span').textContent = text(view.overall === 'down' || view.overall === 'degraded' ? 'tryIms' : 'openIms');
  const expected = view.overall === 'maintenance' && validDate(view.maintenance.expectedReturnAt) && Date.parse(view.maintenance.expectedReturnAt) > Date.now();
  $('expected-return').hidden = !expected;
  $('expected-return').textContent = expected ? text('expected')(dateLabel(view.maintenance.expectedReturnAt)) : '';
  const notice = !navigator.onLine ? 'offlineNotice' : loadFailed ? 'fetchNotice' : !view.fresh ? (hasTimestamp ? 'staleNotice' : 'waitingNotice') : '';
  $('data-notice').hidden = !notice;
  $('data-notice').textContent = notice ? text(notice) : '';
  $('refresh').disabled = fetching;
  $('refresh').classList.toggle('is-loading', fetching);
  $('refresh').querySelector('span').textContent = text(fetching ? 'refreshing' : 'refresh');
  const email = config.supportEmail.trim();
  $('support-link').hidden = !email;
  if (email) { $('support-link').href = `mailto:${email}`; $('support-link').textContent = language === 'vi' ? 'Liên hệ bộ phận hỗ trợ →' : 'Contact support →'; }
  renderServices(view);
  renderHistory();
  const announcementKey = `${language}:${view.overall}`;
  if (lastAnnouncement !== announcementKey) { $('announcement').textContent = `${text('systemStatus')}: ${text(view.overall)}`; lastAnnouncement = announcementKey; }
  lastState = view.overall;
  renderCountdown();
}

function renderCountdown() {
  const remaining = Math.max(0, config.refreshSeconds - Math.floor((Date.now() - lastFetch) / 1000));
  $('refresh-countdown').textContent = text('countdown')(remaining);
}

async function refresh() {
  if (fetching) return;
  fetching = true;
  lastFetch = Date.now();
  render();
  try {
    const url = new URL('./status.json', import.meta.url);
    url.searchParams.set('t', String(Date.now()));
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000), credentials: 'omit' });
    if (!response.ok) throw new Error('Could not load snapshot');
    const data = await response.json();
    if (data.schemaVersion !== 1 || !data.services || typeof data.services !== 'object' || Array.isArray(data.services)) throw new Error('Invalid snapshot');
    snapshot = data;
    loadFailed = false;
  } catch { loadFailed = true; }
  finally { fetching = false; lastFetch = Date.now(); render(); }
}

document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
  language = button.dataset.language;
  try { localStorage.setItem('ims-status-language', language); } catch { /* Optional preference. */ }
  render();
}));
$('refresh').addEventListener('click', refresh);
window.addEventListener('online', refresh);
window.addEventListener('offline', render);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); if (Date.now() - lastFetch > config.refreshSeconds * 1000) refresh(); } });
setInterval(() => {
  if (document.hidden) return;
  renderCountdown();
  // Re-render at stale boundaries even if the next fetch fails or the device goes offline.
  if (viewSnapshot(snapshot).overall !== lastState) render();
  if (Date.now() - lastFetch >= config.refreshSeconds * 1000) refresh();
}, 1000);
render();
refresh();
