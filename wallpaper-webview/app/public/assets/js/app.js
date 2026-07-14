const APPID = 431960, PAGE_SIZE = 30;
const PROXY_DOMAINS = ['steamcommunity.com', 'api.steampowered.com', 'steamusercontent.com'];
const PREFS_KEY = 'wallhub-prefs-v1';

const TYPES = [
  {id:'Scene', n:'场景'}, {id:'Video', n:'视频'}, {id:'Web', n:'网站'}
];
const RATINGS = [
  {id:'Everyone', n:'大众级'}, {id:'Questionable', n:'指导级'}, {id:'Mature', n:'成人级'}
];

const S = {
  page:1, totalPages:1, totalItems:0,
  loading:false, view:'grid', theme:'dark',
  items:[],
  f:{ search:'', sort:'toprated', days:'7', types:['Scene', 'Video', 'Web'], ratings:['Everyone', 'Questionable', 'Mature'], genres:[] }
};

const I18N = {
  zh: {
    docTitle: 'WE · Steam 壁纸工坊',
    searchPlaceholder: '搜索壁纸名称...',
    searchTitle: '搜索',
    themeToDark: '切换到暗色主题',
    themeToLight: '切换到淡色主题',
    usageBtn: '说明',
    sortLabel: '排序依据',
    sortTrend: '最热门',
    sortMostRecent: '最近',
    sortMostVotes: '最多投票',
    sortMostSubs: '最多订阅',
    daysLabel: '时间排序',
    day1: '今天',
    day7: '一周',
    day30: '一个月',
    day90: '三个月',
    day180: '半年',
    day365: '一年',
    day0: '有史以来',
    typeLabel: '类型选择',
    typeAll: '全部',
    typeScene: '场景',
    typeVideo: '视频',
    typeWeb: '网站',
    typeApp: '应用',
    ratingLabel: '年龄分级',
    ratingAll: '全部',
    ratingEveryone: '大众级',
    ratingQuestionable: '家长指导级',
    ratingMature: '限制成人级',
    filterBtn: '筛选',
    sidebarTitle: '标签',
    clear: '清除',
    selectAll: '全选',
    applyFilters: '应用筛选',
    sectionTitle: 'Steam 创意工坊壁纸',
    loadingResults: '加载中...',
    gridView: '网格',
    listView: '列表',
    commentsTitle: '💬 用户留言',
    loadingComments: '加载留言中...',
    subDownload: '订阅 / 下载壁纸',
    steamPage: 'Steam页面',
    usageTitle: '使用说明',
    usageIntro: '此项目不需要登陆Steam账号，即可下载 wallpaper engine 所有壁纸项目。',
    usageLimit: '<b>访问限制：</b><br>网络访问能力因地区与运营商而异。若可直连 Steam 创意工坊则无需代理；若访问受限，请开启系统代理后使用。',
    usagePack: '<b>下载与打包规则：</b><br>场景类 / 页面类 / 程序类壁纸：下载后自动打包为 .zip 压缩文件，需解压后访问；<br>视频类壁纸：仅下载原始视频文件，无压缩打包流程，下载后可直接播放。',
    usageDev: '<b>开发说明：</b><br>本项目全程依托人工智能辅助完成构建，发布者未审阅、未编写任何一行代码内容，若与其他项目存在代码雷同，均属巧合。',
    usageNote: '本工具并非用于规避 Wallpaper Engine 正版购买权益，严格遵循非商用、个人自用的使用场景。',
    disclaimerText: '免责声明：本项目在人工智能辅助下完成开发与整理，发布者未逐行人工审阅或手写核心代码；若与其他项目存在相似实现，可能属于技术方案趋同。项目仅供学习交流，请勿用于商业用途或侵权场景。',
    resultsZero: '0 个结果',
    noListByNetwork: '未获取到壁纸列表，当前网络可能无法访问 Steam 社区服务。',
    noMatched: '未找到匹配的壁纸，请尝试修改筛选条件',
    resultsApprox: '约 {total} 个 · 共 {pages} 页',
    loadingWorkshop: '正在抓取 Steam 创意工坊...',
    loadingWorkflow: '抓取列表 → 批量获取详情数据',
    loadFailed: '加载失败',
    retry: '重试',
    resFailed: '失败',
    proxyTitle: '🌐 当前网络可能受限，请开启代理后再访问',
    proxyDesc: '检测到请求 Steam 社区服务失败。请先开启 VPN/代理，再点击重试。',
    proxyRaw: '原始错误：{msg}',
    proxyRetest: '已开启代理，立即重试',
    copyProxyDomains: '复制代理域名',
    copiedProxyDomains: '代理域名已复制',
    copyFailed: '复制失败，请手动复制',
    noClipboard: '当前环境不支持自动复制，请手动复制域名',
    emptyData: '暂无壁纸数据',
    untitled: '未命名壁纸',
    subscribe: '订阅',
    prevPage: '上一页',
    nextPage: '下一页',
    authorLoading: '作者: 加载中...',
    loadingDesc: '加载详细描述中...',
    loadingData: '加载中...',
    loadingCmts: '正在抓取留言...',
    unknown: '未知',
    statSubs: '订阅数',
    statFavs: '收藏数',
    statViews: '浏览量',
    statSize: '文件大小',
    statUpdated: '最后更新',
    statFileId: '文件 ID',
    noComments: '暂无留言',
    steamUser: 'Steam用户',
    processing: '正在处理',
    packaging: '项目正在打包中',
    packagingToast: '项目正在打包中，请稍候…',
    downloadStarted: '已开始下载：{name}',
    downloadFailed: '工坊项目下载失败: {msg}',
    btnDownloaded: '已下载',
    btnFailed: '失败',
  }
};

let steamApiEnabled = false;

const GENRES=[
  {id:'Abstract',n:'抽象'},{id:'Animal',n:'动物'},{id:'Anime',n:'动漫'},
  {id:'Cartoon',n:'卡通'},{id:'CGI',n:'CGI'},{id:'Cyberpunk',n:'网络朋克'},
  {id:'Fantasy',n:'幻想'},{id:'Game',n:'游戏'},{id:'Girls',n:'女性'},
  {id:'Guys',n:'男性'},{id:'Landscape',n:'风景'},{id:'Medieval',n:'中世纪'},
  {id:'Memes',n:'网红事物'},{id:'MMD',n:'MMD'},{id:'Music',n:'音乐'},
  {id:'Nature',n:'自然'},{id:'Pixel art',n:'像素艺术'},{id:'Relaxing',n:'放松'},
  {id:'Retro',n:'复古'},{id:'Sci-Fi',n:'科幻'},{id:'Sports',n:'运动'},
  {id:'Technology',n:'科技'},{id:'Television',n:'电视节目'},{id:'Vehicle',n:'汽车'},
  {id:'Unspecified',n:'未指定样式'},
];

function translateTag(tag) {
  const lowerTag = String(tag).trim().toLowerCase();
  for (const t of TYPES) if (t.id.toLowerCase() === lowerTag) return t.n;
  for (const r of RATINGS) if (r.id.toLowerCase() === lowerTag) return r.n;
  for (const g of GENRES) if (g.id.toLowerCase() === lowerTag) return g.n;

  const extra = {
    'audio responsive':'音频响应', 'customizable':'可定制', 'interactive':'互动性',
    'mouse driven':'鼠标驱动', 'multi-monitor':'多显示器', 'dual monitor':'双显示器',
    'ultrawide':'带鱼屏', '4k':'4K分辨率', 'hdr':'HDR高动态', 'wallpaper':'壁纸',
    'approved':'已审核', 'video texture':'视频纹理渲染', 'media integration':'媒体集成',
    'dynamic resolution':'自适应分辨率', 'puppet warp':'操控变形', 'user shortcut':'用户快捷键',
    'other resolution':'其他分辨率'
  };
  return extra[lowerTag] || tag;
}

document.addEventListener('DOMContentLoaded', ()=>{
  restorePrefs(); 
  initTheme();    
  renderGenreGrid();
  setupEvents();
  applyStateToControls();
  syncFiltersFromControls();
  checkSteamLoginStatus();
  load();
  preloadLibraryCache();
  loadCacheSettings();
});

// 外部播放器列表控制与全局触控长按接管
let GLOBAL_PLAYERS = [];
let GLOBAL_DEFAULT_PLAYER = 'builtin';

let longPressTimer = null;
let touchStartX = 0;
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  const btn = e.target.closest('.sub-btn.done, .lib-play-btn, .q-thumb');
  if (btn && btn.dataset.playName) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    longPressTimer = setTimeout(() => {
      showPlayerMenu(e.touches[0], btn.dataset.playName);
    }, 500); // 长按 0.5 秒呼出菜单
  }
}, {passive: true});
document.addEventListener('touchmove', (e) => {
  if (longPressTimer) {
    if (Math.abs(e.touches[0].clientX - touchStartX) > 10 || Math.abs(e.touches[0].clientY - touchStartY) > 10) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }
}, {passive: true});
document.addEventListener('touchend', () => {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
});

function renderPlayerSettings() {
    const list = document.getElementById('playerSettingsList');
    if (!list) return;
    let html = `
    <div class="player-set-item ${GLOBAL_DEFAULT_PLAYER === 'builtin' ? 'is-default' : ''}">
        <div class="player-set-info">
            <div class="player-set-name">网页播放</div>
            <div class="player-set-tpl">系统默认</div>
        </div>
        ${GLOBAL_DEFAULT_PLAYER !== 'builtin' ? `<button class="btn-s" style="padding:4px 8px; font-size:12px;" onclick="setDefaultPlayer('builtin')">设为默认</button>` : `<span style="font-size:12px; color:var(--accent);">✓ 默认</span>`}
    </div>`;
    
        GLOBAL_PLAYERS.forEach((p, idx) => {
            html += `
            <div class="player-set-item ${GLOBAL_DEFAULT_PLAYER === p.id ? 'is-default' : ''}">
                <div class="player-set-info">
                    <div class="player-set-name">${esc(p.name)}</div>
                    <div class="player-set-tpl">${esc(p.template)}</div>
                </div>
                ${GLOBAL_DEFAULT_PLAYER !== p.id ? `<button class="btn-s" style="padding:4px 8px; font-size:12px;" onclick="setDefaultPlayer('${p.id}')">设为默认</button>` : `<span style="font-size:12px; color:var(--accent); margin-right:8px;">✓ 默认</span>`}
                <button class="btn-s" style="padding:4px 8px; font-size:12px;" onclick="openPlayerEditModal(${idx})">编辑</button>
                <button class="btn-s" style="padding:4px 8px; font-size:12px; color:var(--danger); border-color:var(--danger);" onclick="promptDeletePlayer(${idx})">删除</button>
            </div>`;
        });
        list.innerHTML = html;
    }
    function setDefaultPlayer(id) { GLOBAL_DEFAULT_PLAYER = id; savePlayerSettings(); }
    
    // 外部播放器UI
    let playerEditTargetIdx = null;
    function openPlayerEditModal(idx = null) {
      playerEditTargetIdx = idx;
      const nameInput = document.getElementById('playerNameInput');
      const tplInput = document.getElementById('playerTplInput');
      const title = document.getElementById('playerEditModalTitle');
      if (idx !== null) {
        title.textContent = '编辑播放方式';
        nameInput.value = GLOBAL_PLAYERS[idx].name;
        tplInput.value = GLOBAL_PLAYERS[idx].template;
      } else {
        title.textContent = '添加新播放方式';
        nameInput.value = '';
        tplInput.value = '';
      }
      document.getElementById('playerEditModalOv').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closePlayerEditModal() {
      document.getElementById('playerEditModalOv').classList.remove('open');
      document.body.style.overflow = '';
    }
    function submitPlayerEdit() {
      const name = document.getElementById('playerNameInput').value.trim();
      const tpl = document.getElementById('playerTplInput').value.trim();
      if (!name || !tpl) return toast('名称和跳转协议不能为空', 'warn');
      if (playerEditTargetIdx !== null) {
        GLOBAL_PLAYERS[playerEditTargetIdx].name = name;
        GLOBAL_PLAYERS[playerEditTargetIdx].template = tpl;
      } else {
        GLOBAL_PLAYERS.push({ id: 'p_' + Date.now(), name, template: tpl });
      }
      savePlayerSettings();
      closePlayerEditModal();
    }

    // 外部播放器 防误触删除
    let playerDeleteTargetIdx = null;
    function promptDeletePlayer(idx) {
      playerDeleteTargetIdx = idx;
      document.getElementById('playerDeleteConfirmModalOv').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closePlayerDeleteModal() {
      playerDeleteTargetIdx = null;
      document.getElementById('playerDeleteConfirmModalOv').classList.remove('open');
      document.body.style.overflow = '';
    }
    function submitPlayerDelete() {
      if (playerDeleteTargetIdx !== null) {
        const p = GLOBAL_PLAYERS[playerDeleteTargetIdx];
        if (GLOBAL_DEFAULT_PLAYER === p.id) GLOBAL_DEFAULT_PLAYER = 'builtin';
        GLOBAL_PLAYERS.splice(playerDeleteTargetIdx, 1);
        savePlayerSettings();
        closePlayerDeleteModal();
      }
    }

    async function savePlayerSettings() {
    renderPlayerSettings();
    try {
        await fetch('/api/video/cache/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customPlayers: GLOBAL_PLAYERS, defaultPlayer: GLOBAL_DEFAULT_PLAYER })
        });
    } catch(e) {}
}

let playerTargetName = '';
function showPlayerMenu(e, name) {
  if (e.preventDefault) e.preventDefault();
  playerTargetName = name;
  const ov = document.getElementById('playerMenuOv');
  const menu = document.getElementById('playerMenuList');
  
  let html = `<div class="player-menu-item ${GLOBAL_DEFAULT_PLAYER==='builtin'?'active':''}" onclick="choosePlayer('builtin')">网页播放 ${GLOBAL_DEFAULT_PLAYER==='builtin'?'(默认)':''}</div>`;
  GLOBAL_PLAYERS.forEach(p => {
      html += `<div class="player-menu-item ${GLOBAL_DEFAULT_PLAYER===p.id?'active':''}" onclick="choosePlayer('${p.id}')">${esc(p.name)} ${GLOBAL_DEFAULT_PLAYER===p.id?'(默认)':''}</div>`;
  });
  
  menu.innerHTML = html;
  ov.classList.add('open');
  
  let x = e.clientX || 0; let y = e.clientY || 0;
  menu.style.left = x + 'px'; menu.style.top = y + 'px';
  requestAnimationFrame(() => {
    let rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 10) + 'px';
  });
}
function closePlayerMenu() { const ov = document.getElementById('playerMenuOv'); if (ov) ov.classList.remove('open'); }
function choosePlayer(id) { closePlayerMenu(); if (playerTargetName) playLibraryItem(playerTargetName, id); }

// 静默扫描本地图库并补全缓存
async function preloadLibraryCache() {
  try {
    const res = await fetch('/api/library');
    if (!res.ok) return;
    const data = await res.json();
    const list = data.items || [];
    
    const libLocalCache = JSON.parse(localStorage.getItem('wh-lib-cache') || '{}');
    const idsToFetch = [];
    list.forEach(t => { if (t.id && !libLocalCache[t.id]) idsToFetch.push(t.id); });
    
    // 只有遇到全新的壁纸才向服务端发起请求
    if (idsToFetch.length > 0) {
      const dRes = await fetch('/api/library/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToFetch })
      });
      const dData = await dRes.json();
      const detailMap = dData.details || {};
      
      idsToFetch.forEach(id => {
        if (detailMap[id]) {
          const itemD = detailMap[id];
          libLocalCache[id] = {
            subs: itemD.subscriptions || itemD.lifetime_subscriptions || 0,
            favs: itemD.favorited || itemD.lifetime_favorited || 0,
            thumb: itemD.preview_url || ''
          };
        } else {
          libLocalCache[id] = { subs: 0, favs: 0, thumb: '' }; // 空数据也缓存，防止重复请求
        }
      });
      localStorage.setItem('wh-lib-cache', JSON.stringify(libLocalCache));
    }
  } catch (e) {}
}

function t(k, vars){
  let s = I18N.zh[k] || k;
  if (vars && typeof vars === 'object') {
    Object.keys(vars).forEach((name)=>{
      s = s.replace(new RegExp(`\\{${name}\\}`, 'g'), String(vars[name]));
    });
  }
  return s;
}

function setupEvents(){
  document.getElementById('searchInput').addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });
  document.getElementById('searchBtn').addEventListener('click', doSearch);
  document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
}
function syncFiltersFromControls(){
  S.f.genres = Array.from(activeGenres);
  S.f.types = Array.from(activeTypes);
  S.f.ratings = Array.from(activeRatings);
  syncDaysVisible();
  savePrefs();
}

function initTheme(){
  applyTheme(S.theme);
}
function applyTheme(mode){
  const isLight = mode === 'light';
  document.body.classList.toggle('theme-light', isLight);
}
function toggleTheme(){
  const isLight = document.body.classList.contains('theme-light');
  S.theme = isLight ? 'dark' : 'light';
  applyTheme(S.theme);
  syncStateToUrl();
}

function openSettingsModal(){
  updateSettingsCheckmarks();
  document.getElementById('settingsModalOv').classList.add('open');
  const modalBody = document.querySelector('#settingsModalOv .settings-modal-body');
  if (modalBody) modalBody.scrollTop = 0;
  document.body.style.overflow='hidden';
}
function closeSettingsModal(){
  document.getElementById('settingsModalOv').classList.remove('open');
  document.body.style.overflow='';
}
function settingsModalOvClick(e){
  if(e.target===document.getElementById('settingsModalOv')) closeSettingsModal();
}
function updateSettingsCheckmarks(){
  loadCacheSettings();
}

// ─────────────────────────────────────────────────────────────────
//  API Settings Management Functions
// ─────────────────────────────────────────────────────────────────
async function loadCacheSettings(){
  try {
    const res = await fetch('/api/video/cache/settings');
    if(res.ok){
      const data = await res.json();
      steamApiEnabled = !!data.useSteamApi;

      GLOBAL_PLAYERS = data.customPlayers || [];
      GLOBAL_DEFAULT_PLAYER = data.defaultPlayer || 'builtin';
      if (typeof renderPlayerSettings === 'function') renderPlayerSettings();

      const btn = document.getElementById('apiToggleBtn');
      if (btn) {
        if (steamApiEnabled) {
          btn.textContent = '删除 Steam API';
          btn.style.background = 'var(--danger)';
          btn.style.borderColor = 'var(--danger)';
          btn.style.color = '#fff';
        } else {
          btn.textContent = '启用 Steam API';
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
        }
      }
      const input = document.getElementById('steamApiKeyInput');
      if (input && data.steamApiKey) input.value = data.steamApiKey;
    }
  } catch(e){
    console.warn('[Cache] Failed to load settings:', e);
  }
}

function handleApiToggleBtn() {
  if (steamApiEnabled) {
    showClearApiConfirm();
  } else {
    const ov = document.getElementById('apiInputModalOv');
    if (ov) { ov.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }
}

function closeApiInputModal() {
  const ov = document.getElementById('apiInputModalOv');
  if (ov) { ov.classList.remove('open'); document.body.style.overflow = ''; }
}

async function submitApiInput() {
  const key = document.getElementById('steamApiKeyInput').value.trim();
  if (!key) return;
  try {
    const res = await fetch('/api/video/cache/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steamApiKey: key, useSteamApi: true })
    });
    if (res.ok) {
      closeApiInputModal();
      loadCacheSettings();
      load(); 
    }
  } catch (e) {}
}

function showClearApiConfirm() {
  const ov = document.getElementById('clearApiConfirmModalOv');
  if (ov) { ov.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeClearApiConfirmModal() {
  const ov = document.getElementById('clearApiConfirmModalOv');
  if (ov) { ov.classList.remove('open'); document.body.style.overflow = ''; }
}
async function submitClearApiConfirm() {
  closeClearApiConfirmModal();
  try {
    await fetch('/api/video/cache/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steamApiKey: '', useSteamApi: false })
    });
    const input = document.getElementById('steamApiKeyInput');
    if (input) input.value = '';
    loadCacheSettings();
  } catch (e) {}
}

function doSearch(){
  S.f.search = document.getElementById('searchInput').value.trim();
  S.page = 1; 
  savePrefs();
  load();
}

function syncDaysVisible(){
  document.getElementById('daysGrp').style.display = S.f.sort==='trend' ? '' : 'none';
}

let activeTypes = new Set([]);
let activeRatings = new Set([]);
let activeGenres = new Set(GENRES.map(g=>g.id));

function restorePrefs(){
  let raw = null;
  try{ raw = localStorage.getItem(PREFS_KEY); }catch{}
  if(raw){
    try{
      const saved = JSON.parse(raw);
      if(saved && (saved.view === 'grid' || saved.view === 'list')) S.view = saved.view;
      if(saved && (saved.theme === 'dark' || saved.theme === 'light')) S.theme = saved.theme;
      if(saved && saved.f){
        const allowedSort = ['trend', 'mostrecent', 'mostvotes', 'toprated', 'totaluniquesubscribers'];
        const allowedDays = ['1','7','30','90','180','365','0'];
        if(allowedSort.includes(saved.f.sort)) S.f.sort = saved.f.sort;
        if(allowedDays.includes(String(saved.f.days))) S.f.days = String(saved.f.days);
        
        if(Array.isArray(saved.f.types) && saved.f.types.length > 0) activeTypes = new Set(saved.f.types.filter(id=>TYPES.some(x=>x.id===id)));
        if(Array.isArray(saved.f.ratings) && saved.f.ratings.length > 0) activeRatings = new Set(saved.f.ratings.filter(id=>RATINGS.some(x=>x.id===id)));
        
        const savedGenres = Array.isArray(saved.f.genres) ? saved.f.genres : [];
        const validGenres = savedGenres.filter(g=>GENRES.some(x=>x.id===g));
        if(validGenres.length) activeGenres = new Set(validGenres);
      }
    }catch{}
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has('theme')) S.theme = params.get('theme');
  if (params.has('view')) S.view = params.get('view');

  if (params.has('q')) S.f.search = params.get('q');
  if (params.has('p')) S.page = parseInt(params.get('p')) || 1;

  if (params.has('sort')) S.f.sort = params.get('sort');
  if (params.has('days')) S.f.days = params.get('days');

  if (params.has('types')) {
    const arr = params.get('types').split(',');
    activeTypes = new Set(arr.filter(id=>TYPES.some(x=>x.id===id)));
  }
  if (params.has('ratings')) {
    const arr = params.get('ratings').split(',');
    activeRatings = new Set(arr.filter(id=>RATINGS.some(x=>x.id===id)));
  }
  if (params.has('genres')) {
    const arr = params.get('genres').split(',');
    activeGenres = new Set(arr.filter(g=>GENRES.some(x=>x.id===g)));
  }

  S.f.genres = Array.from(activeGenres);
  S.f.types = Array.from(activeTypes);
  S.f.ratings = Array.from(activeRatings);

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = S.f.search || '';
}

function applyStateToControls(){
  const sortMap = {trend:'最热门', mostrecent:'最近', mostvotes:'最多投票', toprated:'评分最高', totaluniquesubscribers:'最多订阅'};
  const daysMap = {'1':'今天', '7':'一周', '30':'一个月', '90':'三个月', '180':'半年', '365':'一年', '0':'有史以来'};
  
  const sl = document.getElementById('sortLabel');
  if (sl) sl.textContent = sortMap[S.f.sort] || '评分最高';
  const dl = document.getElementById('daysLabel');
  if (dl) dl.textContent = daysMap[S.f.days] || '一周';
  
  syncDaysVisible();
  setView(S.view);
}

function savePrefs(){
  syncStateToUrl();
}

function syncStateToUrl() {
  const params = new URLSearchParams();
  if (S.f.search) params.set('q', S.f.search);
  if (S.page > 1) params.set('p', S.page);
  
  if (S.theme !== 'dark') params.set('theme', S.theme);
  if (S.view !== 'grid') params.set('view', S.view);
  
  if (S.f.sort !== 'toprated') params.set('sort', S.f.sort);
  if (S.f.sort === 'trend' && S.f.days !== '7') params.set('days', S.f.days);
  
  if (activeTypes.size > 0 && activeTypes.size < TYPES.length) {
    params.set('types', Array.from(activeTypes).join(','));
  }
  if (activeRatings.size > 0 && activeRatings.size < RATINGS.length) {
    params.set('ratings', Array.from(activeRatings).join(','));
  }
  if (activeGenres.size > 0 && activeGenres.size < GENRES.length) {
    params.set('genres', Array.from(activeGenres).join(','));
  }

  const newSearch = params.toString() ? '?' + params.toString() : '';
  const newUrl = window.location.pathname + newSearch;
  if (window.location.pathname + window.location.search !== newUrl) {
    window.history.pushState(null, '', newUrl);
  }
}

window.addEventListener('popstate', () => {
  if (document.getElementById('videoModalOv')?.classList.contains('open')) return;
  if (window.ignoreNextPop) {
    window.ignoreNextPop = false;
    return; 
  }
  restorePrefs();
  applyTheme(S.theme);
  applyStateToControls();
  renderGenreGrid();
  load();
});

function renderGenreGrid(){
  document.getElementById('genreGrid').innerHTML = GENRES.map(g=>`
    <div class="gc ${activeGenres.has(g.id) ? 'sel2' : ''}" onclick="toggleGenre('${g.id}')">
      <div class="gc-chk"></div><span>${g.n}</span>
    </div>`).join('');
  updateBadge();
  updateMultiDropUI();
}

function updateMultiDropUI() {
  TYPES.forEach(t => {
    const el = document.getElementById('type_' + t.id);
    if(el) { el.className = 'gc ' + (activeTypes.has(t.id) ? 'sel2' : ''); el.querySelector('span').textContent = t.n; }
  });
  RATINGS.forEach(r => {
    const el = document.getElementById('rating_' + r.id);
    if(el) { el.className = 'gc ' + (activeRatings.has(r.id) ? 'sel2' : ''); el.querySelector('span').textContent = r.n; }
  });
  const formatLabels = (activeSet, dataArr) => {
    if (activeSet.size === 0 || activeSet.size === dataArr.length) return '全部';
    return dataArr.filter(item => activeSet.has(item.id)).map(item => item.n).join(', ');
  };
  
  document.getElementById('typeLabel').textContent = formatLabels(activeTypes, TYPES);
  document.getElementById('ratingLabel').textContent = formatLabels(activeRatings, RATINGS);
}

function toggleDrop(id, e) {
  e.stopPropagation();
  const drop = document.getElementById(id);
  const wasOpen = drop.classList.contains('open');
  document.querySelectorAll('.multi-drop').forEach(d => d.classList.remove('open'));
  if (!wasOpen) drop.classList.add('open');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.multi-drop').forEach(d => d.classList.remove('open'));
});

function setSort(id, label, e) {
  if(e) e.stopPropagation();
  S.f.sort = id;
  document.getElementById('sortLabel').textContent = label;
  document.querySelectorAll('.multi-drop').forEach(d => d.classList.remove('open'));
  S.page = 1; syncDaysVisible(); savePrefs(); load();
}

function setDays(id, label, e) {
  if(e) e.stopPropagation();
  S.f.days = id;
  document.getElementById('daysLabel').textContent = label;
  document.querySelectorAll('.multi-drop').forEach(d => d.classList.remove('open'));
  S.page = 1; savePrefs(); load();
}

function toggleType(id, e){
  e.stopPropagation();
  if(activeTypes.has(id)) activeTypes.delete(id); else activeTypes.add(id);
  S.f.types = Array.from(activeTypes); 
  updateMultiDropUI();
  S.page = 1; savePrefs(); load();
}
function toggleRating(id, e){
  e.stopPropagation();
  if(activeRatings.has(id)) activeRatings.delete(id); else activeRatings.add(id);
  S.f.ratings = Array.from(activeRatings); 
  updateMultiDropUI();
  S.page = 1; savePrefs(); load();
}
function toggleGenre(id){
  if(activeGenres.has(id)) activeGenres.delete(id); else activeGenres.add(id);
  S.f.genres = Array.from(activeGenres); renderGenreGrid();
}

function updateBadge(){
  const cnt = activeGenres.size;
  const noFilter = cnt === GENRES.length || cnt === 0;
  document.getElementById('fbadge').textContent = noFilter ? '全' : String(cnt);
  document.getElementById('filterBtn').classList.toggle('active', !noFilter);
  
  const btn = document.getElementById('genreToggleBtn');
  if (btn) btn.textContent = (cnt === 0) ? t('selectAll') : t('clear');
}

let tempGenres = null;

function openSB(){ 
  tempGenres = new Set(activeGenres);
  document.getElementById('sb').classList.add('open'); 
  document.getElementById('sbOv').classList.add('open'); 
  document.body.style.overflow='hidden'; 
}
function closeSB(){ 
  if (tempGenres) {
    activeGenres = new Set(tempGenres);
    S.f.genres = Array.from(activeGenres);
    renderGenreGrid();
    tempGenres = null;
  }
  document.getElementById('sb').classList.remove('open'); 
  document.getElementById('sbOv').classList.remove('open'); 
  document.body.style.overflow=''; 
}

function toggleGenresAll(){
  if (activeGenres.size > 0) {
    activeGenres.clear();
  } else {
    activeGenres = new Set(GENRES.map(g=>g.id));
  }
  S.f.genres = Array.from(activeGenres);
  renderGenreGrid();
}
function applyFilters(){ 
  tempGenres = null;
  closeSB(); S.page=1; savePrefs(); load(); 
}

function setView(v){
  S.view=v;
  document.getElementById('vgrid').classList.toggle('active',v==='grid');
  document.getElementById('vlist').classList.toggle('active',v==='list');
  syncStateToUrl();
  renderItems(S.items);
}

function saveCurrentAsDefaultPrefs() {
  const payload = {
    view: S.view,
    theme: S.theme,
    f: {
      sort: S.f.sort,
      days: S.f.days,
      types: Array.from(activeTypes),
      ratings: Array.from(activeRatings),
      genres: Array.from(activeGenres),
    },
  };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(payload));
    const btn = document.getElementById('defaultPrefsBtn');
    if (!btn) return;
    const origText = btn.textContent;
    btn.textContent = '保存成功！';
    btn.style.background = 'var(--success)';
    btn.style.borderColor = 'var(--success)';
    setTimeout(() => {
      btn.textContent = origText;
      btn.style.background = '';
      btn.style.borderColor = '';
    }, 2000);
  } catch (e) {}
}

function buildParams(){
  const f = S.f;
  const params = {
    appid: APPID,
    query_type: {trend:1, mostrecent:2, mostvotes:11, toprated:7, totaluniquesubscribers:16}[f.sort]||1,
    page: S.page,
    numperpage: PAGE_SIZE,
  };
  
  if(f.search) {
    if (f.search.trim().startsWith('author:')) {
      params.creator = f.search.trim().split('author:')[1].trim();
    } else {
      params.search_text = f.search;
    }
  }

  if(f.days && f.sort==='trend' && f.days!=='0') params.days = parseInt(f.days);

  params.types = (f.types && f.types.length > 0) ? f.types : TYPES.map(t=>t.id);
  params.ratings = (f.ratings && f.ratings.length > 0) ? f.ratings : RATINGS.map(t=>t.id);

  const validGenres = (f.genres||[]).filter(g=>GENRES.some(x=>x.id===g));
  if(validGenres.length > 0 && validGenres.length < GENRES.length){
    validGenres.forEach((g,i)=>{ params[`genre_or[${i}]`] = g; });
  }

  return params;
}

// 全局作者搜索跳转函数
function searchByCreator(creatorId) {
  if (!creatorId) return;
  closeModal(); // 关闭详情弹窗
  
  // 关闭其他弹窗，以露出底部的主页搜索结果
  document.querySelectorAll('.settings-modal-ov').forEach(el => el.classList.remove('open'));
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = 'author:' + creatorId;
  S.page = 1;
  S.f.search = 'author:' + creatorId;
  savePrefs();
  load(); // 触发搜索
}

let currentLoadId = 0;

async function load(){
  const loadId = ++currentLoadId;
  
  syncFiltersFromControls();
  S.loading=true;
  showLoading();
  try {
    const res  = await fetch('/api/steam/query',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({params:buildParams()})
    });

    if (loadId !== currentLoadId) return; 

    if(!res.ok){
      let serverMsg='';
      try{
        const j = await res.json();
        serverMsg = j && (j.error || j.message) ? String(j.error || j.message) : '';
      }catch{}
      throw new Error(serverMsg || `HTTP ${res.status}`);
    }
    const data = await res.json();
    
    if (loadId !== currentLoadId) return;
    
    const resp = data.response||data;
    const list = resp.publishedfiledetails||[];

    if(!list.length){
      document.getElementById('resCnt').textContent=t('resultsZero');
      if(canShowProxyGuideByFilters()){
        showError(t('noListByNetwork'));
      }else{
        showEmpty(t('noMatched'));
      }
      document.getElementById('pgn').innerHTML='';
    } else {
      S.items      = list;
      S.totalItems = parseInt(resp.total) || list.length;
      S.totalPages = Math.min(999, Math.max(1, Math.ceil(S.totalItems / PAGE_SIZE)));
      const dispTotal = S.totalItems >= 50000 ? '50,000+' : S.totalItems.toLocaleString('zh-CN');
      document.getElementById('resCnt').textContent = t('resultsApprox', { total: dispTotal, pages: S.totalPages });
      renderItems(S.items);
      renderPagination();
    }
  } catch(err){
    if (loadId !== currentLoadId) return;
    console.error(err);
    showError(err.message);
  } finally { 
    if (loadId === currentLoadId) S.loading=false; 
  }
}

function showLoading(){
  toggleDisclaimer(false);
  document.getElementById('wcon').innerHTML=`
    <div class="loading-state">
      <div class="spinner"></div>
      <span style="font-size:14px;color:var(--text3)">${t('loadingWorkshop')}</span>
      <span style="font-size:12px;color:var(--text3);margin-top:2px">${t('loadingWorkflow')}</span>
    </div>`;
  document.getElementById('pgn').innerHTML='';
}
function showEmpty(msg){
  toggleDisclaimer(false);
  document.getElementById('wcon').innerHTML=`
    <div class="empty-state"><div class="empty-icon">🖼️</div><div>${msg}</div></div>`;
}
function showError(msg){
  toggleDisclaimer(false);
  const content = `
      <div style="font-size:44px">⚠️</div>
      <div style="color:var(--danger);font-size:16px;font-weight:600">${t('loadFailed')}</div>
      <div style="font-size:13px;color:var(--text3);max-width:420px">${esc(msg)}</div>
      <button onclick="load()" style="background:var(--accent);border:none;border-radius:8px;color:#fff;padding:9px 22px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;margin-top:4px">🔄 ${t('retry')}</button>
      ${proxyTipHtml(msg)}
  `;
  document.getElementById('wcon').innerHTML=`
    <div class="empty-state" style="gap:14px">${content}</div>`;
  document.getElementById('resCnt').textContent=t('resFailed');
}
function canShowProxyGuideByFilters(){
  return !S.f.search && !S.f.type && !S.f.rating && (!S.f.genres || !S.f.genres.length || S.f.genres.length===GENRES.length);
}
function proxyTipHtml(msg){
  return `
    <div class="proxy-tip">
      <div class="proxy-title">${t('proxyTitle')}</div>
      <div class="proxy-desc">${t('proxyDesc')}</div>
      <div class="proxy-desc">${t('proxyRaw', { msg: esc(msg || t('loadFailed')) })}</div>
      <div class="proxy-actions">
        <button class="proxy-btn" onclick="load()">${t('proxyRetest')}</button>
        <button class="proxy-btn alt" onclick="copyProxyDomains()">${t('copyProxyDomains')}</button>
      </div>
    </div>`;
}
function copyProxyDomains(){
  const txt = PROXY_DOMAINS.join('\n');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast(t('copiedProxyDomains'),'ok')).catch(()=>toast(t('copyFailed'),'warn'));
    return;
  }
  toast(t('noClipboard'),'warn');
}

function renderItems(items){
  if(!items||!items.length){ showEmpty(t('emptyData')); return; }
  toggleDisclaimer(true);
  const isL = S.view==='list';
  const con  = document.getElementById('wcon');
  con.innerHTML=`<div class="wgrid ${isL?'lv':''}">${items.map((it,i)=>cardHtml(it,isL,i)).join('')}</div>`;
  
  updateAllWallButtons(); // 渲染完成后立即应用最新的按钮状态

  con.querySelectorAll('img[data-src]').forEach(img=>{
    const src = img.dataset.src;
    if (!src || src === 'PLACEHOLDER') {
      img.src = PLACEHOLDER;
      img.previousElementSibling?.remove();
      return;
    }
    const ob=new IntersectionObserver(es=>{
      es.forEach(e=>{
        if(e.isIntersecting){
          const el=e.target;
          const realSrc = el.dataset.src;
          if (!realSrc) { el.src=PLACEHOLDER; el.previousElementSibling?.remove(); ob.disconnect(); return; }
          el.src = realSrc;
          el.onload = () => { el.previousElementSibling?.remove(); };
          el.onerror = () => { el.previousElementSibling?.remove(); el.src = PLACEHOLDER; el.style.opacity='.4'; };
          ob.disconnect();
        }
      });
    },{rootMargin:'150px'});
    ob.observe(img);
  });
}

const PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100%25' height='100%25'%3E%3Crect width='100' height='100' fill='%231c2030'/%3E%3Ctext x='50' y='45' text-anchor='middle' fill='%235a6278' font-size='28'%3E🖼%3C/text%3E%3Ctext x='50' y='72' text-anchor='middle' fill='%235a6278' font-size='14'%3E暂无图片%3C/text%3E%3C/svg%3E`;
const PLACEHOLDER_LOADING = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100%25' height='100%25'%3E%3Crect width='100' height='100' fill='%231c2030'/%3E%3Ctext x='50' y='45' text-anchor='middle' fill='%234f9cf9' font-size='28'%3E⏳%3C/text%3E%3Ctext x='50' y='72' text-anchor='middle' fill='%234f9cf9' font-size='14'%3E加载中%3C/text%3E%3C/svg%3E`;

function cardHtml(item, isL, idx){
  const fid   = item.publishedfileid;
  const title = item.title || t('untitled');
  const thumb = item.preview_url || '';
  const type  = getType(item);
  const typeText = type === 'Video'
    ? t('typeVideo')
    : type === 'Web'
      ? t('typeWeb')
      : type === 'App'
        ? t('typeApp')
        : t('typeScene');
        
  // 提取收藏量和文件大小数据
  const subs  = fmtN(item.subscriptions||item.lifetime_subscriptions||0);
  const favs  = fmtN(item.favorited||item.lifetime_favorited||0);
  const size  = item.file_size ? fmtBytes(parseInt(item.file_size)) : t('unknown');
  const delay = Math.min(idx*25,400);

  return `
  <div class="card ${isL?'lv':''}" style="animation-delay:${delay}ms" onclick="openModal('${fid}')">
    <div class="card-thumb">
      <div class="skel"></div>
      <img data-src="${thumb||'PLACEHOLDER'}" data-id="${fid}" alt="${esc(title)}" loading="lazy">
      <span class="type-badge ${type.toLowerCase()}">${typeText}</span>
    </div>
    <div class="card-body">
      <div class="card-title" title="${esc(title)}">${esc(title)}</div>
      <div class="card-meta">
        <div class="card-metrics">
          <span class="cstat" title="${t('statSubs')}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            ${subs}
          </span>
          <span class="cstat" title="${t('statFavs')}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${favs}
          </span>
        </div>
        <span class="card-author" title="${t('statSize')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <span class="card-author-name">${size}</span>
        </span>
      </div>
    </div>
    <div class="card-foot">
      <button class="sub-btn" id="sub-${fid}" data-fid="${fid}" data-title="${esc(title)}" onclick="event.preventDefault();event.stopPropagation();dlWall(this.dataset.fid,this.dataset.title);return false;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        ${t('subscribe')}
      </button>
    </div>
  </div>`;
}

function renderPagination(){
  const pg=document.getElementById('pgn'), cur=S.page, tot=S.totalPages;
  if(tot<=1){ pg.innerHTML=''; return; }
  let pages=[1];
  
  // 当前页前后各展示 2 页
  if(cur>4) pages.push('…');
  for(let i=Math.max(2,cur-2);i<=Math.min(tot-1,cur+2);i++) pages.push(i);
  if(cur<tot-3) pages.push('…');
  if(tot>1) pages.push(tot);
  
  pg.innerHTML=`
    <button class="pbtn" onclick="goPage(${cur-1})" ${cur===1?'disabled':''}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>${t('prevPage')}</button>
    ${pages.map(p=>p==='…'
      // 省略号点击跳转页码
      ?`<button class="pbtn" onclick="promptPageJump()" title="输入页码跳转">…</button>`
      :`<button class="pbtn ${p===cur?'cur':''}" onclick="goPage(${p})">${p}</button>`
    ).join('')}
    <button class="pbtn" onclick="goPage(${cur+1})" ${cur===tot?'disabled':''}>${t('nextPage')}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>`;
}

function goPage(p){ 
  if(p<1||p>S.totalPages||p===S.page) return; 
  S.page=p; 
  window.scrollTo({top:0,behavior:'smooth'}); 
  savePrefs();
  load(); 
}

// 手动输入页码跳转功能
function promptPageJump(){
  const ov = document.getElementById('jumpModalOv');
  const input = document.getElementById('jumpPageInput');
  const hint = document.getElementById('jumpPageHint');
  const title = document.getElementById('jumpModalTitle');
  const cancelBtn = document.getElementById('jumpCancelBtn');
  const submitBtn = document.getElementById('jumpSubmitBtn');
  
  if(ov && input && hint){
    title.textContent = '跳转页码';
    cancelBtn.textContent = '取消';
    submitBtn.textContent = '跳转';
    hint.textContent = `请输入页码 (1 - ${S.totalPages})`;
    
    input.max = S.totalPages;
    input.value = S.page;
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // 延迟聚焦，防止弹窗动画打断输入
    setTimeout(() => { input.focus(); input.select(); }, 100);
    
    // 支持直接按回车键跳转
    input.onkeydown = (e) => {
      if (e.key === 'Enter') submitPageJump();
    };
  }
}

// 关闭弹窗
function closeJumpModal(){
  const ov = document.getElementById('jumpModalOv');
  if(ov) {
    ov.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// 提交跳转
function submitPageJump(){
  const input = document.getElementById('jumpPageInput');
  if(input){
    const p = parseInt(input.value.trim());
    if(!isNaN(p) && p >= 1 && p <= S.totalPages){
      closeJumpModal();
      goPage(p);
    } else {
      toast('无效的页码', 'warn');
    }
  }
}

function openModal(id, fallbackTitle='', fallbackThumb=''){
  let item = S.items.find(w=>String(w.publishedfileid)===String(id));
  if(!item) {
    item = { publishedfileid: String(id), title: fallbackTitle, preview_url: fallbackThumb };
  }

  currentModalItem = { id, title: item.title };
  const isVideo = getType(item) === 'Video';

  const thumb = item.preview_url||'';
  document.getElementById('mTitle').textContent = item.title||t('untitled');
  const cid = item.creator || '';
  const authorHtml = cid 
    ? `<span style="cursor:pointer; color:var(--accent); text-decoration:underline;" onclick="searchByCreator('${cid}')" title="搜TA的作品">${t('authorLoading')} 🔍</span>`
    : `<span>${t('authorLoading')}</span>`;
  document.getElementById('mSub').innerHTML = `<span>🆔 ${id}</span>${authorHtml}`;
  document.getElementById('mImg').src   = thumb||PLACEHOLDER;
  document.getElementById('mImg').style.display = '';
  
  // 注入弹窗顶部的类型贴纸
  const mType = getType(item);
  const typeText = mType === 'Video' ? '视频' : (mType === 'Web' ? '网站' : (mType === 'App' ? '应用' : '场景'));
  const badgeEl = document.getElementById('mTypeBadge');
  if (badgeEl) {
    badgeEl.className = `type-badge ${mType.toLowerCase()}`;
    badgeEl.textContent = typeText;
    badgeEl.style.display = '';
  }

  document.getElementById('mDesc').textContent = item.short_description||t('loadingDesc');
  document.getElementById('mSteam').href = `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`;
  
  // 给弹窗按钮赋予数据集，并立即刷新状态
  const mSubBtn = document.getElementById('mSubBtn');
  if (mSubBtn) {
    mSubBtn.dataset.fid = id;
    mSubBtn.dataset.title = item.title || t('untitled');
  }
  updateAllWallButtons();

  renderStats({
    subs:  fmtN(item.subscriptions||item.lifetime_subscriptions||0),
    favs:  fmtN(item.favorited||item.lifetime_favorited||0),
    views: fmtN(item.views||0),
    size:  item.file_size ? fmtBytes(parseInt(item.file_size)) : t('loadingData'),
    upd:   item.time_updated ? fmtTime(item.time_updated) : t('loadingData'),
    id,
  });

  const tags=(item.tags||[]).map(t=>t.tag||t).filter(Boolean);
  document.getElementById('mTags').innerHTML = tags.map(t=>`<span class="tag-chip">${esc(t)}</span>`).join('');

  document.getElementById('mCmts').innerHTML=`<div class="cmt-spin"><div class="spinner-sm"></div>${t('loadingCmts')}</div>`;

  document.getElementById('mOv').classList.add('open');
  document.body.style.overflow='hidden';
  
  // 清除详情页的滚动记忆，强制回到顶部
  const modalBody = document.querySelector('#mOv .modal-body');
  if (modalBody) modalBody.scrollTop = 0;

  fetch(`/api/steam/details?id=${id}`)
    .then(r=>{ if(!r.ok) throw new Error(`${r.status}`); return r.json(); })
    .then(d=>{
      const tags=(item.tags||[]).map(t=>t.tag||t).filter(Boolean);
      document.getElementById('mTags').innerHTML = tags.map(t=>`<span class="tag-chip">${esc(translateTag(t))}</span>`).join('');
      if(d.author || item.author) {
        const finalCid = d.creator || item.creator || '';
        const finalAuthor = esc(d.author || item.author || t('unknown'));
        const aHtml = finalCid 
          ? `<span style="cursor:pointer; color:var(--accent); text-decoration:underline;" onclick="searchByCreator('${finalCid}')" title="搜TA的作品">作者: ${finalAuthor} 🔍</span>`
          : `<span>作者: ${finalAuthor}</span>`;
        document.getElementById('mSub').innerHTML=`<span>🆔 ${id}</span>${aHtml}`;
      }
      if(d.tags && d.tags.length) document.getElementById('mTags').innerHTML=d.tags.map(t=>`<span class="tag-chip">${esc(translateTag(t))}</span>`).join('');
      renderStats({
        subs:  d.subscriptions || fmtN(item.subscriptions||0),
        favs:  d.favorited     || fmtN(item.favorited||0),
        views: d.views         || fmtN(item.views||0),
        size:  (d.file_size && d.file_size !== t('unknown')) ? d.file_size : (item.file_size ? fmtBytes(parseInt(item.file_size)) : t('unknown')),
        upd:   (d.time_updated && d.time_updated !== t('unknown')) ? d.time_updated : (item.time_updated ? fmtTime(item.time_updated) : t('unknown')),
        id,
      });
      renderCmts(d.comments||[]);
    })
    .catch(err=>{
      console.warn('[Detail]',err.message);
      document.getElementById('mDesc').textContent = item.short_description || '暂无详细描述';
      renderStats({
        subs:  fmtN(item.subscriptions||item.lifetime_subscriptions||0),
        favs:  fmtN(item.favorited||item.lifetime_favorited||0),
        views: fmtN(item.views||0),
        size:  item.file_size ? fmtBytes(parseInt(item.file_size)) : t('unknown'),
        upd:   item.time_updated ? fmtTime(item.time_updated) : t('unknown'),
        id,
      });
      renderCmts([]);
    });
}

function renderStats(d){
  document.getElementById('mStats').innerHTML=`
    <div class="msi"><div class="msi-ico">❤️</div><div class="msi-val">${d.subs}</div><div class="msi-lbl">${t('statSubs')}</div></div>
    <div class="msi"><div class="msi-ico">⭐</div><div class="msi-val">${d.favs}</div><div class="msi-lbl">${t('statFavs')}</div></div>
    <div class="msi"><div class="msi-ico">👁️</div><div class="msi-val">${d.views}</div><div class="msi-lbl">${t('statViews')}</div></div>
    <div class="msi"><div class="msi-ico">📦</div><div class="msi-val">${d.size}</div><div class="msi-lbl">${t('statSize')}</div></div>
    <div class="msi"><div class="msi-ico">🕒</div><div class="msi-val" style="font-size:11px">${d.upd}</div><div class="msi-lbl">${t('statUpdated')}</div></div>
    <div class="msi"><div class="msi-ico">🆔</div><div class="msi-val" style="font-size:10px;word-break:break-all">${d.id}</div><div class="msi-lbl">${t('statFileId')}</div></div>`;
}

function renderCmts(list){
  const el=document.getElementById('mCmts');
  if(!list.length){ el.innerHTML=`<div class="cmt-empty">${t('noComments')}</div>`; return; }
  el.innerHTML=list.map(c=>`
    <div class="cmt">
      <div class="cmt-head"><span class="cmt-author">${esc(c.author||t('steamUser'))}</span><span class="cmt-date">${esc(c.date||'')}</span></div>
      <div class="cmt-text">${esc(c.text||'')}</div>
    </div>`).join('');
}

function closeModal(){
  document.getElementById('mOv').classList.remove('open');
  document.body.style.overflow='';
}
function mOvClick(e){ if(e.target===document.getElementById('mOv')) closeModal(); }

function dlWall(fid, title){
  const btn=document.getElementById(`sub-${fid}`);
  if(btn){
    btn.classList.add('dling');
    btn.innerHTML=`<i>⏳</i> 加入队列中`;
  }
  fetch(`/api/download?id=${fid}&title=${encodeURIComponent(title||'')}`)
    .then(async r=>{
      const j = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      toast(j.message || '已加入后台下载队列', 'ok');
      if(btn){
        btn.classList.remove('dling');
        btn.classList.add('done');
        btn.innerHTML=`<i>✓</i> 已排队`;
      }
      fetchQueue(); // 加入后立刻刷新一次面板
    })
    .catch(e=>{
      toast(t('downloadFailed', { msg: e.message }), 'warn');
      if(btn){ btn.classList.remove('dling'); btn.innerHTML=`<i>⚠</i> 失败`; }
    });
}

function getType(item){
  const ts=(item.tags||[]).map(t=>(t.tag||t).toLowerCase());
  if(ts.includes('video'))       return 'Video';
  if(ts.includes('scene'))       return 'Scene';
  if(ts.includes('application')) return 'App';
  if(ts.includes('web'))         return 'Web';
  return 'Scene';
}
function toggleDisclaimer(visible){
  const el = document.querySelector('.site-disclaimer');
  if (!el) return;
  el.hidden = !visible;
}
function fmtN(n){ n=parseInt(n)||0; if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1e3) return (n/1e3).toFixed(1)+'K'; return n.toString(); }
function fmtBytes(b){ b=parseInt(b)||0; if(!b) return t('unknown'); if(b>=1073741824) return (b/1073741824).toFixed(1)+' GB'; if(b>=1048576) return (b/1048576).toFixed(1)+' MB'; if(b>=1024) return (b/1024).toFixed(1)+' KB'; return b+' B'; }
function fmtTime(ts){ ts=parseInt(ts); if(!ts) return t('unknown'); return new Date(ts*1000).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function toast(msg,type='info'){
  const wrap=document.getElementById('toasts');
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span class="ti">${type==='ok'?'✓':type==='warn'?'⚠':'↗'}</span>${msg}`;
  wrap.appendChild(el);
  setTimeout(()=>el.remove(),2700);
}

// ─────────────────────────────────────────────────────────────────
//  Steam Login Functions
// ─────────────────────────────────────────────────────────────────
let currentModalItem = null;

async function checkSteamLoginStatus(){
  try {
    const res = await fetch('/api/steam/status');
    if(!res.ok) return;
    const data = await res.json();
    updateLoginButton(data.loggedIn, data.username);
  } catch(e) {
    console.warn('[Steam Status]', e.message);
  }
}

function updateLoginButton(loggedIn, username){
  const btn = document.getElementById('settingsLoginBtn');
  const txt = document.getElementById('settingsLoginText');
  if(!btn || !txt) return;
  
  if(loggedIn){
    btn.classList.add('logged-in');
    txt.textContent = `已登录: ${username || 'Steam用户'} (点击退出)`;
    btn.onclick = showLogoutConfirm;
    // 匹配 API 按钮的已激活(红色)风格
    btn.style.background = 'var(--danger)';
    btn.style.borderColor = 'var(--danger)';
    btn.style.color = '#fff';
  } else {
    btn.classList.remove('logged-in');
    txt.textContent = '登录 Steam 账号';
    btn.onclick = openLoginModal;
    // 恢复默认风格
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
  }
}

function showLogoutConfirm(){
  const ov = document.getElementById('logoutConfirmModalOv');
  if (ov) {
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeLogoutConfirmModal(){
  const ov = document.getElementById('logoutConfirmModalOv');
  if (ov) {
    ov.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function submitLogoutConfirm(){
  closeLogoutConfirmModal();
  logoutSteam();
}

async function logoutSteam(){
  try {
    const res = await fetch('/api/steam/logout', { method: 'POST' });
    if(!res.ok) throw new Error('退出失败');
    const data = await res.json();
    toast(data.message || '已退出登录', 'ok');
    updateLoginButton(false, null);
  } catch(e) {
    toast('退出失败: ' + e.message, 'warn');
  }
}

function openLoginModal(){
  document.getElementById('loginModalOv').classList.add('open');
  document.body.style.overflow='hidden';
  document.getElementById('steamUsername').value = '';
  document.getElementById('steamPassword').value = '';
  document.getElementById('steamGuardCode').value = '';
  
  // 隐藏 Steam Guard 输入框
  const guardGroup = document.getElementById('steamGuardGroup');
  if(guardGroup) guardGroup.style.display = 'none';
  
  // 重置按钮文字
  const btn = document.getElementById('loginSubmitBtn');
  if(btn) btn.textContent = '登录';
  
  document.getElementById('steamUsername').focus();
}

function closeLoginModal(){
  document.getElementById('loginModalOv').classList.remove('open');
  document.body.style.overflow='';
}

function loginModalOvClick(e){
  if(e.target === document.getElementById('loginModalOv')) closeLoginModal();
}

async function submitSteamLogin(){
  const username = document.getElementById('steamUsername').value.trim();
  const password = document.getElementById('steamPassword').value.trim();
  const steamGuardCode = document.getElementById('steamGuardCode').value.trim();
  const guardGroup = document.getElementById('steamGuardGroup');
  const isRetry = guardGroup && guardGroup.style.display !== 'none';
  
  if(!username || !password){
    toast('请输入用户名和密码', 'warn');
    return;
  }
  
  const btn = document.getElementById('loginSubmitBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = isRetry ? '验证中...' : '登录验证中...';
  
  try {
    const res = await fetch('/api/steam/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, steamGuardCode, isRetry })
    });
    
    const data = await res.json();
    
    if(res.status === 202 && data.needsSteamGuard){
      // 需要 Steam Guard 验证码
      toast('请输入 Steam Guard 验证码', 'info');
      if(guardGroup) {
        guardGroup.style.display = '';
        document.getElementById('steamGuardCode').focus();
      }
      btn.disabled = false;
      btn.textContent = '提交验证码';
      return;
    }
    
    if(!res.ok){
      throw new Error(data.error || '登录失败');
    }
    
    toast(data.message || '登录成功', 'ok');
    updateLoginButton(true, username);
    closeLoginModal();
  } catch(e) {
    console.error('[Login Error]', e);
    toast(e.message || '登录失败，请检查账号信息', 'warn');
  } finally {
    if(btn.textContent !== '提交验证码') {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

// --- 下载队列前端逻辑 ---
document.addEventListener('DOMContentLoaded', () => {
  const queueBtn = document.getElementById('queueBtn');
  if (queueBtn) {
    queueBtn.addEventListener('click', () => {
      document.getElementById('queueModalOv').classList.add('open');
      fetchQueue();
    });
  }
  
  // 本地库
  const libraryBtn = document.getElementById('libraryBtn');
  if (libraryBtn) {
    libraryBtn.addEventListener('click', () => {
      document.getElementById('libraryModalOv').classList.add('open');
      if (libBatchMode) toggleLibBatchMode();
      fetchLibrary();
    });
  }

  // 每 1.5 秒轮询一次后端队列状态
  setInterval(fetchQueue, 1500);
});

let downloadedMap = {};
let currentQueueTasks = [];

// 核心修复：统一下载状态接管器
function updateAllWallButtons() {
  document.querySelectorAll('.sub-btn, #mSubBtn').forEach(btn => {
    const fid = btn.dataset.fid;
    if (!fid) return;

    const isModal = btn.id === 'mSubBtn';
    const dlFileName = downloadedMap[fid];
    const task = currentQueueTasks.find(t => String(t.id) === String(fid));

    btn.removeAttribute('onclick');
    btn.style.pointerEvents = 'auto';
    
    // 注入标识，供触控长按检测使用
    btn.dataset.playName = dlFileName || '';

    if (dlFileName) {
       btn.className = (isModal ? 'btn-p ' : 'sub-btn ') + 'done';
       btn.style.background = 'var(--success)';
       btn.style.borderColor = 'var(--success)';
       btn.style.color = '#fff';

       if (dlFileName.match(/\.(mp4|webm|mov|mkv|ogg)$/i)) {
         btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> 播放`;
         btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); playLibraryItem(dlFileName); };
         // 右键呼出菜单
         btn.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); showPlayerMenu(e, dlFileName); return false; };
       } else {
         btn.innerHTML = `<i style="font-style:normal; margin-right:4px; font-weight:bold;">✓</i> 已下载`;
         btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toast('该壁纸已打包下载，请在本地图库中查看', 'ok'); };
       }
    } else if (task && task.status !== 'error' && task.status !== 'completed' && task.status !== 'cancelled') {
       btn.className = (isModal ? 'btn-p ' : 'sub-btn ') + 'dling';
       btn.style.background = 'var(--warn)';
       btn.style.borderColor = 'var(--warn)';

       // 更新状态
       let statusText = '已排队';
       if (task.status === 'downloading') {
         statusText = '下载中';
       } else if (task.status === 'moving') {
         statusText = '转移中';
       }

       btn.innerHTML = `<i style="font-style:normal; margin-right:4px;">⏳</i> ${statusText}`;
       btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toast('已在下载队列中，请在队列面板查看', 'info'); };
    } else {
       btn.className = isModal ? 'btn-p' : 'sub-btn';
       btn.style.background = '';
       btn.style.borderColor = '';
       btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ${isModal ? '订阅 / 下载壁纸' : '订阅'}`;
       btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if(isModal) closeModal(); dlWall(fid, btn.dataset.title); };
    }
  });
}

async function fetchQueue() {
  try {
    const res = await fetch('/api/queue');
    if (!res.ok) return;

    const data = await res.json();
    const list = data.tasks || [];
    
    // 更新全局数据并刷新界面按钮
    currentQueueTasks = list;
    if (data.downloadedMap) downloadedMap = data.downloadedMap;
    updateAllWallButtons();

    // 字节单位换算函数
    const formatBytes = (b) => {
      if (!b || isNaN(b)) return '0 B';
      const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(b) / Math.log(k));
      return (b / Math.pow(k, i)).toFixed(1) + sizes[i];
    };

    // 顶部 Docker 实时网速
    const speedEl = document.getElementById('sysNetSpeed');
    if (speedEl) speedEl.textContent = '↓ ' + formatBytes(data.rxSpeed) + '/s';

    // 渲染铃铛右上角的数字
    const activeCount = list.filter(t => t.status === 'pending' || t.status === 'downloading').length;
    const badge = document.getElementById('queueBadge');
    if (badge) {
      if (activeCount > 0) { badge.style.display = 'block'; badge.textContent = activeCount; }
      else { badge.style.display = 'none'; }
    }

    if (!document.getElementById('queueModalOv').classList.contains('open')) return;

    const container = document.getElementById('queueList');
    if (!list.length) {
      container.innerHTML = '<div style="text-align:center; color:var(--text3); padding:30px;">当前队列空空如也 🍃</div>';
      return;
    }

    container.innerHTML = list.map(t => {
      // 状态映射
      const sMap = { 'completed': '已完成', 'downloading': '下载中', 'moving': '转移中', 'paused': '已暂停', 'error': '错误', 'pending': '等待中' };
      const sText = sMap[t.status] || t.status;
      
      // 数据处理
      let pct = typeof t.progress === 'number' ? t.progress.toFixed(1) : '0.0';
      const sizeStr = t.total > 0 ? `${formatBytes(t.downloaded)} / ${formatBytes(t.total)}` : (t.downloaded > 0 ? formatBytes(t.downloaded) : '');
      
      // 队列的点击逻辑，并根据类型渲染左上角的标签贴纸
      const previewUrl = t.thumb || '';
      const safeTitle = esc(t.title || t.id).replace(/'/g, "\\'");
      const isDone = t.status === 'completed';
      const dlFileName = downloadedMap && downloadedMap[t.id];
      
      const thumbAction = (isDone && dlFileName) ? `onclick="playLibraryItem('${esc(dlFileName)}')" title="播放视频"` : `onclick="toast('尚未下载完成', 'warn')" title="尚未完成"`;
      const titleAction = `onclick="openModal('${t.id}', '${safeTitle}')" style="cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text)'" title="查看详情"`;

      let typeName = t.type === 'Video' ? '视频' : (t.type === 'Web' ? '网站' : (t.type === 'App' ? '应用' : '场景'));
      let tClass = t.type ? t.type.toLowerCase() : (t.isVideo ? 'video' : 'scene');
      if(!t.type && t.isVideo) typeName = '视频';
      const typeBadge = `<span class="type-badge ${tClass}" style="position:absolute; top:2px; left:2px; transform:scale(0.85); transform-origin:top left; pointer-events:none;">${typeName}</span>`;

      const thumbHtml = previewUrl 
        ? `<div style="position:relative; display:inline-block; flex-shrink:0;"><img src="${previewUrl}" class="q-thumb" ${thumbAction} style="cursor:pointer;" onerror="this.src='${PLACEHOLDER}'">${typeBadge}</div>` 
        : `<div style="position:relative; display:inline-block; flex-shrink:0;"><div class="q-thumb" ${thumbAction} style="cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:24px;">📄</div>${typeBadge}</div>`;

      return `
      <div class="q-item">
        ${thumbHtml}
        <div class="q-content" style="flex: 1; min-width: 0;">
          <div class="q-head">
            <span class="q-title" ${titleAction}>${esc(t.title || t.id)}</span>
            <span class="q-status ${t.status}">${sText}</span>
          </div>
          
          ${t.errorMsg ? `<div style="font-size:12px; color:var(--danger); margin-top:-4px; margin-bottom:4px;">${esc(t.errorMsg)}</div>` : ''}

          <div class="q-bar-wrap">
            <div class="q-bar-bg"><div class="q-bar-fill" style="width:${pct}%"></div></div>
            <div class="q-info">
              <span>${sizeStr}</span>
              <span>${pct}%</span>
            </div>
          </div>

          <div class="q-actions">
            <div class="q-updown" style="margin-right: auto;">
              <button class="q-btn q-btn-half top" title="上移" onclick="qAction('up', ${t.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg></button>
              <button class="q-btn q-btn-half btm" title="下移" onclick="qAction('down', ${t.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg></button>
            </div>
            
            ${t.status === 'completed' ? `<button class="q-btn" onclick="qAction('cancel', ${t.id})">清理</button>` : ''}
            ${t.status !== 'completed' ? `<button class="q-btn danger" onclick="promptCancelTask(${t.id})">取消</button>` : ''}
            ${(t.status === 'downloading' || t.status === 'pending') ? `<button class="q-btn warn" onclick="qAction('pause', ${t.id})">暂停</button>` : ''}
            ${t.status === 'paused' ? `<button class="q-btn success" onclick="qAction('resume', ${t.id})">继续</button>` : ''}
            ${t.status === 'error' ? `<button class="q-btn success" onclick="qAction('resume', ${t.id})">重试</button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('Fetch queue error:', e);
  }
}

async function qAction(action, id) {
  try {
    await fetch('/api/queue/action', {
      method: 'POST',
      body: JSON.stringify({ action, id })
    });
    fetchQueue(); // 操作后立刻刷新UI
  } catch (e) {
    console.error('Queue action failed:', e);
  }
}

// 取消确认弹窗控制逻辑
let cancelTargetId = null;

// 触发弹出确认框
function promptCancelTask(id) {
  cancelTargetId = id;
  const ov = document.getElementById('confirmModalOv');
  if (ov) {
    ov.classList.add('open');
    document.body.style.overflow = 'hidden'; // 防止背景滚动
  }
}

// 关闭确认框
function closeConfirmModal() {
  cancelTargetId = null;
  const ov = document.getElementById('confirmModalOv');
  if (ov) {
    ov.classList.remove('open');
    document.body.style.overflow = ''; // 恢复背景滚动
  }
}

// 在弹窗里点击了“确定取消”
function submitConfirmCancel() {
  if (cancelTargetId !== null) {
    qAction('cancel', cancelTargetId); // 真正执行取消操作
    closeConfirmModal(); // 关掉弹窗
  }
}

let libraryDeleteTarget = null;
let libBatchMode = false;
let libSelected = new Set();

// 批量操作控制逻辑
function toggleLibBatchMode() {
  libBatchMode = !libBatchMode;
  libSelected.clear();
  document.getElementById('libBatchBtn').textContent = libBatchMode ? '退出批量' : '批量操作';
  document.getElementById('libBatchAction').style.display = libBatchMode ? 'flex' : 'none';
  document.getElementById('libBatchCount').textContent = '0';

  document.querySelectorAll('.lib-batch-chk').forEach(el => {
    el.style.display = libBatchMode ? 'block' : 'none';
    el.checked = false;
  });
  document.querySelectorAll('.lib-del-btn, .lib-play-btn').forEach(el => {
    el.style.display = libBatchMode ? 'none' : 'flex';
  });
  document.querySelectorAll('.q-item .q-thumb').forEach(el => {
    el.style.cursor = libBatchMode ? 'default' : 'pointer';
  });
}

let currentPlayName = '';
let vInited = false;
let hideCtrlTimer = null;

// 播放器接管逻辑
function initVideoControls() {
  if (vInited) return;
  vInited = true;

  const wrap = document.getElementById('v-player-wrap');
  const video = document.getElementById('libVideoPlayer');
  const playBtn = document.getElementById('v-playpause');
  const timeDisp = document.getElementById('v-time');
  const progWrap = document.getElementById('v-progress-wrap');
  const progFill = document.getElementById('v-progress-fill');
  const speedBtn = document.getElementById('v-speed');
  const muteBtn = document.getElementById('v-mute');
  const volSlider = document.getElementById('v-vol-slider');
  const fsBtn = document.getElementById('v-fullscreen');
  const dlBtn = document.getElementById('v-download');

  // 图标库
  const svgPlay = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  const svgPause = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  const svgVolHigh = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  const svgVolMute = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

  playBtn.innerHTML = svgPause;
  muteBtn.innerHTML = svgVolHigh;

  // 1. 唤醒与自动隐藏控制栏 (3秒不动则隐藏)
  wrap.wake = () => {
    wrap.classList.remove('v-idle');
    wrap.style.cursor = 'default';
    clearTimeout(hideCtrlTimer);
    hideCtrlTimer = setTimeout(() => {
      if (!video.paused) { wrap.classList.add('v-idle'); wrap.style.cursor = 'none'; }
    }, 3000);
  };
  // 防止手机端触摸屏幕时产生假的鼠标移动事件，从而引发UI闪烁
  wrap.onmousemove = () => { if (!isTouch) wrap.wake(); };

  let isTouch = false;
  wrap.addEventListener('touchstart', () => { isTouch = true; }, { passive: true });

  // 2. 播放/暂停控制与双端逻辑解耦
  const togglePlay = () => { video.paused ? video.play() : video.pause(); wrap.wake(); };
  playBtn.onclick = togglePlay;
  
  let clickTimer = null;

  // 使用同一个延迟器彻底分离单击与双击事件
  video.onclick = (e) => {
    e.preventDefault();
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      if (!isTouch) fsBtn.onclick(); // 电脑端：双击全屏
      else togglePlay();             // 手机端：双击播放/暂停
    } else {
      clickTimer = setTimeout(() => {
        clickTimer = null;
        if (!isTouch) {
          togglePlay();              // 电脑端：单击播放/暂停
        } else {
          // 手机端：单击屏幕显示/隐藏所有控制按钮
          if (wrap.classList.contains('v-idle')) {
            wrap.wake();
          } else {
            wrap.classList.add('v-idle');
            wrap.style.cursor = 'none';
            clearTimeout(hideCtrlTimer);
          }
        }
      }, 250);
    }
  };
  video.ondblclick = null;

  video.addEventListener('play', () => { playBtn.innerHTML = svgPause; wrap.wake(); });
  video.addEventListener('pause', () => { playBtn.innerHTML = svgPlay; wrap.wake(); });

  // 3. 时间与进度条
  const fmt = (s) => {
    if (isNaN(s)) return '00:00';
    const m = Math.floor(s/60).toString().padStart(2,'0'), sec = Math.floor(s%60).toString().padStart(2,'0');
    return `${m}:${sec}`;
  };
  video.addEventListener('timeupdate', () => {
    const cur = video.currentTime, tot = video.duration || 0;
    timeDisp.textContent = `${fmt(cur)} / ${fmt(tot)}`;
    progFill.style.width = tot ? `${(cur/tot)*100}%` : '0%';
  });
  progWrap.onclick = (e) => {
    const r = progWrap.getBoundingClientRect();
    video.currentTime = ((e.clientX - r.left) / r.width) * video.duration;
    wrap.wake();
  };

  // 4. 音量、倍速菜单与全屏
  const speedItems = document.querySelectorAll('.v-speed-item');
  speedItems.forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      const spd = parseFloat(item.dataset.spd);
      video.playbackRate = spd;
      speedBtn.textContent = `${spd}x`;
      speedItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const group = item.closest('.v-speed-group');
      group.classList.add('temp-hide');

      if (isTouch) {
        setTimeout(() => {
          document.addEventListener('touchstart', () => group.classList.remove('temp-hide'), { once: true });
        }, 100);
      } else {
        setTimeout(() => group.classList.remove('temp-hide'), 300);
      }
      wrap.wake();
    };
  });
  volSlider.oninput = (e) => { video.volume = e.target.value; video.muted = (video.volume == 0); muteBtn.innerHTML = video.muted ? svgVolMute : svgVolHigh; wrap.wake(); };
  muteBtn.onclick = () => { video.muted = !video.muted; if(!video.muted && video.volume == 0) { video.volume = 0.5; volSlider.value = 0.5; } muteBtn.innerHTML = video.muted ? svgVolMute : svgVolHigh; wrap.wake(); };
  fsBtn.onclick = () => { document.fullscreenElement ? document.exitFullscreen() : wrap.requestFullscreen().catch(()=>{}); wrap.wake(); };


  // 5. 电脑键盘快捷键 (空格播放，左右键进退5秒)
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('videoModalOv').classList.contains('open')) return;
    wrap.wake();
    if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); }
    if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration, video.currentTime + 5); }
    if (e.key === 'Escape') closeVideoModal();
  });

  // 6. 手机端极客体验：手指左右划动调节进度条 (划满一屏=120秒)
  let tStartX = 0, tStartT = 0, isTouching = false;
  wrap.addEventListener('touchstart', e => {
    if (e.target.closest('.v-ctrl')) return; 
    tStartX = e.touches[0].clientX;
    tStartT = video.currentTime;
    isTouching = true;
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (!isTouching) return;
    e.preventDefault(); 
    const delta = e.touches[0].clientX - tStartX;
    if (Math.abs(delta) > 10) wrap.wake();
    video.currentTime = Math.max(0, Math.min(video.duration, tStartT + (delta / window.innerWidth) * 120));
  }, { passive: false });
  wrap.addEventListener('touchend', () => isTouching = false);

  // 7. 左上角下载按钮
  dlBtn.onclick = () => { if (currentPlayName) downloadLibraryItem(currentPlayName, false); };
}

// 播放器跳转与变量渲染核心
function playLibraryItem(name, forcePlayerId = null) {
  const playerId = forcePlayerId || GLOBAL_DEFAULT_PLAYER;
  const player = GLOBAL_PLAYERS.find(p => p.id === playerId);

  if (playerId === 'builtin' || !player) {
    if (name.endsWith('.zip')) return toast('非视频文件无法直接播放', 'warn');
    if (!name.match(/\.(mp4|webm|mov|mkv|ogg)$/i)) return toast('当前文件不支持直接播放', 'warn');

    currentPlayName = name;
    initVideoControls();

    const ov = document.getElementById('videoModalOv');
    const video = document.getElementById('libVideoPlayer');
    const wrap = document.getElementById('v-player-wrap');
    
    video.src = `/api/library/play?name=${encodeURIComponent(name)}`;
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // 每次打开新视频强制恢复到 1.0x
    video.playbackRate = 1.0;
    const speedBtn = document.getElementById('v-speed');
    if (speedBtn) speedBtn.textContent = '1.0x';
    document.querySelectorAll('.v-speed-item').forEach(i => {
      if (i.dataset.spd === '1') i.classList.add('active');
      else i.classList.remove('active');
    });

    video.play().catch(()=>{});
    
    if (wrap.wake) wrap.wake();
    history.pushState({ videoOpen: true }, '');
  } else {
    // 解析自定义 URL scheme
    const fullPath = window.location.origin + '/api/library/play/' + encodeURIComponent(name) + '?name=' + encodeURIComponent(name);
    
    // 判断模板中是否包含动态执行脚本标签 <cmd>
    if (player.template.includes('<cmd>')) {
      toast(`正在后台动态解析 [${player.name}] 专属ID，请稍候...`, 'info');
      fetch('/api/library/resolve_url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: player.template, name: name, fullPath: fullPath })
      }).then(r => r.json()).then(data => {
        if (data.error) return toast('动态解析失败: ' + data.error, 'warn');
        
        const targetUrl = data.url;
        if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
          window.open(targetUrl, '_blank');
        } else {
          window.location.href = targetUrl;
        }
        toast(`正在唤起 [${player.name}] ...`, 'ok');
      }).catch(e => toast('请求解析服务失败', 'warn'));
      return;
    }

    // 静态替换逻辑
    let targetUrl = player.template
      .replace(/\{url\}/g, fullPath)
      .replace(/\{name\}/g, encodeURIComponent(name));
      
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      window.open(targetUrl, '_blank');
    } else {
      window.location.href = targetUrl;
    }
    toast(`正在唤起 [${player.name}] ...`, 'ok');
  }
}

window.ignoreNextPop = false;

function closeVideoModal(fromPopState = false) {
  const ov = document.getElementById('videoModalOv');
  const player = document.getElementById('libVideoPlayer');
  if (ov && player) {
    ov.classList.remove('open');

    const mOv = document.getElementById('mOv');
    if (!mOv || !mOv.classList.contains('open')) {
        document.body.style.overflow = '';
    }

    player.pause();
    player.src = ''; 
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});

    if (!fromPopState && history.state && history.state.videoOpen) {
      window.ignoreNextPop = true;
      history.back();
    }
  }
}

window.addEventListener('popstate', (e) => {
  if (window.ignoreNextPop) {
    window.ignoreNextPop = false;
    e.stopImmediatePropagation();
    return;
  }
  const videoOv = document.getElementById('videoModalOv');
  if (videoOv && videoOv.classList.contains('open')) {
    e.stopImmediatePropagation();
    closeVideoModal(true);
  }
}, true);

function toggleLibSelect(name, checked) {
  if (checked) libSelected.add(name);
  else libSelected.delete(name);
  document.getElementById('libBatchCount').textContent = libSelected.size;
}

function submitLibBatchDelete() {
  if (libSelected.size === 0) return toast('未选择任何壁纸', 'warn');
  // 统一样式的防误触确认框
  document.getElementById('libBatchDeleteCount').textContent = libSelected.size;
  document.getElementById('libBatchDeleteConfirmModalOv').classList.add('open');
  document.body.style.overflow = 'hidden'; 
}

function closeLibBatchDeleteModal() {
  const ov = document.getElementById('libBatchDeleteConfirmModalOv');
  if (ov) {
    ov.classList.remove('open');
    document.body.style.overflow = ''; 
  }
}

async function executeLibBatchDelete() {
  closeLibBatchDeleteModal();
  try {
    const res = await fetch('/api/library/delete_batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: Array.from(libSelected) })
    });
    if (res.ok) {
      toast('批量删除成功', 'ok');

      document.querySelectorAll('#libraryList .q-item').forEach(el => {
        const chk = el.querySelector('.lib-batch-chk');
        if (chk && chk.checked) el.remove();
      });
      
      libSelected.clear();
      toggleLibBatchMode(); 

      const container = document.getElementById('libraryList');
      if (container && container.querySelectorAll('.q-item').length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text3); padding:30px;">本地库空空如也 🍃</div>';
      }
    } else {
      toast('部分删除失败', 'warn');
    }
  } catch (e) {
    toast('网络请求失败', 'warn');
  }
}

function deleteLibraryItem(name) {
  libraryDeleteTarget = name;
  const ov = document.getElementById('libraryDeleteConfirmModalOv');
  const nameEl = document.getElementById('libraryDeleteTargetName');
  if (ov && nameEl) {
    nameEl.textContent = name;
    ov.classList.add('open');
    document.body.style.overflow = 'hidden'; 
  }
}

function closeLibraryDeleteModal() {
  libraryDeleteTarget = null;
  const ov = document.getElementById('libraryDeleteConfirmModalOv');
  if (ov) {
    ov.classList.remove('open');
    document.body.style.overflow = ''; 
  }
}

async function submitLibraryDelete() {
  if (!libraryDeleteTarget) return;
  const name = libraryDeleteTarget;
  closeLibraryDeleteModal();
  
  try {
    const res = await fetch('/api/library/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      toast('删除成功', 'ok');

      document.querySelectorAll('#libraryList .q-item').forEach(el => {
        if (el.innerHTML.includes(`deleteLibraryItem('${name}')`)) {
          el.remove();
        }
      });

      const container = document.getElementById('libraryList');
      if (container && container.querySelectorAll('.q-item').length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text3); padding:30px;">本地库空空如也 🍃</div>';
      }
    } else {
      const data = await res.json();
      toast(data.error || '删除失败', 'warn');
    }
  } catch (e) {
    toast('网络请求失败', 'warn');
  }
}

// 网页直接下载本地库壁纸
function downloadLibraryItem(name, isDir) {
  toast(isDir ? '正在打包文件夹并准备下载...' : '正在准备下载...', 'info');
  const url = `/api/library/download?name=${encodeURIComponent(name)}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = isDir ? name + '.zip' : name; 
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// 本地图库极速渲染与异步数据填充
async function fetchLibrary() {
  const container = document.getElementById('libraryList');
  if (!container) return;
  try {
    const res = await fetch('/api/library'); // 瞬间返回纯本地文件列表
    if (!res.ok) throw new Error('网络异常');
    const data = await res.json();
    const list = data.items || [];
    
    if (!list.length) {
      container.innerHTML = '<div style="text-align:center; color:var(--text3); padding:30px;">本地库空空如也 🍃</div>';
      return;
    }

    const formatBytes = (b) => {
      if (!b || isNaN(b)) return '0 B';
      const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(b) / Math.log(k));
      return (b / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    };

    // 读取浏览器本地缓存
    const libLocalCache = JSON.parse(localStorage.getItem('wh-lib-cache') || '{}');
    const idsToFetch = [];

    // 优先使用缓存数据瞬间出图，没缓存的才记录下来等会去搜
    container.innerHTML = list.map((t, idx) => {
      const id = t.id;
      const cached = id ? libLocalCache[id] : null;
      if (id && !cached) idsToFetch.push(id);
      
      let displayTitle = t.name.replace(/\.[^/.]+$/, "");
      if (id) {
        displayTitle = displayTitle.replace(new RegExp(`[-_]?${id}.*$`), "");
        if (!displayTitle) displayTitle = id; 
      }
      const safeTitle = esc(displayTitle).replace(/'/g, "\\'");
      const safeName = esc(t.name).replace(/'/g, "\\'");
      
      // 读取缓存中的图片和点赞，如果没有就使用沙漏加载图
      const thumbSrc = (cached && cached.thumb) ? cached.thumb : (cached ? PLACEHOLDER : PLACEHOLDER_LOADING);
      const subs = cached ? cached.subs : 0;
      const favs = cached ? cached.favs : 0;

      // 判定本地文件后缀生成标签
      const isVideo = t.name.match(/\.(mp4|webm|mov|mkv|ogg)$/i);
      const typeClass = isVideo ? 'video' : 'scene';
      const typeName = isVideo ? '视频' : (t.isDir ? '文件夹' : '压缩包');
      const typeBadge = `<span class="type-badge ${typeClass}" style="position:absolute; top:4px; left:4px; transform:scale(0.85); transform-origin:top left; pointer-events:none; z-index:10;">${typeName}</span>`;

      // 包裹相对定位并叠加标签
      const thumbHtml = `<div style="position:relative; display:inline-block; flex-shrink:0;">
        <img id="lib-thumb-${idx}" src="${thumbSrc}" class="q-thumb" data-play-name="${safeName}" onclick="if(!libBatchMode) playLibraryItem('${safeName}')" oncontextmenu="if(!libBatchMode) { showPlayerMenu(event, '${safeName}'); return false; }" style="${libBatchMode?'cursor:default;':'cursor:pointer;'}" title="播放视频" onerror="this.src='${PLACEHOLDER}'">
        ${typeBadge}
      </div>`;

      const chkHtml = `<input type="checkbox" class="lib-batch-chk" style="width:20px;height:20px;cursor:pointer;margin-right:10px;accent-color:var(--danger);flex-shrink:0; display:${libBatchMode ? 'block' : 'none'};" onchange="toggleLibSelect('${safeName}', this.checked)" ${libSelected.has(t.name) ? 'checked' : ''}>`;

      // 将打开详情页的事件转移到壁纸名称上，并加入鼠标经过变色的反馈提示
      return `
      <div class="q-item" id="lib-item-${idx}" style="position: relative; padding: 12px; display: flex; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; min-height: 94px;">
        ${chkHtml}
        ${thumbHtml}
        <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; flex: 1; margin-left: 14px; justify-content: center;">
          <span style="font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 68px; ${id ? 'cursor:pointer; transition:color 0.2s;' : ''}" ${id ? `onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text)'" onclick="if(!libBatchMode) openModal('${id}', '${safeTitle}', '${cached && cached.thumb ? cached.thumb : ''}')"` : ''} title="${id ? '查看详情' : esc(displayTitle)}">${esc(displayTitle)}</span>

          <span style="font-size: 11px; color: var(--text3);">${new Date(t.mtime).toLocaleString()}</span>
          <div id="lib-stats-${idx}" style="font-size: 11px; color: var(--text2); margin-top: 2px;">❤️ ${fmtN(subs)} &nbsp; ⭐ ${fmtN(favs)}</div>
          <div style="font-weight: 600; font-size: 11px; color: var(--text); margin-top: 2px; padding-right: 68px;">📦 ${t.isDir ? '文件夹' : formatBytes(t.size)}</div>
        </div>
        
        <div class="lib-del-btn" style="display: ${libBatchMode ? 'none' : 'flex'}; position: absolute; top: 12px; right: 12px; width: 62px; justify-content: space-between;">
          <button style="width: 28px; height: 28px; border-radius: 6px; background: var(--bg3); border: 1px solid var(--border); color: var(--text3); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; padding: 0;" onmouseover="this.style.color='var(--accent)'; this.style.borderColor='rgba(79,156,249,0.4)'; this.style.background='rgba(79,156,249,0.1)';" onmouseout="this.style.color='var(--text3)'; this.style.borderColor='var(--border)'; this.style.background='var(--bg3)';" onclick="downloadLibraryItem('${safeName}', ${t.isDir})" title="下载文件">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button style="width: 28px; height: 28px; border-radius: 6px; background: var(--bg3); border: 1px solid var(--border); color: var(--text3); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; transition: all 0.2s; padding: 0;" onmouseover="this.style.background='rgba(244,92,92,0.1)'; this.style.color='var(--danger)'; this.style.borderColor='rgba(244,92,92,0.4)';" onmouseout="this.style.background='var(--bg3)'; this.style.color='var(--text3)'; this.style.borderColor='var(--border)';" onclick="deleteLibraryItem('${safeName}')" title="彻底删除">×</button>
        </div>
        
        <button class="btn-p lib-play-btn" data-play-name="${safeName}" style="display: ${libBatchMode ? 'none' : 'flex'}; position: absolute; bottom: 12px; right: 12px; width: 62px; height: 28px; align-items: center; justify-content: center; padding: 0; font-weight: normal; font-size: 13px; border-radius: 6px; background: var(--success); border: 1px solid var(--success); color: #fff; cursor: pointer; white-space: nowrap;" onclick="playLibraryItem('${safeName}')" oncontextmenu="showPlayerMenu(event, '${safeName}'); return false;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> 播放
        </button>
      </div>
      `;
    }).join('');

    // 只查询没有缓存的漏网之鱼，并将其补充进缓存
    if (idsToFetch.length > 0) {
      fetch('/api/library/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToFetch })
      })
      .then(r => r.json())
      .then(d => {
        const detailMap = d.details || {};
        let cacheUpdated = false;

        list.forEach((t, idx) => {
          const id = t.id;
          if (!id || !idsToFetch.includes(id)) return; // 已经有缓存的不做处理

          if (!detailMap[id]) {
            const thumbEl = document.getElementById(`lib-thumb-${idx}`);
            if (thumbEl) thumbEl.src = PLACEHOLDER;
            libLocalCache[id] = { subs: 0, favs: 0, thumb: '' }; // 空数据也进缓存，防二次请求
            cacheUpdated = true;
            return;
          }
          
          const itemD = detailMap[id];
          const subs = itemD.subscriptions || itemD.lifetime_subscriptions || 0;
          const favs = itemD.favorited || itemD.lifetime_favorited || 0;
          const thumb = itemD.preview_url || '';

          // 记录进缓存
          libLocalCache[id] = { subs, favs, thumb };
          cacheUpdated = true;

          const statsEl = document.getElementById(`lib-stats-${idx}`);
          if (statsEl) statsEl.innerHTML = `❤️ ${fmtN(subs)} &nbsp; ⭐ ${fmtN(favs)}`;

          const thumbEl = document.getElementById(`lib-thumb-${idx}`);
          if (thumbEl) {
            if (thumb) {
              thumbEl.src = thumb;
            } else {
              thumbEl.src = PLACEHOLDER;
            }
          }
        });

        // 保存更新后的缓存到浏览器
        if (cacheUpdated) {
          localStorage.setItem('wh-lib-cache', JSON.stringify(libLocalCache));
        }
      }).catch(()=>{
         list.forEach((t, idx) => {
           if(idsToFetch.includes(t.id)){
             const thumbEl = document.getElementById(`lib-thumb-${idx}`);
             if (thumbEl && thumbEl.src.includes('svg')) thumbEl.src = PLACEHOLDER;
           }
         });
      });
    }
  } catch (e) {
    container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:30px;">加载失败: ${e.message}</div>`;
  }
}