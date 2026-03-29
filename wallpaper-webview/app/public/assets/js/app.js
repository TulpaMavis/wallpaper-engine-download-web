const APPID = 431960, PAGE_SIZE = 30;
const PROXY_DOMAINS = ['steamcommunity.com', 'api.steampowered.com', 'steamusercontent.com'];
const PREFS_KEY = 'wallhub-prefs-v1';

const S = {
  page:1, totalPages:1, totalItems:0,
  loading:false, view:'grid',
  items:[],
  f:{ search:'', sort:'trend', days:'7', type:'Video', rating:'', genres:[] }
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
    ratingLabel: '年龄评级',
    ratingAll: '全部',
    ratingEveryone: '大众级',
    ratingQuestionable: '家长指导级',
    ratingMature: '限制成人级',
    filterBtn: '筛选',
    sidebarTitle: 'Genre 类型筛选',
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
  },
  en: {
    docTitle: 'WE · Steam Workshop Wallpapers',
    searchPlaceholder: 'Search wallpapers...',
    searchTitle: 'Search',
    themeToDark: 'Switch to dark theme',
    themeToLight: 'Switch to light theme',
    usageBtn: 'Guide',
    sortLabel: 'Sort By',
    sortTrend: 'Trending',
    sortMostRecent: 'Most Recent',
    sortMostVotes: 'Most Votes',
    sortMostSubs: 'Most Subscribed',
    daysLabel: 'Time Range',
    day1: 'Today',
    day7: '7 Days',
    day30: '30 Days',
    day90: '3 Months',
    day180: '6 Months',
    day365: '1 Year',
    day0: 'All Time',
    typeLabel: 'Type',
    typeAll: 'All',
    typeScene: 'Scene',
    typeVideo: 'Video',
    typeWeb: 'Web',
    typeApp: 'Application',
    ratingLabel: 'Content Rating',
    ratingAll: 'All',
    ratingEveryone: 'All ages',
    ratingQuestionable: 'Parental guidance',
    ratingMature: 'Mature',
    filterBtn: 'Filter',
    sidebarTitle: 'Genre Filter',
    clear: 'Clear',
    selectAll: 'Select All',
    applyFilters: 'Apply',
    sectionTitle: 'Steam Workshop Wallpapers',
    loadingResults: 'Loading...',
    gridView: 'Grid',
    listView: 'List',
    commentsTitle: '💬 Comments',
    loadingComments: 'Loading comments...',
    subDownload: 'Subscribe / Download',
    steamPage: 'Steam Page',
    usageTitle: 'Usage',
    usageIntro: 'This project can download most Wallpaper Engine workshop items without logging into a Steam account.',
    usageLimit: '<b>Network Access:</b><br>Proxy requirement depends on your region and ISP. If Steam Workshop is directly reachable, no proxy is needed. If access is restricted, enable a system proxy before use.',
    usagePack: '<b>Download & Packaging Rules:</b><br>Scene/Web/Application wallpapers are packaged into a .zip file and require extraction.<br>Video wallpapers are downloaded as raw video files with no zip packaging.',
    usageDev: '<b>Development Statement:</b><br>This project was built with AI assistance. The publisher did not manually write or review the source code. Any similarity to other projects is coincidental.',
    usageNote: 'This tool is not intended to bypass legitimate Wallpaper Engine purchase rights and is only for non-commercial personal use.',
    disclaimerText: 'Disclaimer: This project was developed and organized with AI assistance. The publisher did not manually review every line or handwrite the core code. Similarities with other projects may result from convergent technical approaches. For learning and communication only; do not use for commercial or infringing purposes.',
    resultsZero: '0 results',
    noListByNetwork: 'No wallpaper list returned. Your network may not reach Steam Community.',
    noMatched: 'No matching wallpapers found. Try adjusting filters.',
    resultsApprox: '~ {total} items · {pages} pages',
    loadingWorkshop: 'Fetching Steam Workshop data...',
    loadingWorkflow: 'Fetch list → Batch details',
    loadFailed: 'Load failed',
    retry: 'Retry',
    resFailed: 'Failed',
    proxyTitle: '🌐 Network may be restricted. Enable proxy and retry.',
    proxyDesc: 'Request to Steam Community failed. Enable VPN/proxy and try again.',
    proxyRaw: 'Original error: {msg}',
    proxyRetest: 'Retry after enabling proxy',
    copyProxyDomains: 'Copy proxy domains',
    copiedProxyDomains: 'Proxy domains copied',
    copyFailed: 'Copy failed, please copy manually',
    noClipboard: 'Clipboard API unavailable, please copy manually',
    emptyData: 'No wallpaper data',
    untitled: 'Untitled Wallpaper',
    subscribe: 'Subscribe',
    prevPage: 'Prev',
    nextPage: 'Next',
    authorLoading: 'Author: Loading...',
    loadingDesc: 'Loading detailed description...',
    loadingData: 'Loading...',
    loadingCmts: 'Fetching comments...',
    unknown: 'Unknown',
    statSubs: 'Subscribers',
    statFavs: 'Favorites',
    statViews: 'Views',
    statSize: 'File Size',
    statUpdated: 'Updated',
    statFileId: 'File ID',
    noComments: 'No comments',
    steamUser: 'Steam User',
    processing: 'Processing',
    packaging: 'Packaging',
    packagingToast: 'Packaging in progress, please wait…',
    downloadStarted: 'Download started: {name}',
    downloadFailed: 'Workshop download failed: {msg}',
    btnDownloaded: 'Downloaded',
    btnFailed: 'Failed',
  }
};

let currentLang = 'zh';
let steamApiEnabled = false;

const GENRES=[
  {id:'Abstract',n:'抽象'},{id:'Animal',n:'动物'},{id:'Anime',n:'日本动画'},
  {id:'Cartoon',n:'卡通'},{id:'CGI',n:'CGI'},{id:'Cyberpunk',n:'赛博朋克'},
  {id:'Fantasy',n:'幻想'},{id:'Game',n:'游戏'},{id:'Girls',n:'女孩们'},
  {id:'Guys',n:'伙计们'},{id:'Landscape',n:'景观'},{id:'Medieval',n:'中世纪'},
  {id:'Memes',n:'表情包'},{id:'MMD',n:'MMD'},{id:'Music',n:'音乐'},
  {id:'Nature',n:'自然'},{id:'Pixel art',n:'像素艺术'},{id:'Relaxing',n:'放松'},
  {id:'Retro',n:'复古'},{id:'Sci-Fi',n:'科幻'},{id:'Sports',n:'运动'},
  {id:'Technology',n:'科技'},{id:'Television',n:'电视'},{id:'Vehicle',n:'车辆'},
  {id:'Unspecified',n:'未指定'},
];

document.addEventListener('DOMContentLoaded', ()=>{
  setupLanguage();
  initTheme();
  restorePrefs();
  renderGenreGrid();
  setupEvents();
  applyStateToControls();
  syncFiltersFromControls();
  checkSteamLoginStatus();
  load();
});

function t(k, vars){
  let s = (I18N[currentLang] && I18N[currentLang][k]) || I18N.zh[k] || k;
  if (vars && typeof vars === 'object') {
    Object.keys(vars).forEach((name)=>{
      s = s.replace(new RegExp(`\\{${name}\\}`, 'g'), String(vars[name]));
    });
  }
  return s;
}
function setFirstTextNode(el, value){
  if (!el) return;
  const n = Array.from(el.childNodes).find(x => x.nodeType === 3 && String(x.nodeValue || '').trim().length > 0);
  if (n) {
    n.nodeValue = ` ${value}`;
    return;
  }
  el.appendChild(document.createTextNode(` ${value}`));
}
function setupLanguage(){
  const saved = localStorage.getItem('wallhub-lang');
  if (saved === 'zh' || saved === 'en') currentLang = saved;
  else currentLang = /^zh/i.test(String(navigator.language || '')) ? 'zh' : 'en';
  const langBtn = document.getElementById('langBtn');
  if (langBtn) {
    langBtn.addEventListener('click', ()=>{
      switchLanguage(currentLang === 'zh' ? 'en' : 'zh');
    });
  }
  applyLanguage();
}
function switchLanguage(lang){
  if (lang !== 'zh' && lang !== 'en') return;
  if (currentLang === lang) return;
  currentLang = lang;
  localStorage.setItem('wallhub-lang', lang);
  applyLanguage();
  updateSettingsCheckmarks();
  renderGenreGrid();
  renderItems(S.items || []);
  renderPagination();
}
function applyLanguage(){
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('docTitle');
  const langBtn = document.getElementById('langBtn');
  if (langBtn) {
    langBtn.classList.add('active');
    langBtn.textContent = currentLang === 'zh' ? '中' : 'EN';
    const title = currentLang === 'zh' ? '切换到英文' : 'Switch to Chinese';
    langBtn.title = title;
    langBtn.setAttribute('aria-label', title);
  }
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const usageBtn = document.getElementById('usageBtn');
  const filterBtn = document.getElementById('filterBtn');
  const genreToggleBtn = document.getElementById('genreToggleBtn');
  if (searchInput) searchInput.placeholder = t('searchPlaceholder');
  if (searchBtn) {
    searchBtn.title = t('searchTitle');
    searchBtn.setAttribute('aria-label', t('searchTitle'));
  }
  if (usageBtn) {
    usageBtn.title = t('usageBtn');
    usageBtn.setAttribute('aria-label', t('usageBtn'));
  }
  if (filterBtn) setFirstTextNode(filterBtn, t('filterBtn'));
  if (genreToggleBtn) genreToggleBtn.textContent = activeGenres.size === GENRES.length ? t('clear') : t('selectAll');
  const sortLabel = document.querySelector('#sortGrp .fl');
  const daysLabel = document.querySelector('#daysGrp .fl');
  const typeLabel = document.querySelector('#typeGrp .fl');
  const ratingLabel = document.querySelector('#ratingGrp .fl');
  if (sortLabel) sortLabel.textContent = t('sortLabel');
  if (daysLabel) daysLabel.textContent = t('daysLabel');
  if (typeLabel) typeLabel.textContent = t('typeLabel');
  if (ratingLabel) ratingLabel.textContent = t('ratingLabel');
  const sortSel = document.getElementById('sortSel');
  if (sortSel) {
    sortSel.options[0].text = t('sortTrend');
    sortSel.options[1].text = t('sortMostRecent');
    sortSel.options[2].text = t('sortMostVotes');
    sortSel.options[3].text = t('sortMostSubs');
  }
  const daysSel = document.getElementById('daysSel');
  if (daysSel) {
    daysSel.options[0].text = t('day1');
    daysSel.options[1].text = t('day7');
    daysSel.options[2].text = t('day30');
    daysSel.options[3].text = t('day90');
    daysSel.options[4].text = t('day180');
    daysSel.options[5].text = t('day365');
    daysSel.options[6].text = t('day0');
  }
  const typeSel = document.getElementById('typeSel');
  if (typeSel) {
    typeSel.options[0].text = t('typeAll');
    typeSel.options[1].text = t('typeScene');
    typeSel.options[2].text = t('typeVideo');
    typeSel.options[3].text = t('typeWeb');
    typeSel.options[4].text = t('typeApp');
  }
  const ratingSel = document.getElementById('ratingSel');
  if (ratingSel) {
    ratingSel.options[0].text = t('ratingAll');
    ratingSel.options[1].text = t('ratingEveryone');
    ratingSel.options[2].text = t('ratingQuestionable');
    ratingSel.options[3].text = t('ratingMature');
  }
  const sidebarTitle = document.querySelector('.sb-title');
  if (sidebarTitle) sidebarTitle.lastChild.textContent = ` ${t('sidebarTitle')}`;
  const applyBtn = document.querySelector('.sb-foot .btn-p');
  if (applyBtn) applyBtn.textContent = t('applyFilters');
  const secTitle = document.querySelector('.sec-title');
  if (secTitle) secTitle.textContent = t('sectionTitle');
  const resCnt = document.getElementById('resCnt');
  if (resCnt && !resCnt.textContent.trim()) resCnt.textContent = t('loadingResults');
  const vgrid = document.getElementById('vgrid');
  const vlist = document.getElementById('vlist');
  if (vgrid) vgrid.title = t('gridView');
  if (vlist) vlist.title = t('listView');
  const cmtTitle = document.querySelector('.cmt-title');
  if (cmtTitle) cmtTitle.textContent = t('commentsTitle');
  const cmtSpin = document.querySelector('#mCmts .cmt-spin');
  if (cmtSpin) cmtSpin.innerHTML = `<div class="spinner-sm"></div>${t('loadingComments')}`;
  const mSubBtn = document.getElementById('mSubBtn');
  if (mSubBtn) setFirstTextNode(mSubBtn, t('subDownload'));
  const mSteam = document.getElementById('mSteam');
  if (mSteam) setFirstTextNode(mSteam, t('steamPage'));
  const usageTitle = document.querySelector('.usage-title');
  if (usageTitle) usageTitle.textContent = t('usageTitle');
  const usageIntro = document.querySelector('.usage-topic-text');
  if (usageIntro) usageIntro.textContent = t('usageIntro');
  const usageItems = document.querySelectorAll('.usage-item');
  if (usageItems[0]) usageItems[0].innerHTML = t('usageLimit');
  if (usageItems[1]) usageItems[1].innerHTML = t('usagePack');
  if (usageItems[2]) usageItems[2].innerHTML = t('usageDev');
  const usageNote = document.querySelector('.usage-note');
  if (usageNote) usageNote.textContent = t('usageNote');
  const siteDisclaimerText = document.getElementById('siteDisclaimerText');
  if (siteDisclaimerText) siteDisclaimerText.textContent = t('disclaimerText');
}

function setupEvents(){
  document.getElementById('searchInput').addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });
  document.getElementById('searchBtn').addEventListener('click', doSearch);
  document.getElementById('usageBtn').addEventListener('click', openUsage);
  document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
  document.getElementById('loginBtn').addEventListener('click', openLoginModal);
  document.getElementById('sortSel').addEventListener('change', e=>{ S.f.sort=e.target.value; S.page=1; syncDaysVisible(); savePrefs(); load(); });
  document.getElementById('daysSel').addEventListener('change', e=>{ S.f.days=e.target.value; S.page=1; savePrefs(); load(); });
  document.getElementById('typeSel').addEventListener('change', e=>{ S.f.type=e.target.value; S.page=1; savePrefs(); load(); });
  document.getElementById('ratingSel').addEventListener('change', e=>{ S.f.rating=e.target.value; S.page=1; savePrefs(); load(); });
}
function syncFiltersFromControls(){
  const sortSel = document.getElementById('sortSel');
  const daysSel = document.getElementById('daysSel');
  const typeSel = document.getElementById('typeSel');
  const ratingSel = document.getElementById('ratingSel');

  if (sortSel) S.f.sort = sortSel.value || 'trend';
  if (daysSel) S.f.days = daysSel.value || '7';
  if (typeSel) S.f.type = typeSel.value || '';
  if (ratingSel) S.f.rating = ratingSel.value || '';
  S.f.genres = Array.from(activeGenres);
  syncDaysVisible();
  savePrefs();
}

function initTheme(){
  const saved = localStorage.getItem('wallhub-theme');
  applyTheme(saved === 'light' ? 'light' : 'dark');
}
function applyTheme(mode){
  const isLight = mode === 'light';
  document.body.classList.toggle('theme-light', isLight);
  const btn = document.getElementById('themeBtn');
  if(btn){
    btn.title = isLight ? t('themeToDark') : t('themeToLight');
    btn.setAttribute('aria-label', btn.title);
  }
  localStorage.setItem('wallhub-theme', isLight ? 'light' : 'dark');
  updateSettingsCheckmarks();
}
function toggleTheme(){
  applyTheme(document.body.classList.contains('theme-light') ? 'dark' : 'light');
}
function openUsage(){ document.getElementById('usageOv').classList.add('open'); document.body.style.overflow='hidden'; }
function closeUsage(){ document.getElementById('usageOv').classList.remove('open'); document.body.style.overflow=''; }
function usageOvClick(e){ if(e.target===document.getElementById('usageOv')) closeUsage(); }

function openSettingsModal(){
  updateSettingsCheckmarks();
  document.getElementById('settingsModalOv').classList.add('open');
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
  // Update language checkmarks
  const langZhCheck = document.querySelector('#langZh .settings-option-check');
  const langEnCheck = document.querySelector('#langEn .settings-option-check');
  if(langZhCheck) langZhCheck.style.display = currentLang === 'zh' ? 'inline' : 'none';
  if(langEnCheck) langEnCheck.style.display = currentLang === 'en' ? 'inline' : 'none';
  
  // Update theme checkmarks
  const isLight = document.body.classList.contains('theme-light');
  const themeDarkCheck = document.querySelector('#themeDark .settings-option-check');
  const themeLightCheck = document.querySelector('#themeLight .settings-option-check');
  if(themeDarkCheck) themeDarkCheck.style.display = !isLight ? 'inline' : 'none';
  if(themeLightCheck) themeLightCheck.style.display = isLight ? 'inline' : 'none';
  
  // Load cache settings
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
      const keyInput = document.getElementById('steamApiKeyInput');
      if(keyInput) keyInput.value = data.steamApiKey || '';
      steamApiEnabled = !!data.useSteamApi;
      updateSteamApiToggleUI();
    }
  } catch(e){
    console.warn('[Cache] Failed to load settings:', e);
  }
}

function updateSteamApiToggleUI(){
  const txt = document.getElementById('steamApiToggleText');
  const chk = document.getElementById('steamApiToggleCheck');
  if(txt) txt.textContent = steamApiEnabled ? '已启用 Steam API' : '未启用 Steam API';
  if(chk) chk.style.display = steamApiEnabled ? 'inline' : 'none';
}

function toggleSteamApi(){
  steamApiEnabled = !steamApiEnabled;
  updateSteamApiToggleUI();
}

async function saveCacheSettings(){
  const keyInput = document.getElementById('steamApiKeyInput');
  try {
    const res = await fetch('/api/video/cache/settings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        steamApiKey: keyInput ? keyInput.value.trim() : '',
        useSteamApi: steamApiEnabled
      })
    });
    
    if(res.ok){
      toast('设置已保存', 'ok');
    } else {
      throw new Error('保存失败');
    }
  } catch(e){
    console.error('[Cache] Save failed:', e);
    toast('保存设置失败', 'warn');
  }
}

function doSearch(){
  S.f.search = document.getElementById('searchInput').value.trim();
  S.page = 1; load();
}
function syncDaysVisible(){
  document.getElementById('daysGrp').style.display = S.f.sort==='trend' ? '' : 'none';
}

function restorePrefs(){
  let raw = null;
  try{
    raw = localStorage.getItem(PREFS_KEY);
  }catch{}
  if(!raw) return;
  try{
    const saved = JSON.parse(raw);
    if(saved && (saved.view === 'grid' || saved.view === 'list')) S.view = saved.view;
    if(saved && saved.f){
      const allowedSort = ['trend', 'mostrecent', 'mostvotes', 'totaluniquesubscribers'];
      const allowedDays = ['1','7','30','90','180','365','0'];
      const allowedType = ['', 'Scene', 'Video', 'Web', 'Application'];
      const allowedRating = ['', 'Everyone', 'Questionable', 'Mature'];

      if(allowedSort.includes(saved.f.sort)) S.f.sort = saved.f.sort;
      if(allowedDays.includes(String(saved.f.days))) S.f.days = String(saved.f.days);
      if(allowedType.includes(saved.f.type || '')) S.f.type = saved.f.type || '';
      if(allowedRating.includes(saved.f.rating || '')) S.f.rating = saved.f.rating || '';

      const savedGenres = Array.isArray(saved.f.genres) ? saved.f.genres : [];
      const validGenres = savedGenres.filter(g=>GENRES.some(x=>x.id===g));
      if(validGenres.length){
        activeGenres = new Set(validGenres);
      }
    }
  }catch{}
  S.f.genres = Array.from(activeGenres);
}
function applyStateToControls(){
  const sortSel = document.getElementById('sortSel');
  const daysSel = document.getElementById('daysSel');
  const typeSel = document.getElementById('typeSel');
  const ratingSel = document.getElementById('ratingSel');
  if(sortSel) sortSel.value = S.f.sort;
  if(daysSel) daysSel.value = S.f.days;
  if(typeSel) typeSel.value = S.f.type;
  if(ratingSel) ratingSel.value = S.f.rating;
  syncDaysVisible();
  setView(S.view);
}
function savePrefs(){
  const payload = {
    view: S.view,
    f: {
      sort: S.f.sort,
      days: S.f.days,
      type: S.f.type,
      rating: S.f.rating,
      genres: Array.from(activeGenres),
    },
  };
  try{
    localStorage.setItem(PREFS_KEY, JSON.stringify(payload));
  }catch{}
}

let activeGenres = new Set(GENRES.map(g=>g.id));

function renderGenreGrid(){
  document.getElementById('genreGrid').innerHTML = GENRES.map(g=>`
    <div class="gc ${activeGenres.has(g.id) ? 'sel2' : ''}"
         onclick="toggleGenre('${g.id}')">
      <div class="gc-chk"></div><span>${currentLang === 'en' ? g.id : g.n}</span>
    </div>`).join('');
  updateBadge();
}

function toggleGenre(id){
  if(activeGenres.has(id)) activeGenres.delete(id);
  else activeGenres.add(id);
  S.f.genres = Array.from(activeGenres);
  savePrefs();
  renderGenreGrid();
}

function updateBadge(){
  const cnt = activeGenres.size;
  const all = cnt === GENRES.length;
  document.getElementById('fbadge').textContent = all ? (currentLang === 'en' ? 'All' : '全') : String(cnt);
  document.getElementById('filterBtn').classList.toggle('active', !all);
  const btn = document.getElementById('genreToggleBtn');
  if (btn) btn.textContent = all ? t('clear') : t('selectAll');
}
function openSB(){ document.getElementById('sb').classList.add('open'); document.getElementById('sbOv').classList.add('open'); document.body.style.overflow='hidden'; }
function closeSB(){ document.getElementById('sb').classList.remove('open'); document.getElementById('sbOv').classList.remove('open'); document.body.style.overflow=''; }
function toggleGenresAll(){
  if (activeGenres.size === GENRES.length) activeGenres = new Set();
  else activeGenres = new Set(GENRES.map(g=>g.id));
  S.f.genres = Array.from(activeGenres);
  savePrefs();
  renderGenreGrid();
}
function applyFilters(){ closeSB(); S.page=1; savePrefs(); load(); }

function setView(v){
  S.view=v;
  document.getElementById('vgrid').classList.toggle('active',v==='grid');
  document.getElementById('vlist').classList.toggle('active',v==='list');
  savePrefs();
  renderItems(S.items);
}

function buildParams(){
  const f = S.f;
  const params = {
    appid: APPID,
    query_type: {trend:1, mostrecent:2, mostvotes:11, totaluniquesubscribers:16}[f.sort]||1,
    page: S.page,
    numperpage: PAGE_SIZE,
  };
  
  // 拦截搜索框中的 author: 语法，转为作者专属查询参数
  if(f.search) {
    if (f.search.trim().startsWith('author:')) {
      params.creator = f.search.trim().split('author:')[1].trim();
    } else {
      params.search_text = f.search;
    }
  }

  if(f.days && f.sort==='trend' && f.days!=='0') params.days = parseInt(f.days);

  const tags=[];
  if(f.type)   tags.push(f.type);
  if(f.rating) tags.push(f.rating);
  const validGenres = (f.genres||[]).filter(g=>GENRES.some(x=>x.id===g));
  if(validGenres.length === 1) tags.push(validGenres[0]);
  if(validGenres.length > 1 && validGenres.length < GENRES.length){
    validGenres.forEach((g,i)=>{ params[`genre_or[${i}]`] = g; });
  }

  tags.forEach((t,i)=>{ params[`requiredtags[${i}]`]=t; });

  return params;
}

// 🌟 新增：全局作者搜索跳转函数（放在 buildParams 下面即可）
function searchByCreator(creatorId) {
  if (!creatorId) return;
  closeModal(); // 关闭详情弹窗
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = 'author:' + creatorId;
  S.page = 1;
  S.f.search = 'author:' + creatorId;
  savePrefs();
  load(); // 触发搜索
}

async function load(){
  if(S.loading) return;
  syncFiltersFromControls();
  S.loading=true;
  showLoading();
  try {
    const res  = await fetch('/api/steam/query',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({params:buildParams()})
    });
    if(!res.ok){
      let serverMsg='';
      try{
        const j = await res.json();
        serverMsg = j && (j.error || j.message) ? String(j.error || j.message) : '';
      }catch{}
      throw new Error(serverMsg || `HTTP ${res.status}`);
    }
    const data = await res.json();
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
      const dispTotal = S.totalItems >= 50000 ? '50,000+' : S.totalItems.toLocaleString(currentLang === 'en' ? 'en-US' : 'zh-CN');
      document.getElementById('resCnt').textContent = t('resultsApprox', { total: dispTotal, pages: S.totalPages });
      renderItems(S.items);
      renderPagination();
    }
  } catch(err){
    console.error(err);
    showError(err.message);
  } finally { S.loading=false; }
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

const PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Crect width='320' height='320' fill='%231c2030'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%235a6278' font-size='14'%3E🖼%3C/text%3E%3C/svg%3E`;

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
  const author = item.author || t('unknown');
  const subs  = fmtN(item.subscriptions||item.lifetime_subscriptions||0);
  const views = fmtN(item.views||0);
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
          <span class="cstat">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            ${subs}
          </span>
          <span class="cstat">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${views}
          </span>
        </div>
        <span class="card-author" title="${esc(author)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21a8 8 0 0 0-16 0"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span class="card-author-name">${esc(author)}</span>
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
  if(cur>3) pages.push('…');
  for(let i=Math.max(2,cur-1);i<=Math.min(tot-1,cur+1);i++) pages.push(i);
  if(cur<tot-2) pages.push('…');
  if(tot>1) pages.push(tot);
  pg.innerHTML=`
    <button class="pbtn" onclick="goPage(${cur-1})" ${cur===1?'disabled':''}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>${t('prevPage')}</button>
    ${pages.map(p=>p==='…'
      ?`<span class="pbtn" style="pointer-events:none;opacity:.4">…</span>`
      :`<button class="pbtn ${p===cur?'cur':''}" onclick="goPage(${p})">${p}</button>`
    ).join('')}
    <button class="pbtn" onclick="goPage(${cur+1})" ${cur===tot?'disabled':''}>${t('nextPage')}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>`;
}
function goPage(p){ if(p<1||p>S.totalPages||p===S.page) return; S.page=p; window.scrollTo({top:0,behavior:'smooth'}); load(); }

function openModal(id){
  const item = S.items.find(w=>w.publishedfileid===id);
  if(!item) return;

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
  document.getElementById('mDesc').textContent = item.short_description||t('loadingDesc');
  document.getElementById('mSteam').href = `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`;
  document.getElementById('mSubBtn').onclick = (e)=>{ e.preventDefault(); e.stopPropagation(); closeModal(); dlWall(id, item.title); };

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

  fetch(`/api/steam/details?id=${id}`)
    .then(r=>{ if(!r.ok) throw new Error(`${r.status}`); return r.json(); })
    .then(d=>{
      if(d.preview_url) document.getElementById('mImg').src=d.preview_url;
      document.getElementById('mDesc').textContent = d.description || item.short_description || (currentLang === 'en' ? 'No description available' : '暂无详细描述');
      if(d.author || item.author) {
        const finalCid = d.creator || item.creator || '';
        const finalAuthor = esc(d.author || item.author || t('unknown'));
        const aHtml = finalCid 
          ? `<span style="cursor:pointer; color:var(--accent); text-decoration:underline;" onclick="searchByCreator('${finalCid}')" title="搜TA的作品">${currentLang === 'en' ? 'Author' : '作者'}: ${finalAuthor} 🔍</span>`
          : `<span>${currentLang === 'en' ? 'Author' : '作者'}: ${finalAuthor}</span>`;
        document.getElementById('mSub').innerHTML=`<span>🆔 ${id}</span>${aHtml}`;
      }
      if(d.tags && d.tags.length) document.getElementById('mTags').innerHTML=d.tags.map(t=>`<span class="tag-chip">${esc(t)}</span>`).join('');
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
      document.getElementById('mDesc').textContent = item.short_description || (currentLang === 'en' ? 'No description available' : '暂无详细描述');
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
function fmtTime(ts){ ts=parseInt(ts); if(!ts) return t('unknown'); return new Date(ts*1000).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}); }
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
  const btn = document.getElementById('loginBtn');
  if(!btn) return;
  
  if(loggedIn){
    btn.classList.add('logged-in');
    btn.title = `已登录: ${username || 'Steam用户'}`;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    btn.onclick = showLogoutConfirm;
  } else {
    btn.classList.remove('logged-in');
    btn.title = 'Steam 登录';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    btn.onclick = openLoginModal;
  }
}

function showLogoutConfirm(){
  if(confirm('确定要退出 Steam 登录吗？')){
    logoutSteam();
  }
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
  // 每 1.5 秒轮询一次后端队列状态
  setInterval(fetchQueue, 1500);
});

async function fetchQueue() {
  try {
    const res = await fetch('/api/queue');
    if (!res.ok) return;
    
    // 解析新的 JSON 结构
    const data = await res.json();
    const list = data.tasks || [];
    
    // 字节单位换算函数
    const formatBytes = (b) => {
      if (!b || isNaN(b)) return '0 B';
      const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(b) / Math.log(k));
      return (b / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
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

    // 渲染包含进度条和详细信息的队列列表
    container.innerHTML = list.map(t => {
      const progStr = t.progress ? t.progress.toFixed(1) + '%' : '0.0%';
      const statusMap = { pending:'排队中', downloading:'下载中...', paused:'已暂停', error:'失败', completed:'已完成' };
      const sText = statusMap[t.status] || t.status;
      
      // 文件大小/已下载量
      const sizeStr = t.total > 0 ? `${formatBytes(t.downloaded)} / ${formatBytes(t.total)}` : (t.downloaded > 0 ? formatBytes(t.downloaded) : '');
      const infoStr = sizeStr;
      
      return `
      <div class="q-item">
        <div class="q-head">
          <span class="q-title" title="${esc(t.title)}">${esc(t.title)}</span>
          <span class="q-status ${t.status}">${sText}</span>
        </div>
        ${t.status === 'error' ? `<div style="font-size:12px; color:var(--danger); margin-top:-4px;">${esc(t.errorMsg)}</div>` : ''}
        
        <div class="q-bar-bg"><div class="q-bar-fill" style="width: ${t.progress || 0}%"></div></div>
        <div class="q-info">
          <span>${infoStr}</span>
          <span>${progStr}</span>
        </div>
        
        <div class="q-actions">
          ${(t.status === 'downloading' || t.status === 'pending') ? `<button class="q-btn" onclick="qAction('pause', ${t.id})">暂停</button>` : ''}
          ${(t.status === 'paused' || t.status === 'error') ? `<button class="q-btn" onclick="qAction('resume', ${t.id})">继续</button>` : ''}
          <button class="q-btn" onclick="qAction('up', ${t.id})">上移</button>
          <button class="q-btn" onclick="qAction('down', ${t.id})">下移</button>
          <button class="q-btn danger" onclick="qAction('cancel', ${t.id})">取消/移除</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {}
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