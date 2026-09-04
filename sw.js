/* =================================================================
   Service Worker（オフライン対応）
   -----------------------------------------------------------------
   ■ 目的：会場のWi-Fiが使えなくても、ホーム画面のアイコンから
           いつもどおりアプリが起動するようにする。

   ■ 方針：「ネットワーク優先・キャッシュは保険」
       ・つながるとき → 最新版を取りに行き、そのつどキャッシュを更新する
         （開発中に更新しても、古い画面が出続けることがない）
       ・つながらないとき／遅いとき → キャッシュから即座に出す
       ・3秒で応答がなければ待たずにキャッシュへ切り替える
         （会場のWi-Fiに「つながっているが通信できない」状態の対策）
   ================================================================= */

const CACHE = 'lottery-ipad-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

// 初回インストール時にひととおりキャッシュしておく
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(() => {})            // 1つ失敗しても止めない
      .then(() => self.skipWaiting())
  );
});

// 古いキャッシュを片づける
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms){
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

// ネットワークから取れたらキャッシュも更新する
function fetchAndCache(request){
  return fetch(request).then(res => {
    if (res && res.status === 200 && res.type === 'basic'){
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
    }
    return res;
  });
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    Promise.race([ fetchAndCache(e.request), timeout(3000) ])
      .catch(() => caches.match(e.request)
        .then(hit => hit || caches.match('./index.html')))
  );
});
