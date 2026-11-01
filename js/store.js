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
      log: [],
      home: { hearts: {}, day: true, pets: 0, sound: true },
      cheat: false,
      cheatBackup: null,

      /* ---- 家园养成 ---- */
      stars: 30,
      starsEarned: 0,
      xp: 0,
      level: 1,
      bag: { 'w-cloud': 1, 'g-marble': 1 },
      needs: {},
      traits: {},
      checkin: { last: '', streak: 0 },
      achievements: {},
      room: { wall: 'w-cloud', floor: 'g-marble', items: [] },
      album: [],
      weather: 'sunny',
      weatherDay: '',
      gameBest: { star: 0, memory: 0 },
      needAt: Date.now(),
      potty: { uses: 0, washes: 0 }
    };
  }

  function todayKey() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
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
    if (!st.home || typeof st.home !== 'object') st.home = base.home;
    if (typeof st.stars !== 'number') st.stars = base.stars;
    if (typeof st.starsEarned !== 'number') st.starsEarned = 0;
    if (typeof st.xp !== 'number') st.xp = 0;
    if (!st.level || st.level < 1) st.level = 1;
    if (!st.bag || typeof st.bag !== 'object') st.bag = base.bag;
    if (!st.needs || typeof st.needs !== 'object') st.needs = {};
    if (!st.traits || typeof st.traits !== 'object') st.traits = {};
    if (!st.checkin || typeof st.checkin !== 'object') st.checkin = base.checkin;
    if (!st.achievements || typeof st.achievements !== 'object') st.achievements = {};
    if (!st.room || typeof st.room !== 'object') st.room = base.room;
    if (!Array.isArray(st.room.items)) st.room.items = [];
    if (!Array.isArray(st.album)) st.album = [];
    if (!st.gameBest || typeof st.gameBest !== 'object') st.gameBest = base.gameBest;
    if (typeof st.needAt !== 'number') st.needAt = Date.now();
    if (!st.potty || typeof st.potty !== 'object') st.potty = base.potty;
    if (typeof st.potty.uses !== 'number') st.potty.uses = 0;
    if (typeof st.potty.washes !== 'number') st.potty.washes = 0;
    /* 每天换一次天气 */
    var tk = todayKey();
    if (st.weatherDay !== tk) {
      var ws = DATA.WEATHERS;
      st.weather = ws[Math.floor(Math.random() * ws.length)].id;
      st.weatherDay = tk;
    }
    if (!st.home.hearts || typeof st.home.hearts !== 'object') st.home.hearts = {};
    if (typeof st.home.day !== 'boolean') st.home.day = true;
    if (typeof st.home.pets !== 'number') st.home.pets = 0;
    if (typeof st.home.sound !== 'boolean') st.home.sound = true;
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
    addStars((t.star || 1) * 10, '完成任务');
    addXp(15);
    log('通过', id);
    checkAchievements();
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

  /* ---------- 小马家园 ---------- */

  function heartsOf(id) { return st.home.hearts[id] || 0; }

  function addHearts(id, n) {
    st.home.hearts[id] = heartsOf(id) + (n || 1);
    st.home.pets += 1;
    notify();
    return st.home.hearts[id];
  }

  function heartsTotal() {
    var t = 0;
    Object.keys(st.home.hearts).forEach(function (k) { t += st.home.hearts[k]; });
    return t;
  }

  function isDay() { return st.home.day !== false; }

  function soundOn() { return st.home.sound !== false; }

  function toggleSound() {
    st.home.sound = !soundOn();
    notify();
    return st.home.sound;
  }

  function toggleDay() {
    st.home.day = !isDay();
    log('切换昼夜', st.home.day ? '白天' : '夜晚');
    notify();
    return st.home.day;
  }

  /* ---------- 星星币 / 等级 ---------- */

  function addStars(n, why) {
    n = Math.round(n || 0);
    if (!n) return st.stars;
    st.stars += n;
    if (n > 0) {
      st.starsEarned += n;
      addXp(Math.max(1, Math.round(n / 5)));
    }
    log(n > 0 ? '获得星星' : '花掉星星', (why ? why + ' ' : '') + (n > 0 ? '+' : '') + n);
    notify();
    return st.stars;
  }

  function spendStars(n) {
    if (st.stars < n) return false;
    st.stars -= n;
    notify();
    return true;
  }

  function addXp(n) {
    st.xp += n || 0;
    var up = 0;
    while (st.xp >= DATA.xpForLevel(st.level)) {
      st.xp -= DATA.xpForLevel(st.level);
      st.level += 1;
      up += 1;
    }
    if (up) { log('升级', 'Lv.' + st.level); checkAchievements(); }
    return up;
  }

  /* ---------- 需求值（离线也会衰减） ---------- */

  var DECAY = { food: 0.55, clean: 0.35, mood: 0.45, energy: 0.4 };   /* 每分钟 */

  function needsOf(id) {
    if (!st.needs[id]) {
      /* 新来的小马状态不是满分，留出照料的余地 */
      var r = function (a, b) { return Math.round(a + Math.random() * (b - a)); };
      st.needs[id] = { food: r(78, 92), clean: r(82, 95), mood: r(80, 94), energy: r(76, 90) };
    }
    return st.needs[id];
  }

  function decayNeeds() {
    var now = Date.now();
    var mins = (now - (st.needAt || now)) / 60000;
    if (mins < 0.2) return false;
    if (mins > 480) mins = 480;                 /* 离线最多累计 8 小时 */
    st.unlocks.ponies.forEach(function (pid) {
      var n = needsOf(pid);
      DATA.NEEDS.forEach(function (k) {
        var cur = n[k.id] == null ? 100 : n[k.id];
        n[k.id] = Math.max(0, Math.min(100, cur - DECAY[k.id] * mins));
      });
    });
    st.needAt = now;
    return true;
  }

  function applyNeed(ponyId, delta, traitKey) {
    var n = needsOf(ponyId);
    var out = {};
    Object.keys(delta || {}).forEach(function (k) {
      var before = n[k] == null ? 100 : n[k];
      n[k] = Math.max(0, Math.min(100, before + delta[k]));
      out[k] = n[k] - before;
    });
    if (traitKey) {
      var t = st.traits[ponyId] || (st.traits[ponyId] = { food: 0, clean: 0, mood: 0, energy: 0, pet: 0 });
      t[traitKey] = (t[traitKey] || 0) + 1;
    }
    return out;
  }

  function traitOf(ponyId) {
    var t = st.traits[ponyId];
    if (!t) return null;
    var best = null, bv = 0;
    Object.keys(t).forEach(function (k) { if (t[k] > bv) { bv = t[k]; best = k; } });
    return bv > 0 ? best : null;
  }

  function needLevel(v) { return v >= 80 ? 'good' : (v >= 40 ? 'ok' : 'low'); }

  /* ---------- 商店 / 背包 ---------- */

  function owns(id) { return (st.bag[id] || 0) > 0; }

  function placeFurni(id) {
    var g = DATA.goods(id);
    if (!g) return;
    var n = st.room.items.length;
    var slot = n % 6;
    var x = slot < 3 ? 11 + slot * 12 : 89 - (slot - 3) * 12;
    var y = 82 + (n % 2) * 6;
    st.room.items.push({ id: id, x: x, y: y });
  }

  function buy(id) {
    var g = DATA.goods(id);
    if (!g) return { ok: false, msg: '没有这件商品' };
    if (st.level < g.lv) return { ok: false, msg: '升到 Lv.' + g.lv + ' 才能买哦' };
    if (g.cat !== 'food' && g.cat !== 'toy' && owns(id)) return { ok: false, msg: '这件已经拥有啦' };
    if (st.stars < g.price) return { ok: false, msg: '星星币不够，还差 ' + (g.price - st.stars) + ' ⭐' };
    spendStars(g.price);
    st.bag[id] = (st.bag[id] || 0) + 1;
    if (g.cat === 'furni') placeFurni(id);
    if (g.cat === 'wall') st.room.wall = id;
    if (g.cat === 'floor') st.room.floor = id;
    log('购买', g.name);
    checkAchievements();
    notify();
    return { ok: true, msg: '买到了「' + g.name + '」', goods: g };
  }

  function useItem(id, ponyId) {
    var g = DATA.goods(id);
    if (!g || !g.need) return { ok: false, msg: '这个不能用在小马身上' };
    if (!owns(id)) return { ok: false, msg: '背包里没有，先去商店买吧' };
    st.bag[id] -= 1;
    if (st.bag[id] <= 0) delete st.bag[id];
    var d = g.need;
    var traitKey = d.food ? 'food' : (d.clean ? 'clean' : 'mood');
    var changed = applyNeed(ponyId, d, traitKey);
    var hearts = g.cat === 'food' ? 1 : 2;
    st.home.hearts[ponyId] = heartsOf(ponyId) + hearts;
    st.home.pets += 1;
    addStars(g.cat === 'food' ? 1 : 2, g.name);
    log('使用', g.name);
    checkAchievements();
    notify();
    return { ok: true, goods: g, changed: changed, hearts: hearts };
  }

  function bagList() {
    return Object.keys(st.bag).filter(function (k) { return st.bag[k] > 0; }).map(function (k) {
      return { goods: DATA.goods(k), count: st.bag[k] };
    }).filter(function (x) { return x.goods; });
  }

  /* ---------- 每日打卡 ---------- */

  function checkinState() {
    var tk = todayKey();
    return {
      done: st.checkin.last === tk,
      streak: st.checkin.streak,
      next: DATA.checkinReward(st.checkin.last === tk ? st.checkin.streak : st.checkin.streak + 1)
    };
  }

  function doCheckin() {
    var tk = todayKey();
    if (st.checkin.last === tk) return null;
    var y = new Date(Date.now() - 86400000);
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    var yk = y.getFullYear() + '-' + p(y.getMonth() + 1) + '-' + p(y.getDate());
    st.checkin.streak = (st.checkin.last === yk) ? st.checkin.streak + 1 : 1;
    st.checkin.last = tk;
    var reward = DATA.checkinReward(st.checkin.streak);
    addStars(reward, '每日打卡');
    addXp(10);
    log('打卡', '连续 ' + st.checkin.streak + ' 天');
    checkAchievements();
    notify();
    return { streak: st.checkin.streak, reward: reward };
  }

  /* ---------- 成就 ---------- */

  var pendingAch = [];
  function hasAch(id) { return !!st.achievements[id]; }

  function grant(id) {
    if (hasAch(id)) return false;
    var a = DATA.achievement(id);
    if (!a) return false;
    st.achievements[id] = Date.now();
    st.stars += a.stars;
    st.starsEarned += a.stars;
    log('成就达成', a.name);
    pendingAch.push(a);
    return true;
  }

  function takePendingAch() { var a = pendingAch.slice(); pendingAch = []; return a; }

  function checkAchievements() {
    var got = false;
    var maxHeart = 0;
    Object.keys(st.home.hearts).forEach(function (k) { maxHeart = Math.max(maxHeart, st.home.hearts[k]); });
    var approved = 0;
    Object.keys(st.tasks).forEach(function (k) { if (st.tasks[k].status === 'approved') approved += 1; });

    var allNeedsOk = st.unlocks.ponies.length > 0;
    st.unlocks.ponies.forEach(function (pid) {
      var n = st.needs[pid];
      if (!n) { allNeedsOk = false; return; }
      DATA.NEEDS.forEach(function (k) { if ((n[k.id] == null ? 100 : n[k.id]) < 80) allNeedsOk = false; });
    });
    /* 刚解锁还从没照料过的小马按满值算，避免误判 */
    if (!st.unlocks.ponies.length) allNeedsOk = false;

    if (st.home.pets > 0) got = grant('a-pet') || got;
    if (maxHeart >= 50) got = grant('a-friend') || got;
    if (maxHeart >= 200) got = grant('a-best') || got;
    if (st.unlocks.ponies.length >= DATA.PONIES.length) got = grant('a-allpony') || got;
    if (st.unlocks.items.length >= 20) got = grant('a-wardrobe') || got;
    if (approved >= 5) got = grant('a-task5') || got;
    if (approved >= 15) got = grant('a-task15') || got;
    if (st.starsEarned >= 500) got = grant('a-rich') || got;
    if (st.room.items.length >= 5) got = grant('a-designer') || got;
    if (st.gameBest.star >= 30) got = grant('a-star30') || got;
    if (st.gameBest.memory > 0 && st.gameBest.memory <= 12) got = grant('a-memory') || got;
    if (st.checkin.streak >= 7) got = grant('a-streak7') || got;
    if (st.album.length >= 3) got = grant('a-photo') || got;
    if (allNeedsOk) got = grant('a-full') || got;
    if (st.level >= 5) got = grant('a-level5') || got;
    if (st.potty && st.potty.uses >= 1) got = grant('a-potty') || got;
    if (st.potty && st.potty.washes >= 10) got = grant('a-wash') || got;

    if (got) notify();
    return got;
  }

  /* ---------- 房间装饰与相册 ---------- */

  function setWall(id) { if (owns(id)) { st.room.wall = id; notify(); return true; } return false; }
  function setFloor(id) { if (owns(id)) { st.room.floor = id; notify(); return true; } return false; }

  /* 房间是否已经摆上了某件家具（买来但没摆的不算） */
  function hasFurni(id) {
    for (var i = 0; i < st.room.items.length; i++) {
      if (st.room.items[i].id === id) return true;
    }
    return false;
  }

  /* ---------- 如厕 / 洗手 计数 ---------- */

  function pottyCount() { return st.potty.uses; }
  function washCount() { return st.potty.washes; }

  function markPotty() {
    st.potty.uses += 1;
    addStars(2);
    addXp(3);
    log('如厕', '第 ' + st.potty.uses + ' 次');
    checkAchievements();
    notify();
  }

  function markWash() {
    st.potty.washes += 1;
    addStars(1);
    log('洗手', '第 ' + st.potty.washes + ' 次');
    checkAchievements();
    notify();
  }

  function moveFurni(i, x, y) {
    var it = st.room.items[i];
    if (!it) return false;
    it.x = Math.max(6, Math.min(94, x));
    it.y = Math.max(72, Math.min(96, y));
    notify();
    return true;
  }

  function takePhoto(name) {
    var rec = {
      name: name || '家园快照',
      at: Date.now(),
      wall: st.room.wall,
      floor: st.room.floor,
      weather: st.weather,
      day: st.home.day,
      ponies: st.unlocks.ponies.map(function (pid) { return { id: pid, hearts: heartsOf(pid) }; })
    };
    st.album.unshift(rec);
    if (st.album.length > 12) st.album.length = 12;
    log('拍照', rec.name);
    checkAchievements();
    notify();
    return rec;
  }

  function removePhoto(i) { st.album.splice(i, 1); notify(); }

  function setGameBest(kind, v) {
    if (kind === 'star') {
      st.gameBest.star = Math.max(st.gameBest.star || 0, v);
      addStars(Math.round(v / 3) + 2, '抓星星');
    } else if (kind === 'memory') {
      st.gameBest.memory = st.gameBest.memory ? Math.min(st.gameBest.memory, v) : v;
      addStars(Math.max(5, 24 - v), '记忆翻牌');
    }
    checkAchievements();
    notify();
  }

  /* ---------- 破解开关：一键解锁 / 一键还原 ---------- */

  function unlockEverything() {
    DATA.ITEMS.forEach(function (i) {
      if (st.unlocks.items.indexOf(i.id) < 0) st.unlocks.items.push(i.id);
    });
    DATA.PONIES.forEach(function (p) {
      if (st.unlocks.ponies.indexOf(p.id) < 0) st.unlocks.ponies.push(p.id);
    });
  }

  /* 关闭破解时，把当前身上 / 造型里已经没有权限的饰品脱下来 */
  function stripLockedOutfit() {
    Object.keys(st.outfit).forEach(function (k) {
      var v = st.outfit[k];
      if (!v) return;
      if (k === 'bg') {
        if (!hasItem(v)) {
          var firstBg = st.unlocks.items.filter(function (id) {
            var it = DATA.item(id);
            return it && it.slot === 'bg';
          })[0];
          st.outfit.bg = firstBg || 'bg-sky';
        }
        return;
      }
      if (!hasItem(v)) st.outfit[k] = null;
    });
  }

  function setCheat(on) {
    on = !!on;
    if (on === !!st.cheat) return false;

    if (on) {
      /* 先快照，关闭时精确还原，不误伤孩子自己挣来的东西 */
      st.cheatBackup = {
        items: st.unlocks.items.slice(),
        ponies: st.unlocks.ponies.slice(),
        activePony: st.activePony
      };
      unlockEverything();
      st.cheat = true;
      log('破解开启', '解锁全部');
    } else {
      var b = st.cheatBackup || { items: initials('item'), ponies: initials('pony'), activePony: st.activePony };
      st.unlocks.items = b.items.filter(function (id) { return !!DATA.item(id); });
      st.unlocks.ponies = b.ponies.filter(function (id) { return !!DATA.pony(id); });
      if (!st.unlocks.ponies.length) st.unlocks.ponies = initials('pony');
      if (!st.unlocks.items.length) st.unlocks.items = initials('item');
      st.activePony = hasPony(b.activePony) ? b.activePony : st.unlocks.ponies[0];
      stripLockedOutfit();
      st.cheatBackup = null;
      st.cheat = false;
      log('破解关闭', '恢复原状');
    }
    notify();
    return true;
  }

  function cheatOn() { return !!st.cheat; }

  function addCustomTask(title, desc, rewards, star) {
    var id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
    st.customTasks.unshift({
      id: id,
      title: title,
      desc: desc || '',
      tag: '自定义',
      custom: true,
      rewards: rewards || [],
      star: Math.max(1, Math.min(10, parseInt(star, 10) || 1))
    });
    log('新增任务', title);
    notify();
    return id;
  }

  /* 修改自定义任务：保留原 id，避免已提交/已审核的记录断链 */
  function updateCustomTask(id, title, desc, rewards, star) {
    var t = null;
    st.customTasks.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return false;
    t.title = title;
    t.desc = desc || '';
    t.tag = t.tag || '自定义';
    t.custom = true;
    t.rewards = rewards || [];
    t.star = Math.max(1, Math.min(10, parseInt(star, 10) || 1));
    log('修改任务', title);
    notify();
    return true;
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
  decayNeeds();
  save();

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
    setCheat: setCheat,
    cheatOn: cheatOn,
    addCustomTask: addCustomTask,
    updateCustomTask: updateCustomTask,
    removeCustomTask: removeCustomTask,
    stars: function () { return st.stars; },
    addStars: addStars,
    spendStars: spendStars,
    addXp: addXp,
    level: function () { return st.level; },
    xp: function () { return st.xp; },
    needsOf: needsOf,
    decayNeeds: decayNeeds,
    applyNeed: applyNeed,
    traitOf: traitOf,
    needLevel: needLevel,
    owns: owns,
    bagList: bagList,
    buy: buy,
    useItem: useItem,
    checkinState: checkinState,
    doCheckin: doCheckin,
    hasAch: hasAch,
    takePendingAch: takePendingAch,
    checkAchievements: checkAchievements,
    setWall: setWall,
    setFloor: setFloor,
    hasFurni: hasFurni,
    pottyCount: pottyCount,
    washCount: washCount,
    markPotty: markPotty,
    markWash: markWash,
    moveFurni: moveFurni,
    takePhoto: takePhoto,
    removePhoto: removePhoto,
    setGameBest: setGameBest,
    weather: function () { return DATA.weather(st.weather); },
    heartsOf: heartsOf,
    addHearts: addHearts,
    heartsTotal: heartsTotal,
    isDay: isDay,
    soundOn: soundOn,
    toggleSound: toggleSound,
    toggleDay: toggleDay,
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
