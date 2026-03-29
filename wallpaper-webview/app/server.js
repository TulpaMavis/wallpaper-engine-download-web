'use strict';
/*
  WallHub server.js v4.1
  ─────────────────────────────────────────────────────────────────
  两步策略:
    1. 抓 workshop/browse HTML → 提取 FileID 列表 (带详细调试)
    2. POST GetPublishedFileDetails (无需key) → 批量拿真实数据
    
  调试接口: GET /api/debug  →  查看原始HTML结构
*/

const http   = require('http');
const https  = require('https');
const tls    = require('tls');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const { spawn, execFileSync } = require('child_process');
const { URL } = require('url');

const PORT   = process.env.PORT ? parseInt(process.env.PORT) : 3090;
const PUBLIC = path.join(__dirname, 'public');

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// 下载队列管理全局状态 ---
const TASK_QUEUE = [];
let ACTIVE_TASK = null;
let queueProcessorRunning = false;

// Docker 全局网速监控
let lastRxBytes = 0;
let lastNetTime = Date.now();
let currentRxSpeed = 0;
setInterval(() => {
  try {
    const dev = fs.readFileSync('/proc/net/dev', 'utf8');
    const lines = dev.split('\n');
    let totalRx = 0;
    for (let i = 2; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length > 1 && !parts[0].startsWith('lo')) {
        totalRx += parseInt(parts[1]) || 0; // 累计接收字节数
      }
    }
    const now = Date.now();
    if (lastRxBytes > 0 && now > lastNetTime) {
      currentRxSpeed = (totalRx - lastRxBytes) / ((now - lastNetTime) / 1000);
    }
    lastRxBytes = totalRx;
    lastNetTime = now;
  } catch (e) {
    currentRxSpeed = 0; // 非 Linux(Docker) 环境或读取失败时归零
  }
}, 1000);

const PERSONA_CACHE = new Map();
const STEAM_CREDENTIALS = { username: '', password: '', steamGuardCode: '', isPersistent: false };

// 根据操作系统设置 Steam 配置目录
// Windows: 项目根目录/steamcmd
// Linux: /root/Steam (Docker 环境)
const getDefaultSteamConfigDir = () => {
  if (process.platform === 'win32') {
    return path.join(__dirname, 'steamcmd');
  }
  return '/root/Steam';
};
const STEAM_CONFIG_DIR = process.env.STEAM_CONFIG_DIR || getDefaultSteamConfigDir();
const WORKSHOP_CACHE_DIR = path.join(STEAM_CONFIG_DIR, 'steamapps', 'workshop', 'content', '431960');
const CACHE_SETTINGS_FILE = path.join(__dirname, 'cache-settings.json');
let VIDEO_CACHE_SETTINGS = { steamApiKey: '', useSteamApi: false }; // Default settings

// 确保 Steam 配置目录存在
function ensureSteamConfigDir() {
  try {
    if (!fs.existsSync(STEAM_CONFIG_DIR)) {
      fs.mkdirSync(STEAM_CONFIG_DIR, { recursive: true });
      console.log(`[Steam] Created config directory: ${STEAM_CONFIG_DIR}`);
    }
  } catch (e) {
    console.warn('[Steam] Failed to create config directory:', e.message);
  }
}

// Load cache settings from file
function loadCacheSettings() {
  try {
    if (fs.existsSync(CACHE_SETTINGS_FILE)) {
      const data = fs.readFileSync(CACHE_SETTINGS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      VIDEO_CACHE_SETTINGS = Object.assign(
        { steamApiKey: '', useSteamApi: false },
        parsed || {}
      );
      console.log(`[Settings] Loaded Steam API settings`);
    }
  } catch (e) {
    console.warn('[Settings] Failed to load settings:', e.message);
  }
}

// Save cache settings to file
function saveCacheSettings() {
  try {
    fs.writeFileSync(CACHE_SETTINGS_FILE, JSON.stringify(VIDEO_CACHE_SETTINGS, null, 2));
    console.log(`[Settings] Saved Steam API settings`);
  } catch (e) {
    console.warn('[Settings] Failed to save settings:', e.message);
  }
}

const STEAM_PREF_COOKIE = [
  'birthtime=946684801',
  'lastagecheckage=1-January-2000',
  'mature_content=1',
  'wants_mature_content=1',
  'wants_mature_content_violence=1',
  'wants_mature_content_sex=1',
  'wants_adult_content=1',
  'wants_adult_content_violence=1',
  'wants_adult_content_sex=1',
  'wants_community_generated_adult_content=1',
  process.env.STEAM_COUNTRY ? `steamCountry=${process.env.STEAM_COUNTRY}` : '',
  `Steam_Language=${process.env.STEAM_LANG || 'schinese'}`,
  'timezoneOffset=28800,0',
].filter(Boolean).join('; ');

// ─── Steam 持久化登录检测 ────────────────────────────────────────
function checkSteamPersistentLogin() {
  try {
    // 检查 Steam 配置目录是否存在
    if (!fs.existsSync(STEAM_CONFIG_DIR)) {
      console.log('[Steam Persistent] Steam config directory not found:', STEAM_CONFIG_DIR);
      return null;
    }

    // 检查关键文件是否存在
    const configVdf = path.join(STEAM_CONFIG_DIR, 'config', 'config.vdf');
    const loginUsersVdf = path.join(STEAM_CONFIG_DIR, 'config', 'loginusers.vdf');
    
    if (!fs.existsSync(configVdf) && !fs.existsSync(loginUsersVdf)) {
      console.log('[Steam Persistent] No Steam config files found');
      return null;
    }

    // 尝试从 loginusers.vdf 读取最后登录的用户
    if (fs.existsSync(loginUsersVdf)) {
      try {
        const content = fs.readFileSync(loginUsersVdf, 'utf8');
        // 查找 "AccountName" 字段
        const accountMatch = content.match(/"AccountName"\s+"([^"]+)"/i);
        if (accountMatch && accountMatch[1]) {
          const username = accountMatch[1].trim();
          console.log(`[Steam Persistent] Found persistent login for user: ${username}`);
          return {
            username: username,
            isPersistent: true
          };
        }
      } catch (e) {
        console.warn('[Steam Persistent] Failed to read loginusers.vdf:', e.message);
      }
    }

    // 检查 steamapps 目录是否存在（表示 Steam 已初始化）
    const steamappsDir = path.join(STEAM_CONFIG_DIR, 'steamapps');
    if (fs.existsSync(steamappsDir)) {
      console.log('[Steam Persistent] Steam directory initialized but no user found');
      return { isPersistent: true, username: '' };
    }

    return null;
  } catch (e) {
    console.warn('[Steam Persistent] Error checking persistent login:', e.message);
    return null;
  }
}

// 初始化时检测持久化登录
function initializeSteamCredentials() {
  // 优先从我们自己的 settings 中读取持久化状态，彻底解决 Docker 重启丢失的问题
  if (VIDEO_CACHE_SETTINGS.steamUsername && VIDEO_CACHE_SETTINGS.steamIsPersistent) {
    STEAM_CREDENTIALS.username = VIDEO_CACHE_SETTINGS.steamUsername;
    STEAM_CREDENTIALS.isPersistent = true;
    STEAM_CREDENTIALS.password = '';
    STEAM_CREDENTIALS.steamGuardCode = '';
    console.log(`[Steam Init] Loaded persistent login from settings: ${STEAM_CREDENTIALS.username}`);
    return;
  }

  const persistent = checkSteamPersistentLogin();
  if (persistent && persistent.username) {
    STEAM_CREDENTIALS.username = persistent.username;
    STEAM_CREDENTIALS.isPersistent = true;
    STEAM_CREDENTIALS.password = ''; // 持久化登录不需要密码
    STEAM_CREDENTIALS.steamGuardCode = '';
    console.log(`[Steam Init] Loaded persistent login: ${persistent.username}`);
  } else {
    console.log('[Steam Init] No persistent login found, using anonymous or env credentials');
  }
}

// ─── CORS + helpers ────────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function send(res, code, body, ct) {
  cors(res);
  res.writeHead(code, { 'Content-Type': ct || 'text/plain; charset=utf-8' });
  res.end(body);
}
function jsonRes(res, code, obj) {
  send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8');
}
function readBody(req) {
  return new Promise((res, rej) => {
    let s = '';
    req.on('data', c => s += c);
    req.on('end',  () => res(s));
    req.on('error', rej);
  });
}
function mimeType(p) {
  return ({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
           '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
           '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'}
          [path.extname(p).toLowerCase()]) || 'application/octet-stream';
}

// ─── HTTP ──────────────────────────────────────────────────────────
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function parseProxyUrl(raw) {
  if (!raw) return null;
  let v = String(raw).trim();
  if (!v) return null;
  if (!/^[a-z]+:\/\//i.test(v)) v = `http://${v}`;
  try {
    const u = new URL(v);
    if (!u.hostname) return null;
    return {
      protocol: (u.protocol || 'http:').toLowerCase(),
      hostname: u.hostname,
      port: u.port ? parseInt(u.port) : ((u.protocol || '').toLowerCase() === 'https:' ? 443 : 80),
      username: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
    };
  } catch {
    return null;
  }
}
function parseWinProxyServer(raw, protocol) {
  const v = String(raw || '').trim();
  if (!v) return null;
  const map = {};
  for (const seg of v.split(';').map(s => s.trim()).filter(Boolean)) {
    const m = seg.match(/^([^=]+)=(.+)$/);
    if (m) map[m[1].toLowerCase()] = m[2].trim();
  }
  const key = protocol === 'https:' ? 'https' : 'http';
  const pick = map[key] || map.http || map.https || (Object.keys(map).length ? '' : v);
  return parseProxyUrl(pick);
}
function readWindowsSystemProxy(protocol) {
  if (process.platform !== 'win32') return null;
  try {
    const enable = execFileSync(
      'reg.exe',
      ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', '/v', 'ProxyEnable'],
      { encoding: 'utf8' }
    );
    if (!/\b0x1\b/i.test(enable)) return null;
    const server = execFileSync(
      'reg.exe',
      ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', '/v', 'ProxyServer'],
      { encoding: 'utf8' }
    );
    const m = server.match(/ProxyServer\s+REG_\w+\s+([^\r\n]+)/i);
    return m ? parseWinProxyServer(m[1], protocol) : null;
  } catch {
    return null;
  }
}

function readLinuxSystemProxy(protocol) {
  if (process.platform !== 'linux') return null;
  try {
    const isHttps = protocol === 'https:';
    const proxyEnv = isHttps 
      ? (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy)
      : (process.env.HTTP_PROXY || process.env.http_proxy);
    
    console.log('readLinuxSystemProxy', proxyEnv);
    if (proxyEnv) {
      return parseProxyUrl(proxyEnv);
    }

    const gsettings = execFileSync('which', ['gsettings'], { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (gsettings) {
      try {
        const mode = execFileSync('gsettings', ['get', 'org.gnome.system.proxy', 'mode'], { encoding: 'utf8' }).trim();
        if (mode.includes('manual')) {
          const httpHost = execFileSync('gsettings', ['get', 'org.gnome.system.proxy.http', 'host'], { encoding: 'utf8' }).trim().replace(/['"]/g, '');
          const httpPort = parseInt(execFileSync('gsettings', ['get', 'org.gnome.system.proxy.http', 'port'], { encoding: 'utf8' }).trim()) || 8080;
          
          if (httpHost && httpPort) {
            const proxyUrl = `http://${httpHost}:${httpPort}`;
            return parseProxyUrl(proxyUrl);
          }
        }
      } catch (e) {
        console.log(e);
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
function resolveProxyForProtocol(protocol) {
  const isHttps = protocol === 'https:';
  const envRaw = isHttps
    ? (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || process.env.ALL_PROXY || process.env.all_proxy || '')
    : (process.env.HTTP_PROXY || process.env.http_proxy || process.env.ALL_PROXY || process.env.all_proxy || '');
  return parseProxyUrl(envRaw) || readWindowsSystemProxy(protocol) || readLinuxSystemProxy(protocol);
}
function proxyAuth(proxy) {
  if (!proxy || !proxy.username) return '';
  const token = Buffer.from(`${proxy.username}:${proxy.password || ''}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}
function formatProxyUrl(proxy) {
  if (!proxy || !proxy.hostname) return '';
  const auth = proxy.username
    ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password || '')}@`
    : '';
  return `http://${auth}${proxy.hostname}:${proxy.port || 80}`;
}
function proxyKey(proxy) {
  if (!proxy) return 'direct';
  return `${proxy.protocol || 'http:'}|${proxy.hostname}|${proxy.port || 80}|${proxy.username || ''}|${proxy.password || ''}`;
}
function getProxyCandidates(protocol, hostname) {
  const list = [];
  const add = (p) => { if (p && p.hostname) list.push(p); };
  const customProxyHost = String(process.env.WALLHUB_PROXY_HOST || '').trim();
  add(parseProxyUrl(process.env.WALLHUB_PROXY || process.env.wallhub_proxy || ''));
  const resolved = resolveProxyForProtocol(protocol);
  add(resolved);
  if (customProxyHost && resolved && /^(127\.0\.0\.1|localhost)$/i.test(resolved.hostname)) {
    add(parseProxyUrl(`http://${customProxyHost}:${resolved.port || 80}`));
  }
  const extraPortsRaw = String(process.env.WALLHUB_PROXY_PORTS || '').trim();
  if (extraPortsRaw && process.platform === 'win32') {
    const ports = extraPortsRaw
      .split(',')
      .map(s => parseInt(String(s).trim()))
      .filter(n => n > 0 && n < 65536);
    const hosts = customProxyHost ? ['127.0.0.1', 'localhost', customProxyHost] : ['127.0.0.1', 'localhost'];
    for (const p of ports) {
      for (const h of hosts) add(parseProxyUrl(`http://${h}:${p}`));
    }
  }
  const seen = new Set();
  const uniq = [];
  for (const p of list) {
    const k = proxyKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(p);
  }
  if (!(isSteamHost(hostname) && uniq.length > 0)) uniq.push(null);
  return uniq;
}
function shouldRetryWithNextProxy(err) {
  if (!err) return false;
  if (err.code && ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'EPROTO'].includes(err.code)) return true;
  const m = String(err.message || '');
  return /Proxy CONNECT|ECONNREFUSED|ETIMEDOUT|socket hang up/i.test(m);
}
function isSteamHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h.includes('steamcommunity.com') || h.includes('steampowered.com') || h.includes('steamusercontent.com');
}
function buildUrlFromOpts(opts) {
  const protocol = opts.protocol || 'https:';
  const port = opts.port ? `:${opts.port}` : '';
  return `${protocol}//${opts.hostname}${port}${opts.path || '/'}`;
}

function doRequestByCurl(opts, body, timeout, proxy) {
  return new Promise((resolve, reject) => {
    const url = buildUrlFromOpts(opts);
    const args = [
      '--silent',
      '--show-error',
      '--location',
      '--max-time', String(Math.max(8, Math.ceil((timeout || 22000) / 1000))),
      '--request', opts.method || 'GET',
      '--url', url,
      '--output', '-',
      '--write-out', '\n__WALLHUB_HTTP_CODE__:%{http_code}',
    ];
    if (proxy && proxy.hostname) args.push('--proxy', formatProxyUrl(proxy));
    const headers = opts.headers || {};
    for (const [k, v] of Object.entries(headers)) {
      if (v === undefined || v === null || v === '') continue;
      args.push('-H', `${k}: ${String(v)}`);
    }
    if (body && String(opts.method || 'GET').toUpperCase() !== 'GET') {
      const payload = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
      args.push('--data-binary', payload);
    }

    const curlCommand = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const cp = spawn(curlCommand, args, { windowsHide: true, env: Object.assign({}, process.env) });
    const chunks = [];
    let err = '';
    cp.stdout.on('data', d => chunks.push(Buffer.from(d)));
    cp.stderr.on('data', d => err += d.toString());
    cp.on('error', e => reject(e));
    cp.on('close', code => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const marker = '\n__WALLHUB_HTTP_CODE__:';
      const idx = raw.lastIndexOf(marker);
      const httpCode = idx >= 0 ? parseInt(raw.slice(idx + marker.length).trim()) : 0;
      const bodyText = idx >= 0 ? raw.slice(0, idx) : raw;
      if (code !== 0) return reject(new Error((err || `curl exit ${code}`).trim().slice(-1200)));
      if (httpCode < 200 || httpCode >= 300) return reject(new Error(`HTTP ${httpCode || 502}`));
      resolve(Buffer.from(bodyText, 'utf8'));
    });
  });
}
function doRequestByCurlCascade(opts, body, timeout, proxies, idx) {
  const i = idx || 0;
  const proxy = proxies[Math.min(i, proxies.length - 1)];
  return doRequestByCurl(opts, body, timeout, proxy).catch((e) => {
    if (shouldRetryWithNextProxy(e) && i + 1 < proxies.length) {
      return doRequestByCurlCascade(opts, body, timeout, proxies, i + 1);
    }
    throw e;
  });
}
const AUTO_PROXY = resolveProxyForProtocol('https:') || resolveProxyForProtocol('http:');
if (AUTO_PROXY) {
  const auto = formatProxyUrl(AUTO_PROXY);
  if (auto) {
    if (!process.env.HTTP_PROXY && !process.env.http_proxy) {
      process.env.HTTP_PROXY = auto;
      process.env.http_proxy = auto;
    }
    if (!process.env.HTTPS_PROXY && !process.env.https_proxy) {
      process.env.HTTPS_PROXY = auto;
      process.env.https_proxy = auto;
    }
    if (!process.env.ALL_PROXY && !process.env.all_proxy) {
      process.env.ALL_PROXY = auto;
      process.env.all_proxy = auto;
    }
  }
}

function doRequest(opts, body, redirects, proxyIndex) {
  const redirectCount = redirects || 0;
  const currentProxyIndex = proxyIndex || 0;
  const protocol = opts.protocol || 'https:';
  const timeout = opts.timeout || 22000;
  const proxies = getProxyCandidates(protocol, opts.hostname);
  const proxy = proxies[Math.min(currentProxyIndex, proxies.length - 1)];
  const attemptTimeout = proxy ? Math.min(timeout, 12000) : timeout;
  if (process.env.WALLHUB_DISABLE_CURL_PROXY !== '1') {
    return doRequestByCurlCascade(opts, body, attemptTimeout, proxies, currentProxyIndex);
  }
  return new Promise((resolve, reject) => {
    const retryNext = (err) => {
      if (shouldRetryWithNextProxy(err) && currentProxyIndex + 1 < proxies.length) {
        return doRequest(opts, body, redirectCount, currentProxyIndex + 1).then(resolve).catch(reject);
      }
      reject(err);
    };

    const onResponse = (rs) => {
      if (rs.statusCode >= 300 && rs.statusCode < 400 && rs.headers.location) {
        rs.resume();
        if (redirectCount >= 3) return reject(new Error('Too many redirects'));
        let loc = rs.headers.location;
        if (!/^https?:\/\//i.test(loc)) loc = `${protocol}//${opts.hostname}${loc}`;
        try {
          const u = new URL(loc);
          return doRequest({
            protocol: u.protocol,
            hostname: u.hostname,
            port: u.port ? parseInt(u.port) : undefined,
            path: u.pathname + u.search,
            method: 'GET',
            headers: opts.headers,
            timeout,
          }, null, redirectCount + 1, 0)
            .then(resolve).catch(reject);
        } catch(e) { return reject(e); }
      }
      if (rs.statusCode < 200 || rs.statusCode >= 300) { rs.resume(); return reject(new Error(`HTTP ${rs.statusCode}`)); }
      const bufs = [];
      rs.on('data', d => bufs.push(d));
      rs.on('end',  () => resolve(Buffer.concat(bufs)));
      rs.on('error', retryNext);
    };
    const onError = (e) => retryNext(e);
    const writeEnd = (req) => {
      req.on('error', onError);
      req.on('timeout', () => req.destroy(new Error('Timeout')));
      if (body) req.write(body);
      req.end();
    };
    
    if (!proxy) {
      const mod = protocol === 'http:' ? http : https;
      const req = mod.request({
        protocol,
        hostname: opts.hostname,
        port: opts.port || (protocol === 'http:' ? 80 : 443),
        path: opts.path,
        method: opts.method || 'GET',
        headers: opts.headers || {},
        timeout: attemptTimeout,
      }, onResponse);
      writeEnd(req);
      return;
    }
    const auth = proxyAuth(proxy);
    if (protocol === 'http:') {
      const headers = Object.assign({}, opts.headers || {});
      if (auth) headers['Proxy-Authorization'] = auth;
      const fullPath = `${protocol}//${opts.hostname}${opts.port ? `:${opts.port}` : ''}${opts.path || '/'}`;
      const req = http.request({
        hostname: proxy.hostname,
        port: proxy.port || 80,
        method: opts.method || 'GET',
        path: fullPath,
        headers,
        timeout: attemptTimeout,
      }, onResponse);
      writeEnd(req);
      return;
    }
    
    const connectHeaders = {};
    if (auth) connectHeaders['Proxy-Authorization'] = auth;
    const connectReq = http.request({
      hostname: proxy.hostname,
      port: proxy.port || 80,
      method: 'CONNECT',
      path: `${opts.hostname}:${opts.port || 443}`,
      headers: connectHeaders,
      timeout: attemptTimeout,
    });
    
    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        return reject(new Error(`Proxy CONNECT ${res.statusCode}`));
      }
      const secureSocket = tls.connect({
        socket,
        servername: opts.hostname,
      });
      secureSocket.on('error', onError);
      const req = https.request({
        hostname: opts.hostname,
        port: opts.port || 443,
        path: opts.path,
        method: opts.method || 'GET',
        headers: opts.headers || {},
        createConnection: () => secureSocket,
        agent: false,
        timeout: attemptTimeout,
      }, onResponse);
      writeEnd(req);
    });
    connectReq.on('error', onError);
    connectReq.on('timeout', () => connectReq.destroy(new Error('Timeout')));
    connectReq.end();
  });
}

function GET(url, extra, timeout) {
  const u = new URL(url);
  return doRequest({
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port ? parseInt(u.port) : undefined,
    path: u.pathname + u.search,
    method: 'GET',
    headers: Object.assign({
      'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9', 'Accept-Encoding': 'identity',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Cookie': STEAM_PREF_COOKIE,
    }, extra || {}),
    timeout: timeout || 22000,
  });
}

function POST(url, body, timeout) {
  const u   = new URL(url);
  const buf = Buffer.from(body, 'utf8');
  return doRequest({
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port ? parseInt(u.port) : undefined,
    path: u.pathname + u.search,
    method: 'POST',
    headers: {
      'User-Agent': UA, 'Accept-Encoding': 'identity', 'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': buf.length,
    },
    timeout: timeout || 22000,
  }, buf);
}

// ─────────────────────────────────────────────────────────────────
//  GetPublishedFileDetails (POST, no API key required!)
//  Returns: preview_url, title, subscriptions, views, favorited, file_size, tags, etc.
// ─────────────────────────────────────────────────────────────────
async function getFileDetails(ids, timeoutMs) {
  if (!ids.length) return [];
  const parts = [`itemcount=${ids.length}`];
  ids.forEach((id, i) => parts.push(`publishedfileids%5B${i}%5D=${id}`));
  
  console.log(`[FileDetails] POST for ${ids.length} ids: ${ids.slice(0,3).join(',')}...`);
  
  const buf  = await POST(
    'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/',
    parts.join('&'), timeoutMs || 25000
  );
  const data = JSON.parse(buf.toString('utf8'));
  const list = (data.response && data.response.publishedfiledetails) || [];
  
  const withThumb = list.filter(d => d.preview_url).length;
  console.log(`[FileDetails] Got ${list.length} records, ${withThumb} with preview_url`);
  if (list[0]) {
    console.log(`[FileDetails] Sample[0]: title="${list[0].title}", preview="${list[0].preview_url ? list[0].preview_url.substring(0,60)+'...' : 'NONE'}"`);
  }
  
  return list;
}
async function getFileDetailsSafe(ids) {
  const uniqIds = Array.from(new Set((ids || []).map(v => String(v).trim()).filter(Boolean)));
  if (!uniqIds.length) return [];
  let list = [];
  try {
    list = await getFileDetails(uniqIds, 9000);
  } catch (e) {
    console.warn('[FileDetails] Batch failed:', e.message);
  }
  const okCount = list.filter(d => d && d.result === 1).length;
  if (okCount > 0 || uniqIds.length <= 3) return list;
  const merged = {};
  const chunkSize = 8;
  const chunks = [];
  for (let i = 0; i < uniqIds.length; i += chunkSize) chunks.push(uniqIds.slice(i, i + chunkSize));
  const parts = await Promise.all(chunks.map((chunk, idx) =>
    getFileDetails(chunk, 7000).catch((e) => {
      console.warn(`[FileDetails] Chunk ${idx + 1} failed:`, e.message);
      return [];
    })
  ));
  parts.forEach(part => part.forEach(d => { if (d && d.publishedfileid) merged[String(d.publishedfileid)] = d; }));
  const fallbackList = uniqIds.map(id => merged[id]).filter(Boolean);
  console.log(`[FileDetails] Safe fallback merged ${fallbackList.length}/${uniqIds.length}`);
  return fallbackList;
}

// ─────────────────────────────────────────────────────────────────
//  Scrape workshop/browse → extract FileIDs + real total count
// ─────────────────────────────────────────────────────────────────
async function scrapeIds(params) {
  const page    = parseInt(params.page) || 1;
  const appId   = params.appid || 431960;
  let url = '';

  // 如果是按作者查询，直接转到该作者的创意工坊主页
  if (params.creator) {
    url = `https://steamcommunity.com/profiles/${params.creator}/myworkshopfiles/?appid=${appId}&p=${page}&numperpage=${params.numperpage || 30}`;
  } else {
    // 正常的标签搜索逻辑
    const sortMap = { 1:'trend', 2:'mostrecent', 11:'mostvotes', 16:'totaluniquesubscribers' };
    const sort    = sortMap[parseInt(params.query_type)] || 'trend';
    const qs = [
      `appid=${appId}`, `browsesort=${sort}`, `section=readytouseitems`,
      `actualsort=${sort}`, `p=${page}`, `numperpage=${params.numperpage || 30}`,
    ];
    if (params.search_text) qs.push(`searchtext=${encodeURIComponent(params.search_text)}`);
    if (params.days && sort === 'trend' && String(params.days) !== '0') qs.push(`days=${params.days}`);

    const tags = [];
    for (const [k, v] of Object.entries(params)) {
      if (/^requiredtags/.test(k) && v) tags.push(String(v));
    }
    if (tags.length <= 8) {
      tags.forEach(t => qs.push(`requiredtags[]=${encodeURIComponent(t)}`));
    }
    url = `https://steamcommunity.com/workshop/browse/?${qs.join('&')}`;
  }

  console.log(`[Scrape] ${url}`);
  const html = (await GET(url)).toString('utf8');

  // ── Extract real total_count from Steam HTML ──
  // Steam renders something like: "Showing 1-30 of 45,678 entries"
  // or: <div class="workshopBrowsePagingInfo">Showing 1-30 of 45,678 entries</div>
  // Also: data in the paging summary text
  let totalCount = 0;

  // Pattern 1: English "Showing X-Y of Z entries"
  const showingM = html.match(/[Ss]howing\s+[\d,]+-[\d,]+\s+of\s+([\d,]+)/);
  if (showingM) totalCount = parseInt(showingM[1].replace(/,/g,''));

  // Pattern 1b: Chinese "显示第 1-30 项，共 1,234 项" or similar
  if (!totalCount) {
    const cnM = html.match(/共\s*([\d,]+)\s*(?:项|条|个)/);
    if (cnM) totalCount = parseInt(cnM[1].replace(/,/g,''));
  }

  // Pattern 2: workshopBrowsePagingInfo div
  if (!totalCount) {
    const pagingM = html.match(/workshopBrowsePagingInfo[^>]*>([\s\S]*?)<\/div>/);
    if (pagingM) {
      const numM = pagingM[1].match(/([\d,]+)\s*(?:entries|条|项)/i);
      if (numM) totalCount = parseInt(numM[1].replace(/,/g,''));
    }
  }

  // Pattern 3: paging_controls total
  if (!totalCount) {
    const pageCtrl = html.match(/paging_controls[\s\S]{0,500}?([\d,]+)\s*(?:results|entries|items)/i);
    if (pageCtrl) totalCount = parseInt(pageCtrl[1].replace(/,/g,''));
  }

  // Pattern 4: any standalone large number in paging section
  if (!totalCount) {
    const pageSec = html.match(/workshop(?:BrowsePaging|Paging)[^]*?(\d[\d,]{3,})/);
    if (pageSec) totalCount = parseInt(pageSec[1].replace(/,/g,''));
  }

  // Extract all publishedfileids
  const seen = new Set();
  const ids  = [];
  const hints = {};
  for (const m of html.matchAll(/data-publishedfileid="(\d+)"/g)) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    const idx = typeof m.index === 'number' ? m.index : -1;
    if (idx >= 0) {
      const block = html.substring(Math.max(0, idx - 280), idx + 3400);
      const titleM = block.match(/class="workshopItemTitle[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const imgM = block.match(/class="workshopItemPreviewImage[^"]*"[^>]+src="([^"]+)"/i) ||
                   block.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
      const authorM = block.match(/class="workshopItemAuthorName[^"]*"[\s\S]{0,1200}?<a[^>]*>([\s\S]*?)<\/a>/i);
      const creatorM = block.match(/workshop_author_link[^"]*"[^>]+href="[^"]*\/profiles\/(\d{17})\/?/i);
      hints[id] = {
        title: cleanText(titleM ? titleM[1] : ''),
        preview_url: imgM ? cleanText(imgM[1]) : '',
        author: cleanText(authorM ? authorM[1] : ''),
        creator: creatorM ? creatorM[1] : '',
      };
    }
  }

  console.log(`[Scrape] Found ${ids.length} IDs, totalCount from HTML: ${totalCount}`);

  // Debug img tags
  const firstIdx = html.indexOf('data-publishedfileid');
  if (firstIdx !== -1) {
    const block   = html.substring(Math.max(0, firstIdx - 300), firstIdx + 2500);
    const imgTags = block.match(/<img[^>]+>/g) || [];
    console.log(`[Scrape] img tags near first item: ${imgTags.length}`);
    imgTags.slice(0, 3).forEach((t, i) => console.log(`  img[${i}]: ${t.substring(0, 150)}`));
  } else {
    console.log('[Scrape] ⚠️ No publishedfileid found! HTML length:', html.length);
  }

  return { ids, totalCount, hints };
}

function getSteamApiKey() {
  const fromSettings = String(VIDEO_CACHE_SETTINGS.steamApiKey || '').trim();
  const fromEnv = String(process.env.STEAM_API_KEY || '').trim();
  return fromSettings || fromEnv;
}

function mapLocalQueryTypeToSteamApi(localType) {
  const n = parseInt(localType);
  if (n === 11) return 11; // 最多投票
  if (n === 1) return 3;  // 最热门
  if (n === 2) return 1;  // 最近
  if (n === 16) return 9; // 最多订阅
  return 3;
}

function buildSteamApiQueryFields(params, singleGenreTag) {
  const requiredTags = [];
  const typeTags = new Set(['Scene', 'Video', 'Web', 'Application']);
  const ratingTags = new Set(['Everyone', 'Questionable', 'Mature']);
  let typeTag = '';
  let ratingTag = '';

  for (const [k, v] of Object.entries(params || {})) {
    if (!/^requiredtags/.test(k) || !v) continue;
    const tag = String(v).trim();
    if (!tag) continue;
    if (typeTags.has(tag)) {
      typeTag = tag;
      continue;
    }
    if (ratingTags.has(tag)) {
      ratingTag = tag;
      continue;
    }
    requiredTags.push(tag);
  }

  if (typeTag) requiredTags.push(typeTag);
  if (ratingTag) requiredTags.push(ratingTag);
  if (singleGenreTag) requiredTags.push(String(singleGenreTag).trim());

  return {
    query_type: mapLocalQueryTypeToSteamApi(params.query_type),
    page: Math.max(1, parseInt(params.page) || 1),
    numperpage: Math.max(1, Math.min(100, parseInt(params.numperpage) || 30)),
    appid: parseInt(params.appid) || 431960,
    search_text: String(params.search_text || '').trim(),
    days: parseInt(params.days) || 0,
    requiredTags
  };
}

async function queryWorkshopBySteamApi(apiKey, params, genreOr) {
  // 如果传了作者，直接调用专用的 GetUserFiles API
  if (params.creator) {
    const qsUser = [
      `key=${apiKey}`, `steamid=${params.creator}`, `appid=${params.appid || 431960}`,
      `page=${params.page || 1}`, `numperpage=${params.numperpage || 30}`,
      `return_details=1`, `return_tags=1`, `return_preview_url=1`,
      `return_short_description=1`, `return_metadata=1`
    ];
    const url = `https://api.steampowered.com/IPublishedFileService/GetUserFiles/v1/?${qsUser.join('&')}`;
    const raw = await GET(url, { 'Accept': 'application/json' }, 22000);
    const data = JSON.parse(raw.toString('utf8'));
    const resp = data.response || {};
    const details = Array.isArray(resp.publishedfiledetails) ? resp.publishedfiledetails : [];
    const ids = details.map(d => String(d.publishedfileid)).filter(Boolean);
    const detailMap = {};
    details.forEach(d => { if(d.result === 1) detailMap[d.publishedfileid] = d; });
    return { ids, totalCount: parseInt(resp.total) || 0, detailMap };
  }

  const genreList = Array.from(new Set((genreOr || []).map(x => String(x || '').trim()).filter(Boolean)));
  const needMultiGenre = genreList.length > 1;
  const effectiveGenres = needMultiGenre ? genreList : [genreList[0] || ''];
  const mergedIds = [];
  const seen = new Set();
  const mergedDetailMap = {};
  let total = 0;

  for (const g of effectiveGenres) {
    const q = buildSteamApiQueryFields(params, g);
    const search = new URLSearchParams();
    search.set('key', apiKey);
    search.set('appid', String(q.appid));
    search.set('query_type', String(q.query_type));
    search.set('page', String(q.page));
    search.set('numperpage', String(q.numperpage));
    search.set('return_tags', 'true');
    search.set('return_preview_url', 'true');
    search.set('return_short_description', 'true');
    search.set('return_metadata', 'true');
    search.set('return_vote_data', 'true');
    search.set('match_all_tags', 'true');
    if (q.search_text) search.set('search_text', q.search_text);
    if (q.days > 0) search.set('days', String(q.days));
    q.requiredTags.forEach((tag, i) => search.set(`requiredtags[${i}]`, tag));

    const url = `https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?${search.toString()}`;
    const raw = await GET(url, { 'Accept': 'application/json' }, 22000);
    const data = JSON.parse(raw.toString('utf8'));
    const resp = data && data.response ? data.response : {};
    const details = Array.isArray(resp.publishedfiledetails) ? resp.publishedfiledetails : [];
    const oneIds = Array.isArray(resp.publishedfileids) && resp.publishedfileids.length
      ? resp.publishedfileids.map(v => String(v))
      : details.map(d => String(d && d.publishedfileid || '')).filter(Boolean);
    const count = parseInt(resp.total || 0) || 0;
    if (count > total) total = count;
    details.forEach(d => {
      if (!d || !d.publishedfileid || d.result !== 1) return;
      mergedDetailMap[String(d.publishedfileid)] = d;
    });

    for (const id of oneIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      mergedIds.push(id);
    }
  }

  return { ids: mergedIds, totalCount: total, detailMap: mergedDetailMap };
}

// ─────────────────────────────────────────────────────────────────
//  Main Query: Scrape IDs → GetPublishedFileDetails → respond
// ─────────────────────────────────────────────────────────────────
async function handleQuery(req, res) {
  let payload;
  try { payload = JSON.parse(await readBody(req)); }
  catch { return jsonRes(res, 400, { error: 'Bad JSON' }); }

  const params = payload.params || {};
  const page = parseInt(params.page) || 1;
  const numperpage = parseInt(params.numperpage) || 30;
  const genreOr = [];
  if (Array.isArray(params.genre_or)) params.genre_or.forEach(g => g && genreOr.push(String(g).toLowerCase()));
  for (const [k, v] of Object.entries(params)) {
    if (/^genre_or\[\d+\]$/.test(k) && v) genreOr.push(String(v).toLowerCase());
  }

  try {
    const mapItem = (id, d, hint = {}) => {
      const hintAuthor = cleanText(hint && hint.author);
      const hintCreator = cleanText(hint && hint.creator);
      const hintTitle = cleanText(hint && hint.title);
      const hintPreview = cleanText(hint && hint.preview_url);
      if (d && d.result === 1) {
        return {
          publishedfileid:        id,
          title:                  d.title              || id,
          preview_url:            d.preview_url        || '',
          subscriptions:          d.subscriptions      || 0,
          lifetime_subscriptions: d.lifetime_subscriptions || d.subscriptions || 0,
          views:                  d.views              || 0,
          favorited:              d.favorited          || 0,
          lifetime_favorited:     d.lifetime_favorited || d.favorited || 0,
          file_size:              d.file_size          || 0,
          time_updated:           d.time_updated       || 0,
          time_created:           d.time_created       || 0,
          short_description:      d.short_description  || '',
          tags:                   d.tags               || [],
          author:                 hintAuthor           || '',
          creator:                d.creator            || hintCreator || '',
        };
      }
      return {
        publishedfileid: id, title: hintTitle || `壁纸 ${id}`, preview_url: hintPreview || '',
        subscriptions: 0, lifetime_subscriptions: 0, views: 0,
        favorited: 0, lifetime_favorited: 0, file_size: 0,
        time_updated: 0, time_created: 0, short_description: '', tags: [], author: hintAuthor || '', creator: hintCreator || '',
      };
    };

    const hasGenreOr = genreOr.length > 1;
    const steamApiKey = getSteamApiKey();
    const useSteamApi = !!steamApiKey && !!VIDEO_CACHE_SETTINGS.useSteamApi;
    if (!hasGenreOr) {
      let sourceData = useSteamApi
        ? Object.assign({ hints: {} }, await queryWorkshopBySteamApi(steamApiKey, params, genreOr))
        : await scrapeIds(params);
      if (useSteamApi && (!sourceData.ids || !sourceData.ids.length)) {
        console.warn('[Query] SteamAPI returned empty list, fallback to scrapeIds');
        sourceData = await scrapeIds(params);
      }
      const { ids, totalCount, hints, detailMap: apiDetailMap } = sourceData;
      if (!ids.length) {
        return jsonRes(res, 200, { response: { publishedfiledetails: [], total: 0 } });
      }
      let details = [];
      if (!useSteamApi || !apiDetailMap || !Object.keys(apiDetailMap).length) {
        try { details = await getFileDetailsSafe(ids); }
        catch (err) { console.warn('[FileDetails Error]', err.message); }
      } else {
        details = ids.map(id => apiDetailMap[id]).filter(Boolean);
      }
      const detailMap = {};
      details.forEach(d => { if (d && d.publishedfileid) detailMap[d.publishedfileid] = d; });
      const items = ids.map(id => mapItem(id, detailMap[id], (hints && hints[id]) || {}));
      const total = totalCount > 0 ? totalCount : (ids.length >= numperpage ? 50000 : ids.length);
      console.log(`[Query] Returning ${items.length} items, total=${total}`);
      return jsonRes(res, 200, { response: { publishedfiledetails: items, total, total_count: items.length } });
    }

    if (useSteamApi) {
      let apiData = await queryWorkshopBySteamApi(steamApiKey, params, genreOr);
      if (!apiData.ids.length) {
        console.warn('[Query] SteamAPI Genre OR returned empty list, fallback to scrapeIds');
        apiData = Object.assign({ detailMap: {} }, await scrapeIds(params));
      }
      if (!apiData.ids.length) {
        return jsonRes(res, 200, { response: { publishedfiledetails: [], total: 0 } });
      }
      let details = [];
      if (apiData.detailMap && Object.keys(apiData.detailMap).length) {
        details = apiData.ids.map(id => apiData.detailMap[id]).filter(Boolean);
      } else {
        try { details = await getFileDetailsSafe(apiData.ids); }
        catch (err) { console.warn('[FileDetails Error]', err.message); }
      }
      const detailMap = {};
      details.forEach(d => { if (d && d.publishedfileid) detailMap[d.publishedfileid] = d; });
      const matched = apiData.ids.map(id => mapItem(id, detailMap[id], {})).slice(0, numperpage);
      const total = apiData.totalCount > 0 ? apiData.totalCount : 50000;
      console.log(`[Query] SteamAPI Genre OR(${genreOr.length}) returning ${matched.length}, total=${total}`);
      return jsonRes(res, 200, { response: { publishedfiledetails: matched, total, total_count: matched.length } });
    }

    const matched = [];
    const seen = new Set();
    let totalCount = 0;
    let cursorPage = page;
    let scanned = 0;
    while (matched.length < numperpage && scanned < 6 && cursorPage <= 999) {
      const pageParams = Object.assign({}, params, { page: cursorPage });
      const pageData = await scrapeIds(pageParams);
      if (!totalCount && pageData.totalCount) totalCount = pageData.totalCount;
      if (!pageData.ids.length) break;
      let details = [];
      try { details = await getFileDetailsSafe(pageData.ids); }
      catch (err) { console.warn('[FileDetails Error]', err.message); }
      const detailMap = {};
      details.forEach(d => { if (d && d.publishedfileid) detailMap[d.publishedfileid] = d; });
      for (const id of pageData.ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        const d = detailMap[id];
        if (!(d && d.result === 1)) continue;
        const tagSet = new Set((d.tags || []).map(t => String(t.tag || t).toLowerCase()));
        if (!genreOr.some(g => tagSet.has(g))) continue;
        matched.push(mapItem(id, d, (pageData.hints && pageData.hints[id]) || {}));
        if (matched.length >= numperpage) break;
      }
      cursorPage += 1;
      scanned += 1;
    }
    const total = totalCount > 0 ? totalCount : 50000;
    console.log(`[Query] Genre OR(${genreOr.length}) returning ${matched.length} items, total=${total}, scanned=${scanned}`);
    jsonRes(res, 200, { response: { publishedfiledetails: matched, total, total_count: matched.length } });
  } catch (err) {
    console.error('[Query Error]', err.message);
    jsonRes(res, 502, { error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────
//  Detail page: API + HTML scrape + comments
// ─────────────────────────────────────────────────────────────────
async function handleDetails(res, id) {
  console.log(`[Detail] id=${id}`);

  // A: GetPublishedFileDetails for single item
  let A = null;
  try {
    const list = await getFileDetails([id]);
    A = list[0] && list[0].result === 1 ? list[0] : null;
  } catch (e) { console.warn('[Detail API]', e.message); }

  const withDeadline = (promise, ms, fallback) => new Promise(resolve => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, ms);
    Promise.resolve(promise)
      .then(v => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      });
  });

  const detailTask = (async () => {
    try {
      const detailHtml = (await GET(
        `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`,
        { 'Accept-Language': 'zh-CN,zh;q=0.9' }, 9000
      )).toString('utf8');
      return { detailHtml, H: parseDetailHtml(detailHtml) };
    } catch (e) {
      console.warn('[Detail HTML]', e.message);
      return { detailHtml: '', H: null };
    }
  })();

  const commentsTask = (async () => {
    try {
      const cUrl = `https://steamcommunity.com/comment/PublishedFile_Public/render/${id}/-1/`;
      const cBody = 'start=0&count=50&feature2=-1&l=schinese&userreview_offset=-1';
      const u = new URL(cUrl);
      const buf = await doRequest({
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? parseInt(u.port) : undefined,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Content-Length': Buffer.byteLength(cBody),
          'Accept': '*/*',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://steamcommunity.com',
          'Referer': `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`,
          'Cookie': STEAM_PREF_COOKIE,
        },
        timeout: 9000
      }, cBody);
      const cData = JSON.parse(buf.toString('utf8'));
      if (cData.success) return parseComments(cData.comments_html || '');
      console.warn(`[Comments] Steam returned success=false, id=${id}`);
      return [];
    } catch (e) {
      console.warn('[Comments]', e.message);
      return [];
    }
  })();

  const detailResult = await withDeadline(detailTask, 9500, { detailHtml: '', H: null });
  let H = detailResult.H;
  let detailHtml = detailResult.detailHtml;
  let comments = await withDeadline(commentsTask, 9500, []);
  if (!comments.length && detailHtml) comments = parseComments(detailHtml);

  const creatorId = (A && A.creator) ? String(A.creator) : ((H && H.creator_id) ? String(H.creator_id) : '');
  const resolvedPersona = await resolvePersonaName(creatorId);
  const htmlAuthor = cleanText(H && H.author);
  const finalAuthor = (htmlAuthor && !looksLikeSteamId(htmlAuthor))
    ? htmlAuthor
    : (resolvedPersona || htmlAuthor || creatorId || '');

  const out = {
    publishedfileid: id,
    title:       (A&&A.title)       || (H&&H.title)       || '',
    preview_url: (A&&A.preview_url) || (H&&H.preview_url) || '',
    description: (H&&H.description) || (A&&A.short_description) || '',
    author:      finalAuthor,
	creator:     creatorId,
    subscriptions: fmtStat((A&&(A.lifetime_subscriptions||A.subscriptions)), H&&H.subscriptions),
    favorited:     fmtStat((A&&(A.lifetime_favorited||A.favorited)),         H&&H.favorited),
    views:         fmtStat((A&&A.views),                                     H&&H.views),
    file_size:     fmtBytes(A&&A.file_size) || (H&&H.file_size) || '未知',
    time_updated:  fmtTime(A&&A.time_updated)  || (H&&H.time_updated)  || '未知',
    time_created:  fmtTime(A&&A.time_created)  || (H&&H.time_created)  || '未知',
    tags: (A&&A.tags&&A.tags.map(t=>t.tag||t)) || (H&&H.tags) || [],
    comments,
  };
  
  console.log(`[Detail] Result: preview=${out.preview_url?'YES':'NO'}, subs=${out.subscriptions}, cmts=${comments.length}`);
  jsonRes(res, 200, out);
}

function fmtStat(n, fallback) {
  n = parseInt(n) || 0;
  if (n > 0) {
    if (n>=1e6) return (n/1e6).toFixed(1)+'M';
    if (n>=1e3) return (n/1e3).toFixed(1)+'K';
    return n.toLocaleString();
  }
  return fallback || '0';
}
function fmtBytes(b) {
  b = parseInt(b); if (!b||b<=0) return null;
  if (b>=1073741824) return (b/1073741824).toFixed(1)+' GB';
  if (b>=1048576)    return (b/1048576).toFixed(1)+' MB';
  if (b>=1024)       return (b/1024).toFixed(1)+' KB';
  return b+' B';
}
function fmtTime(ts) {
  ts = parseInt(ts); if (!ts) return null;
  return new Date(ts*1000).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'});
}
function looksLikeSteamId(v) {
  return /^\d{17}$/.test(String(v || '').trim());
}
function cleanText(v) {
  return String(v || '').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
}
async function resolvePersonaName(steamId) {
  const sid = String(steamId || '').trim();
  if (!looksLikeSteamId(sid)) return '';
  if (PERSONA_CACHE.has(sid)) return PERSONA_CACHE.get(sid);
  try {
    const html = (await GET(`https://steamcommunity.com/profiles/${sid}/?xml=1`, { 'Accept': 'application/xml,text/xml,*/*;q=0.8' }, 12000)).toString('utf8');
    const m = html.match(/<steamID><!\[CDATA\[([\s\S]*?)\]\]><\/steamID>/i) || html.match(/<steamID>([\s\S]*?)<\/steamID>/i);
    const name = cleanText(m ? m[1] : '');
    PERSONA_CACHE.set(sid, name);
    return name;
  } catch {
    PERSONA_CACHE.set(sid, '');
    return '';
  }
}
function parseDetailHtml(html) {
  const titleM = html.match(/<div class="workshopItemTitle">([^<]+)<\/div>/);
  const imgM   = html.match(/id="previewImageMain"[^>]+src="([^"]+)"/) ||
                 html.match(/id="previewImage"[^>]+src="([^"]+)"/)     ||
                 html.match(/class="workshopItemPreviewImageMain[^"]*"[^>]+src="([^"]+)"/);
  const descM  = html.match(/id="highlightContent"[^>]*>([\s\S]*?)<\/div>/) ||
                 html.match(/class="workshopItemDescription[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  const authBlkM = html.match(/class="workshopItemAuthorName[^"]*"[\s\S]{0,1200}?<\/a>/) ||
                   html.match(/class="friendBlock[^"]*"[\s\S]{0,2200}?<\/div>\s*<\/div>/);
  const authM  = authBlkM
    ? (authBlkM[0].match(/<a[^>]*>([^<]+)<\/a>/) || authBlkM[0].match(/class="friendBlockContent"[^>]*>\s*([\s\S]*?)<br/i))
    : null;
  const authHrefM = authBlkM
    ? (authBlkM[0].match(/href="[^"]*\/profiles\/(\d{17})\/?[^"]*"/i) || authBlkM[0].match(/friendBlockLinkOverlay"[^>]*href="[^"]*\/profiles\/(\d{17})\/?[^"]*"/i))
    : null;

  let subs='',favs='',views='',file_size='',time_updated='',time_created='';
  for (const [,n,l] of html.matchAll(/<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/g)) {
    const lb = l.trim().toLowerCase();
    if (lb.includes('visitor')||lb.includes('访问')) views = n.trim();
    if (lb.includes('subscri')||lb.includes('订阅')) subs  = n.trim();
    if (lb.includes('favorit')||lb.includes('收藏')) favs  = n.trim();
  }
  for (const [,l,v] of html.matchAll(/<div class="detailsStatLeft">([^<]+)<\/div>\s*<div class="detailsStatRight">([^<]+)<\/div>/g)) {
    const lb = l.trim().toLowerCase(), vt = v.trim();
    if (lb.includes('size'))    file_size    = vt;
    if (lb.includes('updated')) time_updated = vt;
    if (lb.includes('posted'))  time_created = vt;
  }
  const tags = [];
  for (const [,t] of html.matchAll(/<a[^>]+class="[^"]*workshopTagFilterItem[^"]*"[^>]*>\s*([^<]+)\s*<\/a>/g)) {
    if (!tags.includes(t.trim())) tags.push(t.trim());
  }
  for (const [,t] of html.matchAll(/class="workshopTags"[^>]*>[\s\S]*?<a[^>]*>\s*([^<]+)\s*<\/a>/g)) {
    const tag = t.trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return {
    title:       titleM ? titleM[1].trim() : '',
    preview_url: imgM   ? imgM[1]          : '',
    description: descM  ? descM[1].replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim() : '',
    author:      authM  ? authM[1].trim()  : '',
    creator_id:  authHrefM ? authHrefM[1] : '',
    subscriptions: subs, favorited: favs, views, file_size, time_updated, time_created, tags,
  };
}
function parseComments(html) {
  if (!html) return [];
  const out = [];
  const re = /<a[^>]*class="[^"]*commentthread_author_link[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,2400}?<span[^>]*class="[^"]*commentthread_comment_timestamp[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]{0,4000}?<div[^>]*class="[^"]*commentthread_comment_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  for (const m of html.matchAll(re)) {
    const author = (m[1] || '').replace(/<[^>]+>/g,'').trim() || 'Steam User';
    const date   = (m[2] || '').replace(/<[^>]+>/g,'').trim();
    const text   = (m[3] || '').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').trim();
    if (!text) continue;
    out.push({ author, date, text });
    if (out.length >= 50) break;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
//  Handle Download Request (add to queue only)
// ─────────────────────────────────────────────────────────────────
function safeName(s) {
  return String(s || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}
function extFromUrl(u, fallback) {
  try {
    const pathname = new URL(u).pathname || '';
    const ext = path.extname(pathname).toLowerCase();
    if (ext && ext.length <= 8) return ext;
  } catch {}
  return fallback || '.bin';
}
function extFromPath(p, fallback) {
  const ext = path.extname(String(p || '')).toLowerCase();
  return (ext && ext.length <= 8) ? ext : (fallback || '.bin');
}
function mimeFromExt(ext) {
  const m = {
    '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif',
    '.mp4':'video/mp4','.webm':'video/webm','.wmv':'video/x-ms-wmv','.avi':'video/x-msvideo',
    '.mkv':'video/x-matroska','.mov':'video/quicktime','.m4v':'video/x-m4v',
    '.mp3':'audio/mpeg','.wav':'audio/wav',
    '.zip':'application/zip','.rar':'application/vnd.rar','.7z':'application/x-7z-compressed',
  };
  return m[ext] || 'application/octet-stream';
}
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function runProcess(bin, args, timeoutMs, options = {}) {
  let killFn = null;
  const promise = new Promise((resolve, reject) => {
    // 开启 detached 让 Linux 进程独立成组
    const spawnOptions = Object.assign({ 
      windowsHide: true, 
      env: Object.assign({}, process.env),
      detached: process.platform !== 'win32' 
    }, options);
    const cp = spawn(bin, args, spawnOptions);
    let out = '';
    let err = '';
    
    // 进度与速度计算变量
    let lastBytes = 0;
    let lastTime = Date.now();
    let streamBuffer = ''; // 用于缓冲被截断的输出流

    cp.stdout.on('data', d => {
      const chunk = d.toString();
      out += chunk;
      
      // 实时解析 SteamCMD 进度日志，防止数据块截断导致匹配失败
      if (ACTIVE_TASK && ACTIVE_TASK.status === 'downloading') {
        streamBuffer += chunk;
        // 使用 matchAll 获取这段缓冲区里最新的一次进度
        const matches = [...streamBuffer.matchAll(/progress:\s+[\d.]+\s+\((\d+)\s+\/\s+(\d+)\)/g)];
        
        if (matches.length > 0) {
          const m = matches[matches.length - 1]; // 取最后一条最新进度
          const currentBytes = parseInt(m[1]);
          const totalBytes = parseInt(m[2]);
          const now = Date.now();
          
          if (now - lastTime >= 1000) {
            ACTIVE_TASK.speed = (currentBytes - lastBytes) / ((now - lastTime) / 1000);
            lastBytes = currentBytes;
            lastTime = now;
          }
          
          ACTIVE_TASK.progress = (currentBytes / totalBytes) * 100;
          ACTIVE_TASK.downloaded = currentBytes;
          ACTIVE_TASK.total = totalBytes;
          
          // 保留尾巴，防止下一次输出被截断，同时避免内存溢出
          streamBuffer = streamBuffer.slice(-150); 
        }
      }
    });
    
    cp.stderr.on('data', d => err += d.toString());
    cp.on('error', e => reject(e));
    cp.on('close', code => {
      if (ACTIVE_TASK) ACTIVE_TASK.speed = 0;
      if (code === 0) return resolve({ out, err });
      reject(new Error((err || out || `exit ${code}`).trim().slice(-1200)));
    });
    
    // 暴露强制中止方法供暂停功能使用
    killFn = () => {
      try { 
        if (process.platform === 'win32') {
          cp.kill('SIGKILL');
          try { execFileSync('taskkill', ['/pid', cp.pid, '/T', '/F'], {stdio: 'ignore'}); } catch(e){}
        } else {
          // 通过 PID 发送信号给整个进程组
          try { process.kill(-cp.pid, 'SIGKILL'); } catch(e) { cp.kill('SIGKILL'); }
        }
      } catch {}
      reject(new Error('任务已被取消或暂停'));
    };
  });
  
  promise.kill = killFn;
  return promise;
}

// --- 新增：原生直链流式下载器（用于处理有直链的壁纸并统计进度） ---
function downloadWithProgress(urlStr, dest, task) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.get(urlStr, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadWithProgress(res.headers.location, dest, task).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      
      const total = parseInt(res.headers['content-length'] || '0');
      task.total = total;
      let downloaded = 0; let lastTime = Date.now(); let lastBytes = 0;

      const file = fs.createWriteStream(dest);
      res.on('data', chunk => {
        downloaded += chunk.length;
        task.downloaded = downloaded;
        if (total) task.progress = (downloaded / total) * 100;
        const now = Date.now();
        if (now - lastTime > 1000) {
          task.speed = (downloaded - lastBytes) / ((now - lastTime) / 1000);
          lastBytes = downloaded; lastTime = now;
        }
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', err => { fs.unlink(dest, ()=>{}); reject(err); });
      
      task.cancelFn = () => {
        req.destroy(); file.close(); fs.unlink(dest, ()=>{});
        reject(new Error('任务已被取消或暂停'));
      };
    });
    req.on('error', reject);
  });
}
async function resolveSteamCmdPath() {
  const candidates = [
    process.env.STEAMCMD_PATH || '',
    path.join(__dirname, 'steamcmd', 'steamcmd.exe'),
    'C:\\steamcmd\\steamcmd.exe',
    'C:\\Program Files (x86)\\SteamCMD\\steamcmd.exe',
    'C:\\Program Files\\SteamCMD\\steamcmd.exe',
  ].filter(Boolean);

  if (process.platform !== 'win32') {
    candidates.unshift(
      path.join(__dirname, 'steamcmd', 'steamcmd.sh'),
      '/usr/bin/steamcmd',
      '/usr/games/steamcmd',
      '/usr/local/bin/steamcmd.sh',
      '/opt/steamcmd/steamcmd.sh'
    );
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const out = await runProcess('where.exe', ['steamcmd']);
    const first = String(out.out || '').split(/\r?\n/).map(s => s.trim()).find(Boolean);
    if (first && fs.existsSync(first)) return first;
  } catch {}
  return null;
}
function psQuote(v) {
  return String(v || '').replace(/'/g, "''");
}
function listFilesRecursive(root) {
  const out = [];
  const walk = (dir) => {
    const ents = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of ents) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp);
      else if (e.isFile()) out.push(fp);
    }
  };
  walk(root);
  return out;
}
function findWorkshopItemDir(root, appId, publishedFileId) {
  const expected = path.join(root, 'steamapps', 'workshop', 'content', String(appId), String(publishedFileId));
  if (fs.existsSync(expected) && fs.statSync(expected).isDirectory()) return expected;
  const target = String(publishedFileId);
  const queue = [root];
  while (queue.length) {
    const dir = queue.shift();
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (!e.isDirectory()) continue;
      const fp = path.join(dir, e.name);
      if (e.name === target) return fp;
      queue.push(fp);
    }
  }
  return null;
}
function extractSteamCmdFailure(steamcmdPath, appId, publishedFileId) {
  const logFile = path.join(path.dirname(steamcmdPath), 'logs', 'workshop_log.txt');
  if (!fs.existsSync(logFile)) return '';
  let text = '';
  try { text = fs.readFileSync(logFile, 'utf8'); } catch { return ''; }
  const rows = text.split(/\r?\n/);
  const item = String(publishedFileId);
  const app = String(appId);
  let from = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    const line = rows[i] || '';
    if (line.includes(`Download item ${item} requested by app`)) { from = i; break; }
  }
  if (from < 0) return '';
  const window = rows.slice(from, Math.min(rows.length, from + 40));
  for (const line of window) {
    if (!line.includes(`[AppID ${app}]`)) continue;
    if (line.includes('result : No Connection') || line.includes('Failed downloading') || line.includes('No connection')) {
      return 'SteamCDN 网络连接失败（No Connection）';
    }
    if (line.includes('result : Access Denied')) {
      return 'Steam 返回 Access Denied（权限不足或需要登录账号）';
    }
    if (line.includes('result : Timeout')) {
      return 'Steam 下载超时（Timeout）';
    }
  }
  return '';
}
function detectVideoTag(details) {
  const tags = Array.isArray(details && details.tags) ? details.tags : [];
  return tags.some(t => String((t && t.tag) || t || '').trim().toLowerCase() === 'video');
}
function pickVideoFile(itemDir) {
  if (!fs.existsSync(itemDir)) return null;
  const exts = ['.mp4', '.webm', '.avi', '.wmv', '.mkv', '.mov', '.m4v'];
  const rank = new Map(exts.map((e, i) => [e, i]));
  const files = listFilesRecursive(itemDir)
    .map(fp => ({ fp, ext: path.extname(fp).toLowerCase(), size: fs.statSync(fp).size }))
    .filter(x => rank.has(x.ext));
  if (!files.length) return null;
  files.sort((a, b) => (rank.get(a.ext) - rank.get(b.ext)) || (b.size - a.size));
  return files[0].fp;
}
async function zipDir(dirPath, zipPath) {
  ensureDir(path.dirname(zipPath));
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  
  if (process.platform === 'win32') {
    const cmd = `Compress-Archive -Path '${psQuote(path.join(dirPath, '*'))}' -DestinationPath '${psQuote(zipPath)}' -Force`;
    await runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], 180000);
  } else {
    const zipArgs = ['-r', path.basename(zipPath), '.'];
    await runProcess('zip', zipArgs, 180000, { cwd: dirPath });
  }
}
async function ensureSteamCmdReady() {
  const found = await resolveSteamCmdPath();
  if (found) return found;
  const base = path.join(__dirname, 'steamcmd');
  ensureDir(base);
  
  if (process.platform === 'win32') {
    const zipFile = path.join(base, 'steamcmd.zip');
    const exeFile = path.join(base, 'steamcmd.exe');
    const cmd = `$ProgressPreference='SilentlyContinue';Invoke-WebRequest -UseBasicParsing -Uri 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip' -OutFile '${psQuote(zipFile)}';Expand-Archive -Path '${psQuote(zipFile)}' -DestinationPath '${psQuote(base)}' -Force`;
    await runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], 240000);
    if (!fs.existsSync(exeFile)) throw new Error('SteamCMD 自动安装后仍未找到 steamcmd.exe');
    try { fs.unlinkSync(zipFile); } catch {}
    return exeFile;
  } else {
    try {
      if (process.platform === 'linux') {
        const steamcmdSh = path.join(base, 'steamcmd.sh');
        if (!fs.existsSync(steamcmdSh)) {
          const downloadCmd = `curl -sSL https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz | tar -xz -C '${psQuote(base)}'`;
          await runProcess('sh', ['-c', downloadCmd], 240000);
        }
        
        if (fs.existsSync(steamcmdSh)) {
          await runProcess('chmod', ['+x', steamcmdSh], 5000);
          return steamcmdSh;
        }
      }
    } catch (e) {
      console.warn('Linux SteamCMD 自动安装失败:', e.message);
    }

    throw new Error('未找到 SteamCMD。请在 Linux 上手动安装 SteamCMD:\n1. sudo apt install steamcmd (Ubuntu/Debian)\n2. 或从 https://developer.valvesoftware.com/wiki/SteamCMD#Linux 下载并解压到 steamcmd/ 目录');
  }
}
function resolveLocalAccount(appId) {
  const candidates = [
    path.join(__dirname, '..', 'SteamWorshopsTools-v2.0.5', 'data', 'pub_accounts.json'),
    path.join(__dirname, '..', 'index', 'SteamWorshopsTools-v2.0.5', 'data', 'pub_accounts.json'),
    path.join(process.cwd(), 'SteamWorshopsTools-v2.0.5', 'data', 'pub_accounts.json'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      const arr = Array.isArray(j && j.Accounts) ? j.Accounts : [];
      for (const a of arr) {
        const ids = Array.isArray(a && a.AppIds) ? a.AppIds.map(x => parseInt(x)) : [];
        if (ids.includes(parseInt(appId))) {
          const user = String(a.Name || '').trim();
          const pass = String(a.Password || '').trim();
          if (user && pass) return { user, pass };
        }
      }
    } catch {}
  }
  return null;
}
async function downloadViaSteamCmd(publishedFileId, appId, title, options) {
  const steamcmd = await ensureSteamCmdReady();
  const webUser = STEAM_CREDENTIALS.username;
  const webPass = STEAM_CREDENTIALS.password;
  const webGuard = STEAM_CREDENTIALS.steamGuardCode;
  const isPersistent = STEAM_CREDENTIALS.isPersistent;
  const envUser = String(process.env.STEAM_USERNAME || '').trim();
  const envPass = String(process.env.STEAM_PASSWORD || '').trim();
  const localAcc = (!webUser && !webPass && !envUser && !envPass) ? resolveLocalAccount(appId) : null;
  const user = webUser || envUser || (localAcc && localAcc.user) || '';
  const pass = webPass || envPass || (localAcc && localAcc.pass) || '';
  const guard = webGuard || '';
  
  // 如果有持久化登录或账号登录，使用 STEAM_CONFIG_DIR 作为安装目录
  // 这样可以复用已登录的会话，避免重复登录
  // 只有匿名下载才使用临时目录
  const useSharedDir = (isPersistent && user) || (user && pass);
  const tempRoot = useSharedDir 
    ? STEAM_CONFIG_DIR
    : fs.mkdtempSync(path.join(os.tmpdir(), 'wallhub-steamcmd-'));
  if (useSharedDir) ensureDir(tempRoot);
  
  let itemDir = path.join(tempRoot, 'steamapps', 'workshop', 'content', String(appId), String(publishedFileId));
  const attempts = [];
  
  // 如果是持久化登录，只使用用户名（不需要密码）
  if (user && isPersistent) {
    console.log(`[SteamCMD] Using persistent login: ${user} (shared dir: ${useSharedDir})`);
    attempts.push({ name: 'persistent', loginArgs: ['+login', user] });
  } else if (user && pass) {
    console.log(`[SteamCMD] Using account login: ${user} (shared dir: ${useSharedDir})`);
    attempts.push({ name: 'account', loginArgs: guard ? ['+login', user, pass, guard] : ['+login', user, pass] });
  } else {
    // 只有在没有账号信息时才使用匿名登录
    console.log(`[SteamCMD] Using anonymous login (temp dir: ${tempRoot})`);
    attempts.push({ name: 'anonymous', loginArgs: ['+login', 'anonymous'] });
  }
  
  let lastErr = '';
  const variants = [
    { name: 'normal', itemArgs: ['+workshop_download_item', String(appId), String(publishedFileId)] },
    { name: 'validate', itemArgs: ['+workshop_download_item', String(appId), String(publishedFileId), 'validate'] },
  ];

  let steamcmdCommand, steamcmdArgsPrefix;
  if (process.platform === 'win32') {
    steamcmdCommand = steamcmd;
    steamcmdArgsPrefix = [];
  } else {
    steamcmdCommand = '/bin/bash';
    steamcmdArgsPrefix = [steamcmd];
  }
  
  // 用于存储当前运行的进程，以便中断
  let currentProcess = null;
  
  // 暴露中断方法
  const abortController = {
    aborted: false,
    abort: () => {
      abortController.aborted = true;
      if (currentProcess && currentProcess.kill) {
        console.log(`[SteamCMD] Aborting download for item ${publishedFileId}...`);
        currentProcess.kill();
      }
    }
  };
  
  // 将 abortController 附加到 options，以便外部调用
  if (options) {
    options.abortController = abortController;
  }
  
  try {
    for (const at of attempts) {
      for (const variant of variants) {
        if (abortController.aborted) {
          throw new Error('Download aborted by client');
        }
        
        try {
          console.log(`[SteamCMD] Trying ${at.name}/${variant.name} for item ${publishedFileId}...`);
          
          const args = [
            ...steamcmdArgsPrefix,
            '+@ShutdownOnFailedCommand', '1',
            '+@NoPromptForPassword', '1',
            '+force_install_dir', tempRoot,
            ...at.loginArgs,
            ...variant.itemArgs,
            '+quit',
          ];
          
          let retryCount = 0;
          const maxRetries = 10; // 自动重试次数
          let success = false;
          
          // 轮询底层下载文件夹的物理大小
          let progressTimer = null;
          if (options && options.task) {
            const dlDir = path.join(tempRoot, 'steamapps', 'workshop', 'downloads', String(appId), String(publishedFileId));
            let lastBytes = 0;
            let lastTime = Date.now();
            
            progressTimer = setInterval(() => {
              try {
                let currentBytes = 0;
                if (fs.existsSync(dlDir)) {
                  // 递归计算文件夹总大小
                  const getDirSize = (dir) => {
                    let size = 0;
                    const ents = fs.readdirSync(dir, { withFileTypes: true });
                    for (const e of ents) {
                      const fp = path.join(dir, e.name);
                      if (e.isDirectory()) size += getDirSize(fp);
                      else size += fs.statSync(fp).size;
                    }
                    return size;
                  };
                  currentBytes = getDirSize(dlDir);
                }
                
                if (currentBytes > 0) {
                  const now = Date.now();
                  if (now - lastTime >= 1000) {
                    options.task.speed = (currentBytes - lastBytes) / ((now - lastTime) / 1000);
                    lastBytes = currentBytes;
                    lastTime = now;
                  }
                  options.task.downloaded = currentBytes;
                  if (options.task.total > 0) {
                    // 最高卡在 99.9%，等最后文件完整搬运完再变成 100%
                    options.task.progress = Math.min(99.9, (currentBytes / options.task.total) * 100);
                  }
                }
              } catch (e) {}
            }, 1000);
          }
          
          try {
            while (retryCount < maxRetries && !success) {
              try {
                currentProcess = runProcess(steamcmdCommand, args, 0); 
                if (options && options.task) {
                  options.task.processPromise = currentProcess; 
                }
                await currentProcess;
                success = true; // 没报错就是成功了，跳出循环
              } catch (err) {
                if (err.message.includes('Timeout downloading item') && retryCount < maxRetries - 1) {
                  retryCount++;
                  console.log(`[SteamCMD] 遇到网络超时，准备进行第 ${retryCount} 次重试...`);
                  if (options && options.task) {
                    options.task.errorMsg = `网络波动，正在自动重试 (${retryCount}/${maxRetries})...`;
                  }
                  await new Promise(r => setTimeout(r, 3000));
                } else {
                  throw err; 
                }
              } finally {
                currentProcess = null;
              }
            }
          } finally {
            if (progressTimer) clearInterval(progressTimer); // 下载结束，必销毁定时器释放内存
          }
          
          if (abortController.aborted) {
            throw new Error('Download aborted by client');
          }
          
          const discovered = findWorkshopItemDir(tempRoot, appId, publishedFileId);
          if (discovered && fs.existsSync(discovered)) {
            const files = fs.readdirSync(discovered);
            if (files.length) {
              itemDir = discovered;
              console.log(`[SteamCMD] Success with ${at.name}/${variant.name}, found ${files.length} files`);
              break;
            }
          }
          const reason = extractSteamCmdFailure(steamcmd, appId, publishedFileId);
          lastErr = `${at.name}/${variant.name} 未产出文件${reason ? `（${reason}）` : ''}`;
          console.warn(`[SteamCMD] ${lastErr}`);
        } catch (e) {
          // 拦截被前端暂停或取消的任务，直接阻断外层的备用线路重试循环
          if (e.message.includes('取消') || e.message.includes('暂停')) {
            throw e;
          }
          if (abortController.aborted) {
            throw new Error('Download aborted by client');
          }
          const reason = extractSteamCmdFailure(steamcmd, appId, publishedFileId);
          lastErr = `${at.name}/${variant.name} 失败: ${e.message}${reason ? `（${reason}）` : ''}`;
          console.warn(`[SteamCMD] ${lastErr}`);
        }
        if (fs.existsSync(itemDir) && fs.readdirSync(itemDir).length) break;
      }
      if (fs.existsSync(itemDir) && fs.readdirSync(itemDir).length) break;
    }
    
    if (!fs.existsSync(itemDir)) {
      // 只清理临时目录，不清理共享目录
      if (!useSharedDir) {
        try {
          if (fs.existsSync(tempRoot)) {
            fs.rmSync(tempRoot, { recursive: true, force: true });
          }
        } catch (e) {
          console.warn('[SteamCMD] Failed to cleanup temp dir:', e.message);
        }
      }
      throw new Error(lastErr || 'SteamCMD 执行完成但未产出工坊文件目录');
    }
    
    if (!fs.readdirSync(itemDir).length) {
      // 清理临时目录
      if (!useSharedDir) {
        try {
          if (fs.existsSync(tempRoot)) {
            fs.rmSync(tempRoot, { recursive: true, force: true });
          }
        } catch (e) {
          console.warn('[SteamCMD] Failed to cleanup temp dir:', e.message);
        }
      }
      throw new Error(user && pass
        ? `SteamCMD 未下载到文件（${lastErr}）`
        : `匿名下载失败（${lastErr}），请尝试登录 Steam 账号后重试`);
    }
    
    const wantVideoOnly = !!(options && options.videoOnly);
    if (wantVideoOnly) {
      const videoPath = pickVideoFile(itemDir);
      if (videoPath) {
        const videoExt = extFromPath(videoPath, '.mp4');
        const videoName = `${safeName(title || `Wallpaper ${publishedFileId}`)}-${publishedFileId}${videoExt}`;
        console.log(`[SteamCMD] Found video file: ${videoPath}`);
        return { kind: 'file', filePath: videoPath, fileName: videoName, tempRoot, useSharedDir, itemDir };
      }
    }
    
    // 直接准备移动整个文件夹
    const folderName = `${safeName(title || `Wallpaper ${publishedFileId}`)}-${publishedFileId}`;
    console.log(`[SteamCMD] Folder ready, skipping zip: ${itemDir}`);
    
    // 直接将整个文件夹路径作为目标返回，交由 triggerQueue 去搬运
    return { kind: 'file', filePath: itemDir, fileName: folderName, tempRoot, useSharedDir, itemDir: itemDir };
    
    return { kind: 'zip', zipPath, zipName };
  } catch (e) {
    if (abortController.aborted || e.message.includes('aborted') || e.message.includes('取消') || e.message.includes('暂停')) {
      
      // 暂停，保留临时文件以供后续断点续传
      const isPaused = options && options.task && options.task.status === 'paused';
      
      if (isPaused) {
        console.log(`[SteamCMD] 任务已暂停，保留壁纸 ${publishedFileId} 的临时文件以供断点续传...`);
      } else {
        console.log(`[SteamCMD] 任务已被取消，正在彻底清理壁纸 ${publishedFileId} 的残留文件...`);
        
        const scrapDlDir = path.join(tempRoot, 'steamapps', 'workshop', 'downloads', String(appId), String(publishedFileId));
        const scrapContentDir = path.join(tempRoot, 'steamapps', 'workshop', 'content', String(appId), String(publishedFileId));
        
        try { if (fs.existsSync(scrapDlDir)) fs.rmSync(scrapDlDir, { recursive: true, force: true }); } catch (err) {}
        try { if (fs.existsSync(scrapContentDir)) fs.rmSync(scrapContentDir, { recursive: true, force: true }); } catch (err) {}

        if (!useSharedDir) {
          try {
            if (fs.existsSync(tempRoot)) {
              fs.rmSync(tempRoot, { recursive: true, force: true });
              console.log(`[SteamCMD] Cleaned up aborted download tempRoot: ${tempRoot}`);
            }
          } catch (cleanupErr) {
            console.warn('[SteamCMD] Failed to cleanup aborted download:', cleanupErr.message);
          }
        }
      }
    }
    throw e;
  }
}
async function handleDownload(res, id, title) {
  const wantId = parseInt(id);
  if (!wantId) return jsonRes(res, 400, { error: 'Invalid id' });
  
  if (TASK_QUEUE.some(t => t.id === wantId)) {
    return jsonRes(res, 200, { success: true, message: '已在下载队列中' });
  }

  let d = null;
  try {
    const list = await getFileDetails([String(wantId)]);
    d = list[0] && list[0].result === 1 ? list[0] : null;
  } catch (e) {
    return jsonRes(res, 502, { error: `Steam detail error: ${e.message}` });
  }
  if (!d) return jsonRes(res, 404, { error: '壁纸不存在或不可见' });

  const sourceUrl = String(d.file_url || '').trim();
  const appId = parseInt(d.consumer_appid || d.consumer_app_id || d.appid || 431960) || 431960;
  const isVideo = detectVideoTag(d);
  const itemTitle = safeName(title || d.title || `Wallpaper ${wantId}`) || `Wallpaper ${wantId}`;

  // 将任务推入队列，并立即向前端返回
  const task = {
    id: wantId, appId: appId, title: itemTitle, isVideo: isVideo, sourceUrl: sourceUrl,
    status: 'pending', progress: 0, speed: 0, downloaded: 0, 
    total: parseInt(d.file_size) || 0, // 把壁纸的真实总大小存入队列
    errorMsg: '', addTime: Date.now()
  };
  TASK_QUEUE.push(task);
  triggerQueue();

  return jsonRes(res, 200, { success: true, message: '已加入下载队列，请在队列面板查看进度' });
}

// 异步后台下载循环引擎
async function triggerQueue() {
  if (queueProcessorRunning) return;
  queueProcessorRunning = true;
  
  while (true) {
    ACTIVE_TASK = TASK_QUEUE.find(t => t.status === 'pending');
    if (!ACTIVE_TASK) break;

    ACTIVE_TASK.status = 'downloading';
    ACTIVE_TASK.errorMsg = '';
    
    try {
      ensureDir(DOWNLOAD_DIR);
      if (ACTIVE_TASK.sourceUrl) {
        // 直链下载模式
        const ext = extFromUrl(ACTIVE_TASK.sourceUrl, '.dat');
        const fileName = `${ACTIVE_TASK.title}-${ACTIVE_TASK.id}${ext}`;
        await downloadWithProgress(ACTIVE_TASK.sourceUrl, path.join(DOWNLOAD_DIR, fileName), ACTIVE_TASK);
        } else {
        // SteamCMD 模式
        const dl = await downloadViaSteamCmd(ACTIVE_TASK.id, ACTIVE_TASK.appId, ACTIVE_TASK.title, { videoOnly: ACTIVE_TASK.isVideo, task: ACTIVE_TASK });
        if (dl.kind === 'file') {
          const finalPath = path.join(DOWNLOAD_DIR, dl.fileName);
          if (dl.filePath !== finalPath) {
            // 加上 try-catch 是为了兼容 Docker 跨硬盘挂载(EXDEV)的情况
            try {
              fs.renameSync(dl.filePath, finalPath);
            } catch (err) {
              if (err.code === 'EXDEV') {
                // 整个文件夹的跨盘转移
                fs.cpSync(dl.filePath, finalPath, { recursive: true });
                fs.rmSync(dl.filePath, { recursive: true, force: true });
              } else throw err;
            }
          }
          
          // 彻底清理残留的 steamapps 源文件夹
          if (dl.itemDir && fs.existsSync(dl.itemDir)) {
            try { fs.rmSync(dl.itemDir, { recursive: true, force: true }); } catch (e) {}
          }
          
          if (!dl.useSharedDir && dl.tempRoot) try { fs.rmSync(dl.tempRoot, { recursive: true, force: true }); } catch (e) {}
        }
      }
      
      if (ACTIVE_TASK.status === 'downloading') {
        ACTIVE_TASK.status = 'completed';
        ACTIVE_TASK.progress = 100;
        ACTIVE_TASK.speed = 0;
      }
    } catch (e) {
      if (ACTIVE_TASK.status !== 'paused' && ACTIVE_TASK.status !== 'cancelled') {
        ACTIVE_TASK.status = 'error';
        ACTIVE_TASK.errorMsg = e.message;
        ACTIVE_TASK.speed = 0;
      }
    }
    ACTIVE_TASK = null;
  }
  queueProcessorRunning = false;
}

// ─────────────────────────────────────────────────────────────────
//  Steam Login/Logout/Status APIs
// ─────────────────────────────────────────────────────────────────
async function handleSteamLogin(req, res) {
  let payload;
  try { payload = JSON.parse(await readBody(req)); }
  catch { return jsonRes(res, 400, { error: 'Bad JSON' }); }

  const username = String(payload.username || '').trim();
  const password = String(payload.password || '').trim();
  const steamGuardCode = String(payload.steamGuardCode || '').trim();
  const isRetry = payload.isRetry || false;

  if (!username || !password) {
    return jsonRes(res, 400, { error: '用户名和密码不能为空' });
  }

  console.log(`[Steam Login] Attempting login for user: ${username}, SteamGuard: ${steamGuardCode ? 'Yes' : 'No'}, Retry: ${isRetry}`);

  // 如果是重试且有验证码，需要通过 SteamCMD 验证并持久化
  if (isRetry && steamGuardCode) {
    try {
      const steamcmd = await ensureSteamCmdReady();
      const installDir = STEAM_CONFIG_DIR;
      
      if (!fs.existsSync(installDir)) {
        fs.mkdirSync(installDir, { recursive: true });
      }

      let steamcmdCommand, steamcmdArgsPrefix;
      if (process.platform === 'win32') {
        steamcmdCommand = steamcmd;
        steamcmdArgsPrefix = [];
      } else {
        steamcmdCommand = '/bin/bash';
        steamcmdArgsPrefix = [steamcmd];
      }

      const loginArgs = [
        ...steamcmdArgsPrefix,
        '+@ShutdownOnFailedCommand', '1',
        '+@NoPromptForPassword', '1',
        '+force_install_dir', installDir,
        '+login', username, password, steamGuardCode,
        '+quit'
      ];

      console.log(`[Steam Login] Verifying Steam Guard code and persisting login to ${installDir}...`);
      await runProcess(steamcmdCommand, loginArgs, 60000);
      
      // 登录成功，保存凭据（标记为持久化）
      STEAM_CREDENTIALS.username = username;
      STEAM_CREDENTIALS.password = ''; // 持久化后不需要保存密码
      STEAM_CREDENTIALS.steamGuardCode = '';
      STEAM_CREDENTIALS.isPersistent = true; // 标记为持久化登录

      // 将账号存入本地 cache-settings.json，防止 Docker 重启后失忆
      VIDEO_CACHE_SETTINGS.steamUsername = username;
      VIDEO_CACHE_SETTINGS.steamIsPersistent = true;
      saveCacheSettings();
	  
      console.log(`[Steam Login] Steam Guard verified, credentials persisted for user: ${username}`);
      return jsonRes(res, 200, { 
        success: true, 
        message: '登录成功，凭据已持久化',
        username: username,
        hasSteamGuard: true,
        isPersistent: true
      });
    } catch (e) {
      console.error(`[Steam Login] Steam Guard verification failed:`, e.message);
      return jsonRes(res, 401, { 
        error: 'Steam Guard 验证失败，请检查验证码是否正确',
        needsSteamGuard: true
      });
    }
  }

  // 验证 SteamCMD 登录
  try {
    const steamcmd = await ensureSteamCmdReady();
    
    // 使用 STEAM_CONFIG_DIR 作为安装目录，这样登录信息会保存到该目录
    const installDir = STEAM_CONFIG_DIR;
    
    // 确保目录存在
    if (!fs.existsSync(installDir)) {
      fs.mkdirSync(installDir, { recursive: true });
    }

    let steamcmdCommand, steamcmdArgsPrefix;
    if (process.platform === 'win32') {
      steamcmdCommand = steamcmd;
      steamcmdArgsPrefix = [];
    } else {
      steamcmdCommand = '/bin/bash';
      steamcmdArgsPrefix = [steamcmd];
    }

    const loginArgs = [
      ...steamcmdArgsPrefix,
      '+@ShutdownOnFailedCommand', '1',
      '+@NoPromptForPassword', '1',
      '+force_install_dir', installDir,
      '+login', username, password
    ];

    if (steamGuardCode) {
      loginArgs.push(steamGuardCode);
    }

    loginArgs.push('+quit');

    console.log(`[Steam Login] Testing login with SteamCMD (timeout: 60s), saving to ${installDir}...`);
    
    await runProcess(steamcmdCommand, loginArgs, 60000);
    
    // 登录成功，保存凭据（标记为持久化）
    STEAM_CREDENTIALS.username = username;
    STEAM_CREDENTIALS.password = ''; // 持久化后不需要保存密码
    STEAM_CREDENTIALS.steamGuardCode = '';
    STEAM_CREDENTIALS.isPersistent = true; // 标记为持久化登录

    // 将账号存入本地 cache-settings.json，防止 Docker 重启后失忆
    VIDEO_CACHE_SETTINGS.steamUsername = username;
    VIDEO_CACHE_SETTINGS.steamIsPersistent = true;
    saveCacheSettings();

    console.log(`[Steam Login] Login successful for user: ${username}, credentials persisted to ${installDir}`);
    
    jsonRes(res, 200, { 
      success: true, 
      message: '登录成功，凭据已持久化',
      username: username,
      hasSteamGuard: !!steamGuardCode,
      isPersistent: true
    });
  } catch (e) {
    console.error(`[Steam Login] Login failed:`, e.message);
    
    let errorMsg = '登录失败';
    let needsSteamGuard = false;
    const errStr = String(e.message || '').toLowerCase();
    const errOutput = String(e.stderr || e.stdout || '').toLowerCase();
    const fullError = errStr + ' ' + errOutput;
    
    // 检测是否需要 Steam Guard
    if (fullError.includes('steam guard') || 
        fullError.includes('steamguard') || 
        fullError.includes('two-factor') ||
        fullError.includes('authentication code') ||
        fullError.includes('enter the code')) {
      needsSteamGuard = true;
      errorMsg = '需要 Steam Guard 验证码';
    } else if (fullError.includes('password') || fullError.includes('credentials') || fullError.includes('incorrect')) {
      errorMsg = '用户名或密码错误';
    } else if (fullError.includes('timeout') || fullError.includes('超时')) {
      errorMsg = '登录超时，请检查网络连接或稍后重试';
    } else if (fullError.includes('denied') || fullError.includes('access')) {
      errorMsg = '访问被拒绝，账号可能被锁定';
    } else if (fullError.includes('rate limit')) {
      errorMsg = '登录请求过于频繁，请稍后再试';
    } else {
      errorMsg = `登录失败: ${e.message}`;
    }
    
    jsonRes(res, needsSteamGuard ? 202 : 401, { 
      error: errorMsg,
      needsSteamGuard: needsSteamGuard
    });
  }
}

async function handleSteamLogout(req, res) {
  const wasPersistent = STEAM_CREDENTIALS.isPersistent;
  const username = STEAM_CREDENTIALS.username;
  
  // 清除内存中的凭据
  STEAM_CREDENTIALS.username = '';
  STEAM_CREDENTIALS.password = '';
  STEAM_CREDENTIALS.steamGuardCode = '';
  STEAM_CREDENTIALS.isPersistent = false;

  // 同步清除本地设置中的账号
  VIDEO_CACHE_SETTINGS.steamUsername = '';
  VIDEO_CACHE_SETTINGS.steamIsPersistent = false;
  saveCacheSettings();
  
  // 如果是持久化登录，尝试清理 Steam 配置文件
  if (wasPersistent && username) {
    try {
      const loginUsersVdf = path.join(STEAM_CONFIG_DIR, 'config', 'loginusers.vdf');
      if (fs.existsSync(loginUsersVdf)) {
        // 备份原文件
        const backupPath = loginUsersVdf + '.backup';
        fs.copyFileSync(loginUsersVdf, backupPath);
        
        // 删除登录文件以清除持久化登录
        fs.unlinkSync(loginUsersVdf);
        console.log(`[Steam Logout] Removed persistent login file for user: ${username}`);
      }
    } catch (e) {
      console.warn('[Steam Logout] Failed to remove persistent login file:', e.message);
    }
  }
  
  console.log('[Steam Logout] Credentials cleared');
  jsonRes(res, 200, { success: true, message: '已退出登录' });
}

async function handleSteamStatus(req, res) {
  const isLoggedIn = !!(STEAM_CREDENTIALS.username && (STEAM_CREDENTIALS.password || STEAM_CREDENTIALS.isPersistent));
  jsonRes(res, 200, { 
    loggedIn: isLoggedIn,
    username: isLoggedIn ? STEAM_CREDENTIALS.username : null,
    isPersistent: STEAM_CREDENTIALS.isPersistent || false
  });
}

// ─────────────────────────────────────────────────────────────────
//  Debug endpoint: GET /api/debug — shows raw HTML structure
// ─────────────────────────────────────────────────────────────────
async function handleDebug(res) {
  try {
    const url  = 'https://steamcommunity.com/workshop/browse/?appid=431960&browsesort=trend&section=readytouseitems&actualsort=trend&p=1&numperpage=3&days=30&requiredtags%5B%5D=Video';
    const html = (await GET(url)).toString('utf8');
    const idx  = html.indexOf('data-publishedfileid');

    let out = `=== WallHub Debug: Steam Workshop HTML Structure ===\n`;
    out += `URL: ${url}\n`;
    out += `HTML total length: ${html.length} bytes\n\n`;

    if (idx === -1) {
      out += `❌ NO publishedfileid found in HTML!\n\n`;
      out += `=== First 3000 chars ===\n${html.substring(0, 3000)}`;
    } else {
      const ids = html.match(/data-publishedfileid="(\d+)"/g) || [];
      out += `✅ Found ${ids.length} publishedfileid occurrences\n`;
      out += `IDs: ${ids.slice(0,10).join(', ')}\n\n`;

      const imgTags = (html.substring(idx-500, idx+3000).match(/<img[^>]+>/g) || []);
      out += `img tags near first item: ${imgTags.length}\n`;
      imgTags.forEach((t,i) => out += `  [${i}] ${t}\n`);

      out += `\n=== Block around first item (chars ${idx-200} to ${idx+2500}) ===\n`;
      out += html.substring(Math.max(0,idx-200), idx+2500);
    }

    send(res, 200, out, 'text/plain; charset=utf-8');
  } catch (err) {
    send(res, 500, `Debug Error: ${err.message}`, 'text/plain; charset=utf-8');
  }
}

// ─────────────────────────────────────────────────────────────────
//  Static files
// ─────────────────────────────────────────────────────────────────
function serveStatic(req, res) {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url,'http://x').pathname); } catch { rel='/'; }
  if (rel==='/'||rel==='') rel='/index.html';
  const safe = path.normalize(path.join(PUBLIC,rel));
  if (!safe.startsWith(PUBLIC)) { send(res,403,'Forbidden'); return; }
  fs.stat(safe,(err,stat)=>{
    if (err||!stat.isFile()) { send(res,404,'Not Found'); return; }
    res.writeHead(200,{'Content-Type':mimeType(safe),'Access-Control-Allow-Origin':'*'});
    fs.createReadStream(safe).pipe(res);
  });
}

// ─────────────────────────────────────────────────────────────────
//  Router
// ─────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method==='OPTIONS') { res.writeHead(204); res.end(); return; }
  let pn;
  try { pn = new URL(req.url,'http://x').pathname; } catch { pn='/'; }

  try {
    if (pn==='/health')                                    { send(res,200,'ok'); return; }
    if (pn==='/favicon.ico')                               { res.writeHead(204, { 'Cache-Control':'public, max-age=604800' }); res.end(); return; }
    if (pn==='/api/debug')                                 { await handleDebug(res); return; }
    if (pn==='/api/steam/query' && req.method==='POST')    { await handleQuery(req,res); return; }
    if (pn==='/api/steam/details' && req.method==='GET')   {
      const id = new URL(req.url,'http://x').searchParams.get('id');
      if (!id) return jsonRes(res,400,{error:'Missing id'});
      await handleDetails(res,id); return;
    }
    if (pn==='/api/download' && req.method==='GET') {
      const q = new URL(req.url,'http://x').searchParams;
      const id = q.get('id');
      const title = q.get('title') || `Wallpaper ${id}`;
      if (!id) return jsonRes(res,400,{error:'Missing id'});
      await handleDownload(res, id, title); return;
    }
	if (pn==='/api/queue' && req.method==='GET') {
      return jsonRes(res, 200, { tasks: TASK_QUEUE, rxSpeed: Math.max(0, currentRxSpeed) });
    }
    if (pn==='/api/queue/action' && req.method==='POST') {
      const { action, id } = JSON.parse(await readBody(req));
      if (action === 'clear_completed') {
        for (let i = TASK_QUEUE.length - 1; i >= 0; i--) {
          if (TASK_QUEUE[i].status === 'completed' || TASK_QUEUE[i].status === 'error') {
            TASK_QUEUE.splice(i, 1);
          }
        }
        return jsonRes(res, 200, { success: true });
      }

      // 全部暂停
      if (action === 'pause_all') {
        for (const t of TASK_QUEUE) {
          if (t.status === 'downloading') {
            t.status = 'paused'; t.speed = 0;
            if (t.processPromise && t.processPromise.kill) t.processPromise.kill();
            if (t.cancelFn) t.cancelFn();
          } else if (t.status === 'pending') {
            t.status = 'paused';
          }
        }
        return jsonRes(res, 200, { success: true });
      }

      // 全部开始
      if (action === 'resume_all') {
        for (const t of TASK_QUEUE) {
          if (t.status === 'paused' || t.status === 'error') {
            t.status = 'pending';
          }
        }
        triggerQueue(); // 唤醒下载引擎
        return jsonRes(res, 200, { success: true });
      }

      const idx = TASK_QUEUE.findIndex(t => t.id === id);
      if (idx === -1) return jsonRes(res, 404, { error: '未找到任务' });
      const t = TASK_QUEUE[idx];
      
      if (action === 'pause' && t.status === 'downloading') {
        t.status = 'paused'; t.speed = 0; // 改变状态为暂停，防止触发错误重试
        if (t.processPromise && t.processPromise.kill) t.processPromise.kill();
        if (t.cancelFn) t.cancelFn();
      } else if (action === 'pause' && t.status === 'pending') {
        t.status = 'paused';
      } else if (action === 'resume' && (t.status === 'paused' || t.status === 'error')) {
        t.status = 'pending'; triggerQueue();
      } else if (action === 'cancel') {
        if (t.status === 'downloading') {
          t.status = 'cancelled'; // 显式标记为取消状态
          if (t.processPromise && t.processPromise.kill) t.processPromise.kill();
          if (t.cancelFn) t.cancelFn();
        }
        TASK_QUEUE.splice(idx, 1);
      } else if (action === 'up' && idx > 0) {
        [TASK_QUEUE[idx-1], TASK_QUEUE[idx]] = [TASK_QUEUE[idx], TASK_QUEUE[idx-1]];
      } else if (action === 'down' && idx < TASK_QUEUE.length - 1) {
        [TASK_QUEUE[idx], TASK_QUEUE[idx+1]] = [TASK_QUEUE[idx+1], TASK_QUEUE[idx]];
      }
      return jsonRes(res, 200, { success: true });
    }
    if (pn==='/api/steam/login' && req.method==='POST') {
      await handleSteamLogin(req, res); return;
    }
    if (pn==='/api/steam/logout' && req.method==='POST') {
      await handleSteamLogout(req, res); return;
    }
    if (pn==='/api/steam/status' && req.method==='GET') {
      await handleSteamStatus(req, res); return;
    }
    
    if (pn==='/api/video/cache/settings' && req.method==='GET') {
      jsonRes(res, 200, {
        steamApiKey: VIDEO_CACHE_SETTINGS.steamApiKey || '',
        useSteamApi: !!VIDEO_CACHE_SETTINGS.useSteamApi
      }); return;
    }
    if (pn==='/api/video/cache/settings' && req.method==='POST') {
      try {
        const data = JSON.parse(await readBody(req));
        if (Object.prototype.hasOwnProperty.call(data, 'steamApiKey')) {
          VIDEO_CACHE_SETTINGS.steamApiKey = String(data.steamApiKey || '').trim();
        }
        if (Object.prototype.hasOwnProperty.call(data, 'useSteamApi')) {
          VIDEO_CACHE_SETTINGS.useSteamApi = !!data.useSteamApi;
        }
        saveCacheSettings();
        jsonRes(res, 200, {
          success: true,
          steamApiKey: VIDEO_CACHE_SETTINGS.steamApiKey || '',
          useSteamApi: !!VIDEO_CACHE_SETTINGS.useSteamApi
        });
      } catch (e) {
        jsonRes(res, 400, { error: 'Invalid JSON' });
      }
      return;
    }
    serveStatic(req,res);
  } catch(err) {
    console.error('[Unhandled]',err);
    jsonRes(res,500,{error:err.message});
  }
});

server.listen(PORT,'0.0.0.0',()=>{
  console.log('\n  ╔═══════════════════════════════════════════╗');
  console.log(`  ║  WallHub v4.3  ·  http://localhost:${PORT}  ║`);
  console.log('  ╚═══════════════════════════════════════════╝\n');
  console.log(`  📂 public : ${PUBLIC}`);
  console.log(`  🔍 debug  : http://localhost:${PORT}/api/debug`);
  console.log(`  💻 Node   : ${process.version}`);
  console.log(`  🖥️  OS     : ${process.platform}`);
  console.log(`  📁 Steam  : ${STEAM_CONFIG_DIR}\n`);
  
  // 确保 Steam 配置目录存在
  ensureSteamConfigDir();
  
  // 加载缓存设置
  loadCacheSettings();
  
  // 初始化 Steam 凭据（检测持久化登录）
  initializeSteamCredentials();
  
});
server.on('error',err=>{
  if(err.code==='EADDRINUSE') console.error(`\n❌ 端口 ${PORT} 已占用\n`);
  else console.error('\n❌',err.message);
  process.exit(1);
});
