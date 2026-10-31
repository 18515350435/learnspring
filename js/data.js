/**
 * 静态数据层：小马、饰品、任务、背景
 * 纯静态，无依赖，挂载到 window.DATA 上供 index.html / admin.html 共用。
 */
(function () {
  'use strict';

  /* 装饰位（渲染时的 z 轴顺序即为此数组顺序） */
  var CATS = [
    { id: 'bg', name: '场景背景', tip: '给小马换一张漂亮的舞台背景' },
    { id: 'wing', name: '翅膀', tip: '背后的梦幻翅膀' },
    { id: 'hair', name: '鬃毛发饰', tip: '别在鬃毛上的小装饰' },
    { id: 'forehead', name: '额饰', tip: '额头上的魔法印记' },
    { id: 'headwear', name: '头饰', tip: '戴在头顶的小物件' },
    { id: 'glasses', name: '眼镜', tip: '酷酷的眼镜' },
    { id: 'eyes', name: '眼妆', tip: '让眼睛更有神' },
    { id: 'cheek', name: '腮红唇彩', tip: '甜甜的好气色' },
    { id: 'neck', name: '颈饰', tip: '脖子上的项链和围巾' }
  ];

  /* 小马档案：body 身体 / mane 鬃毛（数组即彩条）/ inner 耳内 / eye 瞳色 / muzzle 口鼻 */
  var PONIES = [
    {
      id: 'twilight', name: '紫悦', race: '独角兽', initial: true,
      desc: '爱看书的小马，魔法最拿手。',
      colors: { body: '#C6A6E8', mane: '#6C3D9E', mane2: '#F06FB0', inner: '#F0E2FF', eye: '#7B4FB5', muzzle: '#F6EDFF' }
    },
    {
      id: 'rainbowdash', name: '云宝', race: '飞马',
      desc: '飞得最快的小马，勇敢又好胜。',
      colors: { body: '#86C9F2', mane: ['#E8467C', '#F7A623', '#F7E023', '#7FC86F', '#4BA3E8', '#A56BE8'], mane2: '#FFE66B', inner: '#DDF1FF', eye: '#E8467C', muzzle: '#EAF6FF' }
    },
    {
      id: 'pinkie', name: '碧琪', race: '陆马',
      desc: '派对小达人，笑起来停不住。',
      colors: { body: '#F7A9C6', mane: '#EE5C9E', mane2: '#FFB3D6', inner: '#FFE0EF', eye: '#3B9BE0', muzzle: '#FFF0F7' }
    },
    {
      id: 'fluttershy', name: '柔柔', race: '飞马',
      desc: '说话轻轻的，最会照顾小动物。',
      colors: { body: '#FBE9A0', mane: '#F2A8CE', mane2: '#FFD9EA', inner: '#FFF8DD', eye: '#57B9A8', muzzle: '#FFFBE6' }
    },
    {
      id: 'rarity', name: '珍奇', race: '独角兽',
      desc: '时装设计师，最爱亮闪闪。',
      colors: { body: '#FBF6FA', mane: '#B07BD6', mane2: '#E6CDF6', inner: '#F4E9FF', eye: '#4B6FB0', muzzle: '#FFF8FC' }
    },
    {
      id: 'applejack', name: '苹果嘉儿', race: '陆马',
      desc: '果园里的实干家，说到做到。',
      colors: { body: '#F3A93C', mane: '#F7D774', mane2: '#FFF0B0', inner: '#FFF2CF', eye: '#6BA24C', muzzle: '#FFF4DC' }
    }
  ];

  /* 饰品：slot 对应 CATS.id，initial 为初始拥有 */
  var ITEMS = [
    { id: 'bg-sky', slot: 'bg', name: '云朵天空', initial: true },
    { id: 'bg-rainbow', slot: 'bg', name: '彩虹瀑布' },
    { id: 'bg-night', slot: 'bg', name: '星夜城堡' },

    { id: 'wing-butterfly', slot: 'wing', name: '幻蝶之翼' },
    { id: 'wing-angel', slot: 'wing', name: '天使羽翼' },
    { id: 'wing-rainbow', slot: 'wing', name: '彩虹光翼' },

    { id: 'hair-flower', slot: 'hair', name: '花朵发饰', initial: true },
    { id: 'hair-ribbon', slot: 'hair', name: '丝带发带' },
    { id: 'hair-star', slot: 'hair', name: '星星发夹' },

    { id: 'fd-star', slot: 'forehead', name: '星辰印记' },
    { id: 'fd-gem', slot: 'forehead', name: '魔法宝石' },
    { id: 'fd-moon', slot: 'forehead', name: '弯月印记' },

    { id: 'hw-bow', slot: 'headwear', name: '蝴蝶结' },
    { id: 'hw-headphone', slot: 'headwear', name: '星星耳机' },
    { id: 'hw-hat', slot: 'headwear', name: '阳光草帽' },
    { id: 'hw-crown', slot: 'headwear', name: '水晶皇冠' },
    { id: 'hw-wreath', slot: 'headwear', name: '鲜花花环' },

    { id: 'gl-round', slot: 'glasses', name: '圆框眼镜' },
    { id: 'gl-heart', slot: 'glasses', name: '爱心眼镜' },
    { id: 'gl-sun', slot: 'glasses', name: '酷炫墨镜' },

    { id: 'ey-lash', slot: 'eyes', name: '纤长睫毛' },
    { id: 'ey-sparkle', slot: 'eyes', name: '星星眼妆' },

    { id: 'ck-blush', slot: 'cheek', name: '蜜桃腮红', initial: true },
    { id: 'ck-glitter', slot: 'cheek', name: '亮闪细粉' },
    { id: 'ck-gloss', slot: 'cheek', name: '果冻唇彩' },

    { id: 'nk-pearl', slot: 'neck', name: '珍珠项链' },
    { id: 'nk-bell', slot: 'neck', name: '铃铛项圈' },
    { id: 'nk-scarf', slot: 'neck', name: '彩虹围巾' },
    { id: 'nk-heart', slot: 'neck', name: '爱心项链' }
  ];

  /* 任务：完成并通过家长审核后发放 rewards */
  var TASKS = [
    { id: 't01', title: '读完一本绘本', desc: '认真读完，并把故事讲给家人听。', tag: '阅读', rewards: ['hw-bow'] },
    { id: 't02', title: '练琴 / 练字 30 分钟', desc: '坚持练习半小时，中途不偷懒。', tag: '才艺', rewards: ['hair-ribbon', 'ck-glitter'] },
    { id: 't03', title: '整理书包和书桌', desc: '自己的东西自己收拾整齐。', tag: '自理', rewards: ['fd-star'] },
    { id: 't04', title: '户外活动 1 小时', desc: '到户外跑一跑、跳一跳。', tag: '运动', rewards: ['hw-headphone'] },
    { id: 't05', title: '做完一页口算', desc: '又快又准，做完自己检查一遍。', tag: '学习', rewards: ['gl-round'] },
    { id: 't06', title: '帮忙做一件家务', desc: '洗碗、扫地、叠衣服都可以。', tag: '劳动', rewards: ['fd-gem', 'fd-moon'] },
    { id: 't07', title: '画一幅画送家人', desc: '用心画，并写上想说的话。', tag: '才艺', rewards: ['bg-rainbow'] },
    { id: 't08', title: '早睡早起连续 3 天', desc: '不用催，自己上床睡觉。', tag: '作息', rewards: ['hair-star'] },
    { id: 't09', title: '背会 5 个英语单词', desc: '会读会拼，还能造一个句子。', tag: '学习', rewards: ['hw-hat'] },
    { id: 't10', title: '独立写作业并检查', desc: '遇到难题先自己想办法。', tag: '学习', rewards: ['hw-crown'] },
    { id: 't11', title: '跳绳 300 个', desc: '可以分几次完成，累计 300 个。', tag: '运动', rewards: ['wing-butterfly'] },
    { id: 't12', title: '和家人做一顿饭', desc: '当一次小帮厨，注意安全。', tag: '劳动', rewards: ['gl-heart', 'nk-bell'] },
    { id: 't13', title: '坚持写日记 7 天', desc: '每天一句话也可以，写满一周。', tag: '阅读', rewards: ['ck-gloss'] },
    { id: 't14', title: '读满 10 本书', desc: '和爸爸妈妈一起数一数。', tag: '阅读', rewards: ['bg-night', 'nk-heart'] },
    { id: 't15', title: '一整周任务全勤', desc: '这一周每天的任务都完成了。', tag: '坚持', rewards: ['hw-wreath'] },
    { id: 't16', title: '学会一项新技能', desc: '骑车、游泳、系鞋带……都可以。', tag: '成长', rewards: ['wing-angel', 'pony:rainbowdash'] },
    { id: 't17', title: '被老师表扬一次', desc: '把表扬的事说给家长听。', tag: '学习', rewards: ['ey-sparkle'] },
    { id: 't18', title: '测验进步 5 名以上', desc: '和自己比，有进步就值得奖励。', tag: '学习', rewards: ['gl-sun'] },
    { id: 't19', title: '阅读打卡 30 天', desc: '连续一个月每天读一点书。', tag: '阅读', rewards: ['wing-rainbow'] },
    { id: 't20', title: '照顾小生命一整周', desc: '给植物浇水，或照顾小宠物。', tag: '责任', rewards: ['nk-pearl', 'pony:fluttershy'] },
    { id: 't21', title: '独立完成手工作品', desc: '从想法到成品，尽量自己完成。', tag: '才艺', rewards: ['nk-scarf', 'pony:rarity'] },
    { id: 't22', title: '帮家里大扫除一次', desc: '选一个房间，负责到底。', tag: '劳动', rewards: ['ey-lash'] },
    { id: 't23', title: '把好心情传给别人', desc: '做一件让别人开心的小事。', tag: '成长', rewards: ['pony:pinkie'] },
    { id: 't24', title: '学会做一道菜', desc: '从洗菜到装盘，亲手完成。', tag: '劳动', rewards: ['pony:applejack'] }
  ];

  /* 任务星级：决定通过后发放多少星星币（star × 10） */
  var STAR_MAP = {
    t01: 1, t02: 2, t03: 1, t04: 1, t05: 1, t06: 2, t07: 2, t08: 2, t09: 1, t10: 2,
    t11: 2, t12: 2, t13: 2, t14: 3, t15: 3, t16: 3, t17: 2, t18: 3, t19: 3, t20: 3,
    t21: 3, t22: 2, t23: 2, t24: 3
  };
  TASKS.forEach(function (t) { t.star = STAR_MAP[t.id] || 1; });

  /* ---------- 家园养成：需求 / 商店 / 成就 ---------- */

  /* 小马的四项需求 */
  var NEEDS = [
    { id: 'food', name: '吃饱', icon: '🍎', color: '#ff8fa3' },
    { id: 'clean', name: '干净', icon: '🛁', color: '#6fb7e8' },
    { id: 'mood', name: '开心', icon: '💖', color: '#ff7fb0' },
    { id: 'energy', name: '精神', icon: '⚡', color: '#f5b731' }
  ];

  /* 商店商品：cat = food 食物 / toy 玩具 / furni 家具 / wall 墙纸 / floor 地板
     食物与玩具带 need（对四项需求的增减），lv 是购买所需等级 */
  var GOODS = [
    { id: 'f-apple', cat: 'food', name: '脆苹果', price: 5, lv: 1, icon: '🍎', need: { food: 25, mood: 3 } },
    { id: 'f-carrot', cat: 'food', name: '甜胡萝卜', price: 8, lv: 1, icon: '🥕', need: { food: 32, mood: 4 } },
    { id: 'f-cake', cat: 'food', name: '星星蛋糕', price: 16, lv: 2, icon: '🍰', need: { food: 55, mood: 10 } },
    { id: 'f-candy', cat: 'food', name: '彩虹糖', price: 24, lv: 3, icon: '🍬', need: { food: 40, mood: 18 } },
    { id: 'f-ice', cat: 'food', name: '云朵冰淇淋', price: 38, lv: 4, icon: '🍦', need: { food: 70, mood: 22 } },
    { id: 'f-feast', cat: 'food', name: '派对套餐', price: 60, lv: 5, icon: '🎂', need: { food: 100, mood: 35 } },

    { id: 't-ball', cat: 'toy', name: '彩虹皮球', price: 30, lv: 1, icon: '⚽', need: { mood: 25, energy: -8 } },
    { id: 't-bubble', cat: 'toy', name: '泡泡机', price: 45, lv: 2, icon: '🫧', need: { mood: 32, clean: 10, energy: -6 } },
    { id: 't-music', cat: 'toy', name: '星星音乐盒', price: 65, lv: 3, icon: '🎵', need: { mood: 45, energy: 10 } },
    { id: 't-swing', cat: 'toy', name: '云朵秋千', price: 95, lv: 5, icon: '🎠', need: { mood: 60, energy: -12 } },

    { id: 'u-sofa', cat: 'furni', name: '云朵沙发', price: 50, lv: 1, w: 130, h: 76, icon: '🛋️' },
    { id: 'u-shelf', cat: 'furni', name: '星星书架', price: 70, lv: 2, w: 92, h: 116, icon: '📚' },
    { id: 'u-lamp', cat: 'furni', name: '蘑菇小灯', price: 40, lv: 1, w: 48, h: 84, icon: '🍄' },
    { id: 'u-tent', cat: 'furni', name: '秘密帐篷', price: 85, lv: 3, w: 136, h: 104, icon: '⛺' },
    { id: 'u-bed', cat: 'furni', name: '公主床', price: 110, lv: 4, w: 144, h: 82, icon: '🛏️' },
    { id: 'u-rug', cat: 'furni', name: '彩虹地毯', price: 60, lv: 2, w: 190, h: 44, icon: '🟣', flat: true },
    { id: 'u-horse', cat: 'furni', name: '摇摆木马', price: 90, lv: 3, w: 84, h: 84, icon: '🎠' },
    { id: 'u-tub', cat: 'furni', name: '泡泡浴缸', price: 75, lv: 2, w: 112, h: 72, icon: '🛁', desc: '小马脏了可以来泡个泡泡澡' },
    { id: 'u-toilet', cat: 'furni', name: '云朵马桶', price: 40, lv: 1, w: 84, h: 88, icon: '🚽', desc: '小马想上厕所时会自己跑过来（初始星星币 + 首次打卡正好买得起）' },
    { id: 'u-sink', cat: 'furni', name: '星星洗手台', price: 55, lv: 2, w: 76, h: 86, icon: '🚰', desc: '上完厕所会自己过来洗手，讲卫生' },
    { id: 'u-piano', cat: 'furni', name: '糖果钢琴', price: 130, lv: 5, w: 124, h: 94, icon: '🎹' },
    { id: 'u-plant', cat: 'furni', name: '星星盆栽', price: 35, lv: 1, w: 52, h: 74, icon: '🪴' },

    { id: 'w-cloud', cat: 'wall', name: '粉云墙纸', price: 40, lv: 1, swatch: '#ffd9ec' },
    { id: 'w-star', cat: 'wall', name: '星夜墙纸', price: 55, lv: 2, swatch: '#cdb9f2' },
    { id: 'w-candy', cat: 'wall', name: '糖果墙纸', price: 65, lv: 3, swatch: '#ffe1ea' },
    { id: 'w-mint', cat: 'wall', name: '薄荷墙纸', price: 65, lv: 3, swatch: '#d6f2e9' },

    { id: 'g-marble', cat: 'floor', name: '云石地板', price: 35, lv: 1, swatch: '#f3e6f7' },
    { id: 'g-wood', cat: 'floor', name: '蜜色木地板', price: 45, lv: 2, swatch: '#f7dcb4' },
    { id: 'g-grass', cat: 'floor', name: '青草地板', price: 60, lv: 3, swatch: '#c9e9b0' }
  ];

  var CAT_NAMES = { food: '美食', toy: '玩具', furni: '家具', wall: '墙纸', floor: '地板' };

  /* 成就：达成时一次性发放星星币 */
  var ACHIEVEMENTS = [
    { id: 'a-pet', name: '初次见面', desc: '第一次摸摸小马', stars: 20 },
    { id: 'a-friend', name: '好朋友', desc: '任意小马爱心达到 50', stars: 30 },
    { id: 'a-best', name: '最佳伙伴', desc: '任意小马爱心达到 200', stars: 80 },
    { id: 'a-allpony', name: '小马谷居民', desc: '解锁全部 6 匹小马', stars: 100 },
    { id: 'a-wardrobe', name: '衣柜大师', desc: '解锁 20 件饰品', stars: 60 },
    { id: 'a-task5', name: '任务新星', desc: '完成 5 个任务', stars: 30 },
    { id: 'a-task15', name: '任务达人', desc: '完成 15 个任务', stars: 70 },
    { id: 'a-rich', name: '小小富翁', desc: '累计获得 500 星星币', stars: 50 },
    { id: 'a-designer', name: '室内设计师', desc: '拥有 5 件家具', stars: 50 },
    { id: 'a-star30', name: '抓星高手', desc: '抓星星单局拿到 30 分', stars: 40 },
    { id: 'a-memory', name: '记忆大师', desc: '12 步内完成记忆翻牌', stars: 40 },
    { id: 'a-streak7', name: '坚持不懈', desc: '连续打卡 7 天', stars: 60 },
    { id: 'a-photo', name: '小小摄影师', desc: '拍下 3 张家园照片', stars: 30 },
    { id: 'a-full', name: '满分照料', desc: '所有小马四项需求都超过 80', stars: 60 },
    { id: 'a-level5', name: '成长之路', desc: '等级达到 5 级', stars: 60 },
    { id: 'a-potty', name: '自己会上厕所', desc: '第一次带小马用马桶', stars: 30 },
    { id: 'a-wash', name: '讲卫生的好孩子', desc: '上完厕所洗手 10 次', stars: 50 }
  ];

  var WEATHERS = [
    { id: 'sunny', name: '晴天', icon: '☀️' },
    { id: 'cloudy', name: '多云', icon: '☁️' },
    { id: 'rain', name: '下雨', icon: '🌧️' },
    { id: 'snow', name: '下雪', icon: '❄️' }
  ];

  /* 照料倾向累积到最多的一项，会成为小马的性格 */
  var TRAITS = {
    food: { name: '小吃货', desc: '最爱吃东西，闻到香味第一个跑过来' },
    mood: { name: '开心果', desc: '天天乐呵呵，最喜欢和你一起玩' },
    clean: { name: '爱干净', desc: '最喜欢洗香香、梳得漂漂亮亮' },
    energy: { name: '瞌睡虫', desc: '晒着太阳就能睡着，梦里还在吃苹果' },
    pet: { name: '黏人精', desc: '最喜欢被摸摸，你走哪它跟哪' }
  };

  /* 反查表 */
  var itemMap = {}, ponyMap = {}, taskMap = {}, unlockSource = {};
  var goodsMap = {}, achMap = {};
  GOODS.forEach(function (g) { goodsMap[g.id] = g; });
  ACHIEVEMENTS.forEach(function (a) { achMap[a.id] = a; });
  ITEMS.forEach(function (it) {
    itemMap[it.id] = it;
    it.taskId = null;
  });
  PONIES.forEach(function (p) {
    ponyMap[p.id] = p;
    if (!p.initial) p.taskId = null;
  });
  TASKS.forEach(function (t) {
    taskMap[t.id] = t;
    t.rewards.forEach(function (r) {
      unlockSource[r] = t.id;
      var key = r.indexOf('pony:') === 0 ? r.slice(5) : r;
      if (r.indexOf('pony:') === 0) { if (ponyMap[key]) ponyMap[key].taskId = t.id; }
      else if (itemMap[key]) itemMap[key].taskId = t.id;
    });
  });

  window.DATA = {
    CATS: CATS,
    PONIES: PONIES,
    ITEMS: ITEMS,
    TASKS: TASKS,
    item: function (id) { return itemMap[id]; },
    pony: function (id) { return ponyMap[id]; },
    task: function (id) { return taskMap[id]; },
    bySlot: function (slot) { return ITEMS.filter(function (i) { return i.slot === slot; }); },
    taskOf: function (rewardKey) { return taskMap[unlockSource[rewardKey]]; },
    NEEDS: NEEDS,
    GOODS: GOODS,
    CAT_NAMES: CAT_NAMES,
    ACHIEVEMENTS: ACHIEVEMENTS,
    WEATHERS: WEATHERS,
    TRAITS: TRAITS,
    goods: function (id) { return goodsMap[id] || null; },
    goodsBy: function (cat) { return GOODS.filter(function (g) { return g.cat === cat; }); },
    achievement: function (id) { return achMap[id] || null; },
    weather: function (id) {
      for (var i = 0; i < WEATHERS.length; i++) if (WEATHERS[i].id === id) return WEATHERS[i];
      return WEATHERS[0];
    },
    checkinReward: function (day) { return 10 + Math.min(Math.max(day - 1, 0), 10) * 5; },
    xpForLevel: function (lv) { return 100 + (lv - 1) * 80; },
    allTasks: function () {
      var extra = (window.Store && window.Store.customTasks) ? window.Store.customTasks() : [];
      return extra.concat(TASKS);
    },
    totalItems: ITEMS.length,
    totalPonies: PONIES.length
  };
})();
