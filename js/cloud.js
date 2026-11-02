/**
 * 云同步（Supabase）—— 存档云端备份 / 多设备恢复
 *
 * 前端直连 Supabase REST（无 SDK 依赖，fetch 即可）：
 * - 配置（项目 URL / anon key / 同步码）由家长在「数据与设置」里粘贴，
 *   存 localStorage（pony_cloud_v2），不写进公开仓库
 * - 表结构（需在 Supabase SQL Editor 里执行一次，见 README）：
 *     create table saves (code text primary key, data jsonb not null,
 *                          updated_at timestamptz not null default now());
 *     alter table saves enable row level security;
 *     create policy "saves_all" on saves for all to anon using (true) with check (true);
 * - 策略：本地每次存档（notify）防抖 2.5s 上传；启动时拉取，
 *   云端 savedAt 更新则整档恢复（最后写入者优先）
 * - anon key 本就设计为可公开（靠 RLS 保护），同步码随机 10 位不可猜
 */
(function () {
  'use strict';

  var CFG_KEY = 'pony_cloud_v2';
  var DEBOUNCE = 2500;
  var TIMEOUT = 12000;

  var cfg = null;          /* { url, key, code } */
  var status = { state: 'off', msg: '', at: 0 };  /* off | ok | syncing | err */
  var pushTimer = 0;
  var inflight = false;    /* 上传进行中（合并后续触发） */
  var pulling = false;     /* 拉取中（避免拉取触发的 save 又被推回去） */
  var lastPushed = '';     /* 上次成功上传的内容，避免重复推 */

  /* ---------- 配置 ---------- */

  function readCfg() {
    try {
      var raw = localStorage.getItem(CFG_KEY);
      var o = raw ? JSON.parse(raw) : null;
      if (o && typeof o === 'object' && o.url && o.key && o.code) return o;
    } catch (e) {}
    return null;
  }

  function writeCfg() {
    try {
      if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
      else localStorage.removeItem(CFG_KEY);
    } catch (e) {}
  }

  function validUrl(u) {
    return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+\/?$/i.test(String(u || '').trim().replace(/\/+$/, '')) &&
      String(u || '').trim().replace(/\/+$/, '');
  }

  function validKey(k) {
    return /^[A-Za-z0-9._-]{20,}$/.test(String(k || '').trim()) && String(k).trim();
  }

  /* 随机同步码：去掉易混淆字符（0/O/1/I/L），10 位 */
  function newCode() {
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var s = '';
    for (var i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function validCode(c) {
    return /^[A-Z0-9]{6,16}$/.test(String(c || '').trim().toUpperCase()) && String(c).trim().toUpperCase();
  }

  /* ---------- REST ---------- */

  function api(path, opts) {
    if (!cfg) return Promise.reject(new Error('还没配置云同步'));
    var base = cfg.url.replace(/\/+$/, '');
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT);
    return fetch(base + path, {
      method: opts.method,
      headers: {
        'apikey': cfg.key,
        'Authorization': 'Bearer ' + cfg.key,
        'Content-Type': 'application/json',
        'Prefer': opts.prefer || ''
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) return r.text().catch(function () { return ''; }).then(function (t) {
        throw new Error('HTTP ' + r.status + (t ? ' ' + t.slice(0, 120) : ''));
      });
      return r.status === 204 ? null : r.json();
    }).catch(function (e) {
      clearTimeout(timer);
      if (e && e.name === 'AbortError') throw new Error('请求超时');
      throw e;
    });
  }

  function setState(s, msg) {
    status = { state: s, msg: msg || '', at: Date.now() };
    listeners.forEach(function (fn) { try { fn(status); } catch (e) {} });
  }

  /* ---------- 上传 / 下载 ---------- */

  function payload() {
    var S = window.Store;
    return { code: cfg.code, data: JSON.parse(S.exportJSON()), updated_at: new Date().toISOString() };
  }

  function pushNow() {
    if (!cfg) return Promise.reject(new Error('还没配置云同步'));
    if (pulling) return Promise.resolve(false);
    var body = payload();
    var text = JSON.stringify(body.data);
    if (text === lastPushed) return Promise.resolve(false);
    inflight = true;
    setState('syncing', '正在上传…');
    return api('/rest/v1/saves', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: body
    }).then(function () {
      lastPushed = text;
      setState('ok', '已同步 ' + fmtTime());
      inflight = false;
      return true;
    }).catch(function (e) {
      setState('err', '上传失败：' + (e.message || e));
      inflight = false;
      throw e;
    });
  }

  /* onSave：store.notify() 时调，防抖合并 */
  function onSave() {
    if (!cfg || pulling) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = 0;
      pushNow().catch(function () { /* 状态已记录，等下次存档重试 */ });
    }, DEBOUNCE);
  }

  function pullNow(force) {
    if (!cfg) return Promise.reject(new Error('还没配置云同步'));
    if (pulling) return Promise.resolve(false);
    pulling = true;
    setState('syncing', '正在检查云端…');
    return api('/rest/v1/saves?select=data&code=eq.' + encodeURIComponent(cfg.code), { method: 'GET' })
      .then(function (rows) {
        pulling = false;
        if (!rows || !rows.length) { setState('ok', '云端还没有存档'); return false; }
        var remote = rows[0].data;
        var S = window.Store;
        var local = S.state();
        var remoteAt = remote && typeof remote.savedAt === 'number' ? remote.savedAt : 0;
        var localAt = local && typeof local.savedAt === 'number' ? local.savedAt : 0;
        if (!force && remoteAt <= localAt) { setState('ok', '云端无新版本 ' + fmtTime()); return false; }
        /* 云端更新（或手动强制）：整档恢复 */
        pulling = true;              /* 恢复过程触发的 notify 不要回推 */
        var ok = S.importJSON(JSON.stringify(remote));
        pulling = false;
        if (!ok) { setState('err', '云端存档格式不对'); return false; }
        lastPushed = JSON.stringify(remote);   /* 内容一致，无需再推 */
        setState('ok', '已恢复云端存档 ' + fmtTime());
        return true;
      })
      .catch(function (e) {
        pulling = false;
        setState('err', '下载失败：' + (e.message || e));
        throw e;
      });
  }

  /* 启动：配置过就检查一次云端（不弹错误打扰孩子，只在家长端看状态） */
  function startup() {
    if (!cfg) return;
    pullNow().catch(function () {});
  }

  /* ---------- 对外 ---------- */

  var listeners = [];
  function fmtTime() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : n; }
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }

  cfg = readCfg();

  window.Cloud = {
    configured: function () { return !!cfg; },
    cfg: function () { return cfg ? { url: cfg.url, code: cfg.code, key: cfg.key.slice(0, 8) + '…' } : null; },
    info: function () { return status; },
    newCode: newCode,
    onChange: function (fn) { listeners.push(fn); },
    onSave: onSave,
    startup: startup,
    pushNow: function () { return pushNow(); },
    pullNow: function () { return pullNow(true); },
    /* 家长端保存配置：url/key/code 全量校验；key 留空且是修改配置时沿用旧值 */
    setCfg: function (url, key, code) {
      var u = validUrl(url), c = validCode(code);
      if (!u) return '项目 URL 不对，应形如 https://xxxx.supabase.co';
      if (!c) return '同步码应为 6~16 位字母数字';
      var k = key ? validKey(key) : '';
      if (!k) {
        if (cfg && cfg.url) k = cfg.key;          /* 修改配置：留空沿用 */
        else return 'anon key 不对（长度或字符不符合）';
      }
      cfg = { url: u, key: k, code: c };
      writeCfg();
      lastPushed = '';
      setState('ok', '配置已保存');
      return true;
    },
    clearCfg: function () {
      cfg = null;
      writeCfg();
      setState('off', '');
      return true;
    }
  };
})();
