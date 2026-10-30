/**
 * 共享存储层 + 任务状态机
 * 玩家端（index.html）和家长端（admin.html）共用同一个 localStorage key，
 * 因此两个页面之间天然互通，并通过 storage 事件实时同步。
 */
(function () {
  'use strict';

  var KEY = 'pony_studio_v1';
  var st = null;
  var storageOK = true;
  var fallback = null;
  var listeners = [];

  try {
    localStorage.setItem('__probe__', '1');
    localStorage.removeItem('__probe__');
  } catch (e) {
    storageOK = false;
  }

  function readRaw() {
    if (!storageOK) return fallback;
    try { return localStorage.getItem(KEY); } catch (e) { return fallback; }
  }

  function writeRaw(v) {
    fallback = v;
    if (storageOK) {
      try { localStorage.setItem(KEY, v); } catch (e) { /* 配额或隐私模式，退回内存 */ }
    }
  }

  function initials(kind) {
    if (kind === 'pony') {
      return DATA.PONIES.filter(function (p) { return p.initial; }).map(function (p) { return p.id; });
    }
    return DATA.ITEMS.filter(function (i) { return i.initial; }).map(function (i) { return i.id; });
  }

  function seed() {
    return {
      v: 1,
      player: '小朋友',
      pin: '1234',
      activePony: 'twilight',
      outfit: { bg: 'bg-sky', wing: null, hair: null, forehead: null, headwear: null, glasses: null, eyes: null, cheek: null, neck: null },
      unlocks: { items: initials('item'), ponies: initials('pony') },
      tasks: {},
      customTasks: [],
      looks: [],
      log: []
    };
  }

  function load() {
    var raw = readRaw();
    if (!raw) { st = seed(); save(); return; }
    try {
      st = JSON.parse(raw);
    } catch (e) {
      st = seed();
    }
    /* 结构补全，兼容旧版本 */
    var base = seed();
    Object.keys(base).forEach(function (k) {
      if (st[k] === undefined) st[k] = base[k];
    });
    if (!st.unlocks) st.unlocks = base.unlocks;
    if (!st.unlocks.items) st.unlocks.items = base.unlocks.items;
    if (!st.unlocks.ponies) st.unlocks.ponies = base.unlocks.ponies;
    Object.keys(base.outfit).forEach(function (k) {
      if (!(k in st.outfit)) st.outfit[k] = base.outfit[k];
    });
    if (!Array.isArray(st.customTasks)) st.customTasks = [];
    if (!Array.isArray(st.looks)) st.looks = [];
    if (!Array.isArray(st.log)) st.log = [];
  }

  function save() {
    writeRaw(JSON.stringify(st));
    try { localStorage.setItem(KEY + '_ping', String(Date.now())); } catch (e) {}
  }

  function notify() {
    save();
    listeners.forEach(function (fn) { fn(st); });
  }

  /* ---------- 查询 ---------- */

  function taskStatus(id) {
    var t = st.tasks[id];
    return t ? t.status : 'todo';
  }

  function findTask(id) {
    return DATA.task(id) || st.customTasks.filter(function (t) { return t.id === id; })[0] || null;
  }

  function hasItem(id) { return st.unlocks.items.indexOf(id) >= 0; }
  function hasPony(id) { return st.unlocks.ponies.indexOf(id) >= 0; }

  function countBy(status) {
    return DATA.allTasks().filter(function (t) { return taskStatus(t.id) === status; }).length;
  }

  /* ---------- 动作 ---------- */

  function log(action, detail) {
    st.log.unshift({ at: Date.now(), action: action, detail: detail });
    if (st.log.length > 200) st.log.length = 200;
  }

  function submitTask(id, note) {
    if (taskStatus(id) === 'pending' || taskStatus(id) === 'approved') return false;
    st.tasks[id] = { status: 'pending', note: note || '', submitAt: Date.now(), reason: '' };
    log('提交', id);
    notify();
    return true;
  }

  function cancelSubmit(id) {
    if (taskStatus(id) !== 'pending') return false;
    delete st.tasks[id];
    log('撤回', id);
    notify();
    return true;
  }

  function applyRewards(t, unlockSet) {
    (t.rewards || []).forEach(function (r) {
      if (r.indexOf('pony:') === 0) {
        var pid = r.slice(5);
        if (st.unlocks.ponies.indexOf(pid) < 0) st.unlocks.ponies.push(pid);
      } else if (st.unlocks.items.indexOf(r) < 0) {
        st.unlocks.items.push(r);
      }
    });
  }

  function approve(id) {
    var t = findTask(id);
    if (!t) return false;
    applyRewards(t);
    st.tasks[id] = { status: 'approved', note: (st.tasks[id] && st.tasks[id].note) || '', submitAt: (st.tasks[id] && st.tasks[id].submitAt) || Date.now(), reviewAt: Date.now(), reason: '' };
    log('通过', id);
    notify();
    return true;
  }

  function reject(id, reason) {
    var t = findTask(id);
    if (!t) return false;
    st.tasks[id] = { status: 'rejected', note: (st.tasks[id] && st.tasks[id].note) || '', submitAt: (st.tasks[id] && st.tasks[id].submitAt) || Date.now(), reviewAt: Date.now(), reason: reason || '' };
    log('驳回', id);
    notify();
    return true;
  }

  function reopen(id) {
    if (!findTask(id)) return false;
    delete st.tasks[id];
    log('重置', id);
    notify();
    return true;
  }

  function setItemLock(id, unlocked) {
    if (unlocked) {
      if (!hasItem(id)) st.unlocks.items.push(id);
    } else {
      st.unlocks.items = st.unlocks.items.filter(function (x) { return x !== id; });
      /* 收回后若正穿着则脱下 */
      var it = DATA.item(id);
      if (it && st.outfit[it.slot] === id) st.outfit[it.slot] = null;
      st.looks.forEach(function (l) { if (l.outfit[it.slot] === id) l.outfit[it.slot] = null; });
    }
    log(unlocked ? '手动解锁' : '手动锁定', id);
    notify();
  }

  function setPonyLock(id, unlocked) {
    if (unlocked) {
      if (!hasPony(id)) st.unlocks.ponies.push(id);
    } else {
      st.unlocks.ponies = st.unlocks.ponies.filter(function (x) { return x !== id; });
      if (st.activePony === id) st.activePony = st.unlocks.ponies[0] || DATA.PONIES[0].id;
      st.looks.forEach(function (l) { if (l.ponyId === id) l.ponyId = st.activePony; });
    }
    log(unlocked ? '手动解锁' : '手动锁定', id);
    notify();
  }

  function addCustomTask(title, desc, rewards) {
    var id = 'c' + Date.now().toString(36);
    st.customTasks.unshift({ id: id, title: title, desc: desc || '', tag: '自定义', custom: true, rewards: rewards || [] });
    log('新增任务', title);
    notify();
    return id;
  }

  function removeCustomTask(id) {
    var before = st.customTasks.length;
    st.customTasks = st.customTasks.filter(function (t) { return t.id !== id; });
    delete st.tasks[id];
    log('删除任务', id);
    notify();
    return st.customTasks.length < before;
  }

  function saveLook(name) {
    st.looks.unshift({ name: name, ponyId: st.activePony, outfit: JSON.parse(JSON.stringify(st.outfit)) });
    if (st.looks.length > 8) st.looks.length = 8;
    log('保存造型', name);
    notify();
  }

  function loadLook(idx) {
    var l = st.looks[idx];
    if (!l) return false;
    /* 只加载当前已解锁的部分 */
    st.activePony = hasPony(l.ponyId) ? l.ponyId : st.activePony;
    Object.keys(l.outfit).forEach(function (k) {
      var v = l.outfit[k];
      if (!v) { st.outfit[k] = null; return; }
      if (k === 'bg') { st.outfit.bg = hasItem(v) ? v : st.outfit.bg; return; }
      st.outfit[k] = hasItem(v) ? v : null;
    });
    notify();
    return true;
  }

  function removeLook(idx) {
    st.looks.splice(idx, 1);
    notify();
  }

  function resetAll() {
    st = seed();
    notify();
  }

  function exportJSON() {
    return JSON.stringify(st, null, 2);
  }

  function importJSON(text) {
    try {
      var o = JSON.parse(text);
      if (!o || typeof o !== 'object' || !o.unlocks) return false;
      st = o;
      load();
      notify();
      return true;
    } catch (e) {
      return false;
    }
  }

  function stats() {
    return {
      total: DATA.allTasks().length,
      pending: countBy('pending'),
      approved: countBy('approved'),
      rejected: countBy('rejected'),
      todo: countBy('todo'),
      items: st.unlocks.items.length,
      itemsTotal: DATA.ITEMS.length,
      ponies: st.unlocks.ponies.length,
      poniesTotal: DATA.PONIES.length
    };
  }

  load();

  window.Store = {
    key: KEY,
    ok: function () { return storageOK; },
    state: function () { return st; },
    save: notify,
    onChange: function (fn) { listeners.push(fn); },
    taskStatus: taskStatus,
    findTask: findTask,
    allTasks: function () { return DATA.allTasks(); },
    customTasks: function () { return st.customTasks; },
    hasItem: hasItem,
    hasPony: hasPony,
    submitTask: submitTask,
    cancelSubmit: cancelSubmit,
    approve: approve,
    reject: reject,
    reopen: reopen,
    setItemLock: setItemLock,
    setPonyLock: setPonyLock,
    addCustomTask: addCustomTask,
    removeCustomTask: removeCustomTask,
    saveLook: saveLook,
    loadLook: loadLook,
    removeLook: removeLook,
    resetAll: resetAll,
    exportJSON: exportJSON,
    importJSON: importJSON,
    stats: stats
  };

  /* 跨标签页同步 */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) {
      load();
      listeners.forEach(function (fn) { fn(st, true); });
    }
  });
})();
