// Public configuration only. Never put tokens, passwords or internal IPs here.
export const config = {
  statusUrl: 'https://statusims.pctu.edu.vn/',
  mainUrl: 'https://ims.pctu.edu.vn',
  websiteUrl: 'https://ims.pctu.edu.vn',
  apiHealthUrl: 'https://apiims.pctu.edu.vn/api/health',
  statusApiUrl: 'https://apiims.pctu.edu.vn/api/status',
  supportEmail: '', // Optional, confirmed public support address.
  refreshSeconds: 60, // Reload the GitHub snapshot; this does not probe the server.
  staleAfterSeconds: 1200,
  timeoutMs: 25000,
  attempts: 2,
  slowResponseMs: 4000,
  timeZone: 'Asia/Ho_Chi_Minh'
};
