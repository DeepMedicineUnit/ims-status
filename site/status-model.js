import { config } from './config.js';

export const serviceDefinitions = [
  { id: 'WEBSITE', icon: 'globe', vi: 'Cổng thông tin IMS', en: 'IMS web portal', descVi: 'Truy cập hệ thống dành cho người dùng', descEn: 'Your access to the IMS platform' },
  { id: 'API', icon: 'layers', vi: 'Máy chủ ứng dụng', en: 'Application server', descVi: 'Kết nối và xử lý yêu cầu', descEn: 'Connectivity and request processing' },
  { id: 'STATUS', icon: 'activity', vi: 'Dịch vụ giám sát', en: 'Monitoring service', descVi: 'Kiểm tra sức khỏe các dịch vụ IMS', descEn: 'Health checks for IMS services' },
  { id: 'LMS', icon: 'book', vi: 'Hệ thống học tập', en: 'Learning management', descVi: 'Khóa học và tài liệu học tập', descEn: 'Courses and learning resources' },
  { id: 'TESTING', icon: 'clipboard', vi: 'Khảo thí & kiểm tra', en: 'Examinations & assessments', descVi: 'Bài thi và hoạt động khảo thí', descEn: 'Exams and assessment activities' },
  { id: 'STUDENT', icon: 'users', vi: 'Sinh viên & điểm danh', en: 'Students & attendance', descVi: 'Thông tin sinh viên và buổi học', descEn: 'Student information and class sessions' },
  { id: 'DOCUMENTS', icon: 'file', vi: 'Quản lý tài liệu', en: 'Document management', descVi: 'Lưu trữ và truy cập tài liệu', descEn: 'Document storage and access' },
  { id: 'HOST', icon: 'server', vi: 'Máy chủ vật lý', en: 'Physical server', infrastructure: true },
  { id: 'DOCKER', icon: 'box', vi: 'Docker', en: 'Docker', infrastructure: true },
  { id: 'DATABASE', icon: 'database', vi: 'Cơ sở dữ liệu', en: 'Database', infrastructure: true }
];

const allowed = new Set(['operational', 'degraded', 'down', 'unknown', 'maintenance']);
export function normalizeStatus(value) {
  if (value === 'online') return 'operational';
  if (value === 'offline' || value === 'major_outage') return 'down';
  if (value === 'partial_outage') return 'degraded';
  return allowed.has(value) ? value : 'unknown';
}

export function validDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function isFresh(value, now = Date.now()) {
  if (!validDate(value)) return false;
  const age = now - Date.parse(value);
  return age >= -60000 && age <= config.staleAfterSeconds * 1000;
}

export function maintenanceIsActive(value, now = Date.now()) {
  if (value?.active !== true) return false;
  if (value.startsAt && (!validDate(value.startsAt) || Date.parse(value.startsAt) > now)) return false;
  if (value.endsAt && (!validDate(value.endsAt) || Date.parse(value.endsAt) <= now)) return false;
  return true;
}

export function overallStatus(services, maintenance = {}, now = Date.now()) {
  if (maintenanceIsActive(maintenance, now)) return 'maintenance';
  const website = normalizeStatus(services?.WEBSITE?.status);
  const api = normalizeStatus(services?.API?.status);
  if (website === 'down' && api === 'down') return 'down';
  const states = serviceDefinitions.filter(s => !s.infrastructure).map(s => normalizeStatus(services?.[s.id]?.status));
  if (states.some(s => s === 'down' || s === 'degraded' || s === 'maintenance')) return 'degraded';
  if (states.some(s => s === 'unknown')) return 'unknown';
  return 'operational';
}

// Treat stale data as unknown. A green result is never kept indefinitely.
export function viewSnapshot(snapshot, now = Date.now()) {
  const fresh = isFresh(snapshot?.checkedAt, now);
  const services = Object.fromEntries(serviceDefinitions.map(def => {
    const service = snapshot?.services?.[def.id];
    const usable = fresh && isFresh(service?.checkedAt, now);
    return [def.id, {
      status: usable ? normalizeStatus(service.status) : 'unknown',
      checkedAt: service?.checkedAt ?? null,
      responseMs: usable && Number.isFinite(service.responseMs) && service.responseMs >= 0 ? service.responseMs : null,
      reason: usable ? service.reason : (fresh ? 'not_measured' : 'stale')
    }];
  }));
  const maintenance = fresh ? (snapshot?.maintenance ?? {}) : {};
  return { fresh, services, maintenance, overall: overallStatus(services, maintenance, now) };
}

export function historyBins(history, now = Date.now()) {
  const hour = 3600000;
  const end = Math.floor(now / hour) * hour;
  const severity = { operational: 0, unknown: 1, maintenance: 2, degraded: 3, down: 4 };
  return Array.from({ length: 24 }, (_, index) => {
    const start = end - (23 - index) * hour;
    const samples = (Array.isArray(history) ? history : []).filter(item => validDate(item.checkedAt) && Date.parse(item.checkedAt) >= start && Date.parse(item.checkedAt) < start + hour);
    const state = samples.reduce((worst, item) => severity[normalizeStatus(item.overall)] > severity[worst] ? normalizeStatus(item.overall) : worst, samples.length ? 'operational' : 'unknown');
    return { start, status: state, count: samples.length };
  });
}
