let rawData = [];
let filtered = [];

let state = {
  page: 1,
  pageSize: 50,
  search: ""
};

const gallery = document.getElementById("gallery");
const searchInput = document.getElementById("search");
const pageSizeSelect = document.getElementById("pageSize");
const viewerEl = document.getElementById('viewer');
const viewerImgEl = document.getElementById('viewer-img');
let _currentScale = 1;
let _wheelHandler = null;
// 将路径按段编码，保留 / 分隔符。用于含特殊字符的文件名。
function encodePath(p){
  try{
    return p.split('/').map(s=>encodeURIComponent(s)).join('/');
  }catch(e){ return p; }
}

// 深色模式初始化与切换
function setDarkMode(enabled) {
  if (enabled) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');

  const btn = document.getElementById('darkToggle');
  if (btn) {
    btn.innerText = enabled ? '☀️' : '🌙';
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }

  try { localStorage.setItem('dark-mode', enabled ? '1' : '0'); } catch (e) {}
}

function initDarkMode(){
  const saved = localStorage.getItem('dark-mode');
  const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const enabled = saved === null ? prefers : saved === '1';
  setDarkMode(enabled);

  const btn = document.getElementById('darkToggle');
  if (btn) btn.addEventListener('click', () => setDarkMode(!document.documentElement.classList.contains('dark')));
}

// 辅助：fetch image as blob（用于下载与复制图片）
async function fetchBlob(url){
  try{
    const r = await fetch(encodePath(url));
    if (!r.ok) throw new Error('network');
    return await r.blob();
  }catch(e){
    return null;
  }
}

// 下载图片（尝试通过 blob 以保留文件名，回退到直接打开链接）
async function downloadImage(url){
  const blob = await fetchBlob(url);
  let filename = url.split('/').pop() || 'image';
  try{ filename = decodeURIComponent(filename.replace(/\?.*$/,'')); }catch(e){}

  if (blob) {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  } else {
    // fallback: open in new tab so user can save
    window.open(encodePath(url), '_blank');
  }
}

// 复制图片到剪贴板（优先），否则复制链接文本
async function copyImage(url){
  try{
    const blob = await fetchBlob(url);
    if (blob && navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      return { ok:true, mode: 'image' };
    }
  }catch(e){}

  // fallback: copy URL
  try{
    await navigator.clipboard.writeText(location.origin + '/' + encodePath(url));
    return { ok:true, mode: 'text' };
  }catch(e){
    return { ok:false };
  }
}

// 初始化
async function init() {
  const res = await fetch("images.json");
  rawData = await res.json();
  // images.json may be an array of string paths — normalize to objects
  if (rawData && rawData.length && typeof rawData[0] === 'string') {
    rawData = rawData.map(s => ({ src: s, tags: [] }));
  }
  // 自动在每次初始化时打乱图片顺序，避免首页重复
  try { shuffle(); } catch(e) { filtered = rawData; }
  
  // 初始化深色模式
  initDarkMode();

  // bind download all button
  const downloadAllBtn = document.getElementById('downloadAll');
  if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAll);
  // bind disclaimer button
  const discBtn = document.getElementById('disclaimerBtn');
  const discModal = document.getElementById('disclaimerModal');
  const discClose = document.getElementById('disclaimerClose');
  if (discBtn && discModal) {
    discBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      discModal.setAttribute('aria-hidden','false');
    });
  }
  function closeDisclaimer(){
    try{ localStorage.setItem('disclaimer_seen','1'); }catch(e){}
    if (discModal) discModal.setAttribute('aria-hidden','true');
  }
  if (discClose && discModal){
    discClose.addEventListener('click', closeDisclaimer);
  }
  if (discModal){
    discModal.addEventListener('click', (e)=>{
      if (e.target === discModal) closeDisclaimer();
    });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeDisclaimer(); });

    // 自动弹窗：仅在首次访问时显示一次
    try{
      const seen = localStorage.getItem('disclaimer_seen');
      if (!seen) {
        // 延迟一点以免遮挡初始化动画
        setTimeout(()=>{ discModal.setAttribute('aria-hidden','false'); }, 300);
      }
    }catch(e){}
  }

  bindEvents();
  render();
  // register service worker if available
  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('sw.js'); } catch(e) { /* ignore */ }
  }
  // pre-cache priority thumbnails (first 50)
  try { preCachePriorityThumbs(50); } catch(e) {}
}

// 事件
function bindEvents() {
  if (searchInput) {
    searchInput.oninput = () => {
      state.search = searchInput.value.toLowerCase();
      state.page = 1;
      filter();
    };
  } else {
    state.search = "";
  }

  pageSizeSelect.onchange = () => {
    const v = pageSizeSelect.value;
    state.pageSize = v === 'all' ? 'all' : parseInt(v);
    state.page = 1;
    render();
  };
}

// 过滤
function filter() {
  if (!state.search) {
    filtered = rawData;
  } else {
    filtered = rawData.filter(i =>
      i.tags?.join(" ").toLowerCase().includes(state.search)
    );
  }
  render();
}

// 渲染
function render() {
  gallery.innerHTML = "";

  const start = (state.page - 1) * state.pageSize;
  let pageItems;
  if (state.pageSize === 'all') {
    pageItems = filtered.slice();
  } else {
    const start = (state.page - 1) * state.pageSize;
    pageItems = filtered.slice(start, start + state.pageSize);
  }

  pageItems.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";

    // determine thumb URL: for GIFs use the original GIF (so it animates), otherwise prefer WebP thumbnails under /thumbs/*.webp
    const isGif = /\.gif(\?.*)?$/i.test((item.src||''));
    let thumb;
    if (isGif) {
      thumb = item.src; // use original gif so thumbnails animate consistently
    } else {
      thumb = (item.src || '').replace(/(^|\/)images\//, '$1thumbs/').replace(/\.[^/.]+$/, '.webp');
    }
    const img = document.createElement("img");
    img.setAttribute('loading','lazy');
    img.dataset.thumb = thumb;
    img.dataset.full = item.src;
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    // if thumb 404s or fails, fallback to full image
    img.onerror = () => {
      const full = encodePath(item.src);
      if (img.src !== full) img.src = full;
    };
    img.onclick = () => openViewer(item.src);

    const actions = document.createElement("div");
    actions.className = "actions";

    const copyBtn = document.createElement("button");
    copyBtn.innerText = "复制";
    copyBtn.title = "复制图片（优先复制图片到剪贴板，失败则复制链接）";
    copyBtn.onclick = async (e) => {
      e.stopPropagation();
      const res = await copyImage(item.src);
      if (!res.ok) alert('复制失败，请手动保存链接: ' + (location.origin + '/' + item.src));
    };

    const dlBtn = document.createElement("button");
    dlBtn.innerText = "下载";
    dlBtn.title = "下载图片";
    dlBtn.onclick = async (e) => {
      e.stopPropagation();
      await downloadImage(item.src);
    };

    actions.appendChild(copyBtn);
    actions.appendChild(dlBtn);
    div.appendChild(img);
    // if this source is a GIF, add a small badge indicator
    try{
      const isGif = /\.gif(\?.*)?$/i.test((item.src||''));
      if (isGif) {
        const badge = document.createElement('span');
        badge.className = 'gif-badge';
        badge.setAttribute('aria-hidden','true');
        const dot = document.createElement('i'); dot.className = 'dot';
        const label = document.createElement('span'); label.innerText = 'GIF';
        badge.appendChild(dot);
        badge.appendChild(label);
        div.appendChild(badge);
      }
    }catch(e){}

    div.appendChild(actions);
    gallery.appendChild(div);
  });

  renderPagination();

  // observe images and lazy-load thumbs
  observeAndLoadThumbs();
}

// IntersectionObserver to lazy-load thumbnail images
let _thumbObserver = null;
function observeAndLoadThumbs(){
  if (_thumbObserver) _thumbObserver.disconnect();
  const options = { root: null, rootMargin: '200px', threshold: 0.01 };
  _thumbObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if (!entry.isIntersecting) return;
      const img = entry.target;
      const thumb = img.dataset.thumb || img.dataset.src || img.src;
      if (thumb && img.src !== thumb) {
        img.src = encodePath(thumb);
      } else if (!thumb) {
        // no thumb path, use full
        img.src = encodePath(img.dataset.full || img.src);
      }
      _thumbObserver.unobserve(img);
    });
  }, options);

  document.querySelectorAll('#gallery .item img').forEach(img => _thumbObserver.observe(img));
}

// Pre-cache a number of priority thumbnails using Cache API
async function preCachePriorityThumbs(count){
  // Avoid prefetching GIF originals to prevent bulk GIF downloads.
  // Only pre-cache static thumbnails (webp) for the first N items.
  if (!('caches' in window)) return;
  try{
    const urls = rawData.slice(0, count).map(i => {
      // skip GIF originals here to avoid downloading many animated files
      if (/\.gif(\?.*)?$/i.test(i.src||'')) return null;
      return (i.src||'').replace(/(^|\/)images\//, '$1thumbs/').replace(/\.[^/.]+$/, '.webp');
    });
    const cache = await caches.open('thumb-cache');
    const unique = Array.from(new Set(urls.filter(u=>u)));
    await cache.addAll(unique.map(u=>encodePath(u))).catch(()=>{});
  }catch(e){ /* ignore caching errors */ }
}

// 分页
function renderPagination() {
  const el = document.getElementById("pagination") || document.querySelector('.inline-pagination');
  el.innerHTML = "";
  const prev = document.createElement("button");
  prev.innerText = "上一页";
  prev.onclick = () => { state.page = Math.max(1, state.page - 1); render(); };

  const next = document.createElement("button");
  next.innerText = "下一页";
  next.onclick = () => { state.page = state.page + 1; render(); };

  const info = document.createElement("span");
  if (state.pageSize === 'all') {
    info.innerText = `1 / 1 (全部 ${filtered.length})`;
    prev.disabled = true;
    next.disabled = true;
  } else {
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    info.innerText = `${state.page} / ${totalPages}`;
    prev.disabled = state.page === 1;
    next.disabled = state.page === totalPages;
  }

  el.append(prev, info, next);
}

// 随机
// Fisher-Yates 无偏洗牌
function shuffleArray(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
}

// 真随机：在所有图片中随机排列（对 rawData 进行洗牌），然后重新应用过滤/渲染
function shuffle() {
  if (!rawData || !rawData.length) return;
  shuffleArray(rawData);
  // 如果有搜索，则重新过滤（以便在搜索上下文中显示随机结果）；否则直接显示全部或分页后的随机顺序
  if (state.search) {
    filter();
  } else {
    filtered = rawData.slice();
    state.page = 1;
    render();
  }
}

// 下载全部图片为 zip（使用 JSZip）
async function downloadAll(){
  if (!window.JSZip) {
    alert('下载功能需要 JSZip 库，请检查网络或刷新页面。');
    return;
  }
  const btn = document.getElementById('downloadAll');
  if (btn) { btn.disabled = true; btn.innerText = '打包中...'; }

  const zip = new JSZip();
  for (let i = 0; i < rawData.length; i++){
    const item = rawData[i];
    const url = item.src;
    try{
      const blob = await fetchBlob(url);
      let filename = url.split('/').pop() || `image-${i}`;
      try{ filename = decodeURIComponent(filename.replace(/\?.*$/,'')); }catch(e){}
      if (blob) zip.file(filename, blob);
    }catch(e){ /* skip failures */ }
  }

  try{
    const content = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a');
    const u = URL.createObjectURL(content);
    a.href = u;
    a.download = 'images.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  }catch(e){
    alert('打包失败：' + e.message);
  }

  if (btn) { btn.disabled = false; btn.innerText = '⬇️ 全部下载'; }
}

// 预览
function openViewer(src) {
  viewerImgEl.src = encodePath(src);
  // show viewer
  viewerEl.style.display = 'flex';
  try { document.body.classList.add('viewer-open'); } catch(e) {}


  // initial slight zoom
  _currentScale = 1.05;
  viewerImgEl.style.transform = `scale(${_currentScale})`;

  // add wheel zoom handler
  _wheelHandler = (e) => {
    e.preventDefault();
    const delta = e.deltaY;
    const factor = delta > 0 ? 0.9 : 1.1;
    _currentScale = Math.min(8, Math.max(0.2, _currentScale * factor));
    viewerImgEl.style.transform = `scale(${_currentScale})`;
  };
  viewerEl.addEventListener('wheel', _wheelHandler, { passive: false });

 
}



function closeViewer() {
  // hide viewer and reset transform
  viewerEl.style.display = 'none';
  try { document.body.classList.remove('viewer-open'); } catch(e) {}
  _currentScale = 1;
  if (viewerImgEl) viewerImgEl.style.transform = '';

  // remove wheel handler
  if (_wheelHandler) {
    viewerEl.removeEventListener('wheel', _wheelHandler);
    _wheelHandler = null;
  }
  
}

init();