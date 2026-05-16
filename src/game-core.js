export const TIMES = ["朝", "昼", "夕方", "夜"];
export const MAX_DAY = 7;
export const REQUIRED_PARTS = 3;
export const REQUIRED_TRACES_FOR_TRUTH = 2;
export const MAX_LOGS = 80;
export const REST_HEAL_AMOUNT = 8;
export const REST_INFECTION_RECOVERY = 4;
export const MEDICINE_HEAL_AMOUNT = 18;
export const MEDICINE_INFECTION_RECOVERY = 12;
export const FIRST_AID_HEAL_BONUS = 4;
export const FIRST_AID_INFECTION_BONUS = 2;
export const SCAVENGE_BONUS = 1;
export const FRONTLINE_DAMAGE_REDUCTION = 2;
export const MAX_AREA_DANGER = 6;
export const AREA_DANGER_INCREASE = 1;
export const AREA_DANGER_RECOVERY = 1;
export const DANGER_REINFORCEMENT_ENEMY = "walker";
export const BARRICADE_PART_COST = 1;
export const BARRICADE_DANGER_REDUCTION = 2;
export const RAID_DANGER_THRESHOLD = 5;
export const RAID_DAMAGE = 4;
export const RAID_MORALE_LOSS = 6;
export const WATCH_MAX_LEVEL = 2;
export const WATCH_DAMAGE_REDUCTION = 2;
export const WATCH_MORALE_REDUCTION = 3;
export const MAX_FLAG_PRESSURE = 100;
export const FLAG_PRESSURE_TIME_GAIN = 6;
export const FLAG_PRESSURE_NIGHT_GAIN = 8;
export const FLAG_PRESSURE_REST_RECOVERY = 10;
export const FLAG_PRESSURE_GUARD_RECOVERY = 6;
export const SAVE_VERSION = 1;

export const CHAPTERS = {
  1: {
    id: 1,
    title: "第一章：校内安全確保",
    description: "校内を探索してアカリを救出し、通信機修理の足がかりになる部品を確保する。",
    reward: { morale: 8, food: 1 },
  },
};

export const RATION_POLICIES = {
  normal: {
    id: "normal",
    name: "標準",
    description: "人数分の食料を消費する通常方針。",
    foodModifier: 0,
    moraleChange: 0,
  },
  conserve: {
    id: "conserve",
    name: "節約",
    description: "食料消費を1つ抑える代わりに、夜明けの士気が少し下がる。",
    foodModifier: -1,
    moraleChange: -3,
  },
  generous: {
    id: "generous",
    name: "厚め",
    description: "食料を1つ多く使い、夜明けの士気を上げる。",
    foodModifier: 1,
    moraleChange: 4,
  },
};

export const TACTICS = {
  balanced: {
    id: "balanced",
    name: "標準",
    description: "攻撃と安全を両立する基本方針。",
    attackModifier: 0,
    damageMultiplier: 1,
    infectionModifier: 0,
    escapeModifier: 0,
  },
  cautious: {
    id: "cautious",
    name: "慎重",
    description: "攻撃力は少し下がるが、被害と旗汚染を抑えて逃走しやすくなる。",
    attackModifier: -2,
    damageMultiplier: 0.75,
    infectionModifier: -2,
    escapeModifier: 0.1,
  },
  aggressive: {
    id: "aggressive",
    name: "強行",
    description: "攻撃力を上げる代わりに、被害と旗汚染のリスクが増える。",
    attackModifier: 4,
    damageMultiplier: 1.25,
    infectionModifier: 2,
    escapeModifier: -0.08,
  },
};

export const AREAS = {
  school: {
    name: "校内",
    danger: 1,
    timeCost: 1,
    description: "仲間イベントと部品が見つかりやすい。序盤の安全な探索先。",
    background: "school",
    terrain: [
      "##############",
      "#............#",
      "#..##........#",
      "#..##..##....#",
      "#......##....#",
      "#..####......#",
      "#............#",
      "#....##..##..#",
      "#....##..##..#",
      "#............#",
      "#..##........#",
      "#..........X.#",
      "#............#",
      "##############",
    ],
    layers: {
      decor: [
        "              ",
        "   d      b   ",
        "   ll         ",
        "   ll  dd     ",
        "       bb     ",
        "  dddd        ",
        "      f       ",
        "    ll  dd    ",
        "    ll  bb    ",
        "        w     ",
        "  dd          ",
        "          r   ",
        "     s        ",
        "              ",
      ],
    },
    start: { x: 1, y: 1 },
    entities: [
      { type: "item", x: 5, y: 1, loot: "school" },
      { type: "enemy", x: 10, y: 2, enemy: "walker" },
      { type: "event", x: 7, y: 4, event: "locker" },
      { type: "enemy", x: 11, y: 5, enemy: "teacher" },
      { type: "ally", x: 6, y: 7, ally: "akari" },
      { type: "event", x: 2, y: 10, event: "broadcast" },
      { type: "item", x: 10, y: 10, loot: "parts" },
      { type: "stairs", x: 12, y: 12, targetFloor: 1, label: "2F" },
    ],
    floors: [
      null,
      {
        nameSuffix: "2F",
        start: { x: 1, y: 12 },
        terrain: [
          "##############",
          "#..........X.#",
          "#.####.#####.#",
          "#....#.....#.#",
          "####.#.###.#.#",
          "#....#.#...#.#",
          "#.####.#.###.#",
          "#......#.....#",
          "#.##########.#",
          "#....#.......#",
          "####.#.#####.#",
          "#......#.....#",
          "#............#",
          "##############",
        ],
        layers: {
          decor: [
            "              ",
            "        w r   ",
            "  lll   lll   ",
            "   b      b   ",
            "      d       ",
            "  c       w   ",
            "      lll     ",
            "   d      b   ",
            "   llllllll   ",
            " b      w     ",
            "      d  lll  ",
            "    f         ",
            " r          d ",
            "              ",
          ],
        },
        entities: [
          { type: "stairs", x: 1, y: 12, targetFloor: 0, label: "1F" },
          { type: "enemy", x: 7, y: 3, enemy: "teacher" },
          { type: "item", x: 10, y: 5, loot: "parts" },
          { type: "event", x: 3, y: 11, event: "broadcast" },
        ],
      },
    ],
  },
  market: {
    name: "商店街",
    danger: 3,
    timeCost: 1,
    description: "食料と武器が多いが敵も増える。物資不足なら向かいたい。",
    background: "market",
    terrain: [
      "##############",
      "#............#",
      "#..##.....##.#",
      "#..##.....##.#",
      "#............#",
      "#.....##.....#",
      "#.....##.....#",
      "#.###........#",
      "#........##..#",
      "#........##..#",
      "#............#",
      "#..........X.#",
      "#............#",
      "##############",
    ],
    layers: {
      decor: [
        "              ",
        "  c  c  k     ",
        "  ww     ss   ",
        "  bb     kk   ",
        "       c      ",
        "     ss       ",
        "     kk       ",
        " ggg     c    ",
        "        ss    ",
        "        kk    ",
        "   c      g   ",
        "          r   ",
        "     k        ",
        "              ",
      ],
    },
    start: { x: 1, y: 1 },
    entities: [
      { type: "item", x: 5, y: 1, loot: "food" },
      { type: "enemy", x: 10, y: 1, enemy: "runner" },
      { type: "item", x: 1, y: 4, loot: "food" },
      { type: "enemy", x: 4, y: 7, enemy: "walker" },
      { type: "item", x: 8, y: 8, loot: "weapon" },
      { type: "event", x: 10, y: 10, event: "basket" },
      { type: "stairs", x: 12, y: 12, targetFloor: 1, label: "裏" },
    ],
    floors: [
      null,
      {
        nameSuffix: "裏路地",
        start: { x: 1, y: 12 },
        terrain: [
          "##############",
          "#..........X.#",
          "#.##########.#",
          "#....#.......#",
          "####.#.#####.#",
          "#....#.#.....#",
          "#.####.#.###.#",
          "#......#.#...#",
          "#.######.#.#.#",
          "#....#.....#.#",
          "####.#.#####.#",
          "#......#.....#",
          "#............#",
          "##############",
        ],
        layers: {
          decor: [
            "              ",
            "    k   r     ",
            "  ssssssssss  ",
            " c   k     c  ",
            "     r        ",
            "  k    s      ",
            "  wwww   k    ",
            "     r        ",
            "  ssssss s s  ",
            "  c      k    ",
            "     r  ssss  ",
            "    k       c ",
            " r          d ",
            "              ",
          ],
        },
        entities: [
          { type: "stairs", x: 1, y: 12, targetFloor: 0, label: "表" },
          { type: "enemy", x: 5, y: 5, enemy: "runner" },
          { type: "item", x: 10, y: 7, loot: "food" },
          { type: "item", x: 11, y: 11, loot: "parts" },
        ],
      },
    ],
  },
  hospital: {
    name: "病院",
    danger: 4,
    timeCost: 2,
    description: "薬と治療イベントがある高リスク地帯。汚染にも注意。",
    background: "hospital",
    terrain: [
      "##############",
      "#............#",
      "#..####......#",
      "#..####..##..#",
      "#........##..#",
      "#..##........#",
      "#..##........#",
      "#.....##.....#",
      "#.....##..##.#",
      "#.........##.#",
      "#............#",
      "#..........X.#",
      "#............#",
      "##############",
    ],
    layers: {
      decor: [
        "              ",
        "   p    m     ",
        "   bbbb       ",
        "   bbbb  cc   ",
        "         rr   ",
        "  bb      m   ",
        "  cc          ",
        "     rr       ",
        "     bb  cc   ",
        "         rr   ",
        "    m     p   ",
        "          r   ",
        "      p       ",
        "              ",
      ],
    },
    start: { x: 1, y: 1 },
    entities: [
      { type: "event", x: 9, y: 1, event: "ward" },
      { type: "item", x: 1, y: 4, loot: "medicine" },
      { type: "enemy", x: 7, y: 4, enemy: "brute" },
      { type: "item", x: 10, y: 6, loot: "medicine" },
      { type: "enemy", x: 6, y: 8, enemy: "runner" },
      { type: "ally", x: 3, y: 10, ally: "shun" },
    ],
  },
  park: {
    name: "公園",
    danger: 2,
    timeCost: 1,
    description: "壁が少なく敵を避けやすい。素材と小イベントが中心。",
    background: "park",
    terrain: [
      "##############",
      "#............#",
      "#............#",
      "#............#",
      "#............#",
      "#............#",
      "#............#",
      "#............#",
      "#............#",
      "#............#",
      "#............#",
      "#..........X.#",
      "#............#",
      "##############",
    ],
    layers: {
      decor: [
        "              ",
        "  t     t     ",
        "     g      t ",
        "   t          ",
        "       f      ",
        "  g       t   ",
        "      t       ",
        "   f      g   ",
        "          t   ",
        " t    g       ",
        "      f       ",
        "          r   ",
        "    t      g  ",
        "              ",
      ],
    },
    start: { x: 1, y: 1 },
    entities: [
      { type: "item", x: 8, y: 2, loot: "food" },
      { type: "enemy", x: 4, y: 4, enemy: "runner" },
      { type: "event", x: 9, y: 5, event: "flag" },
      { type: "item", x: 6, y: 8, loot: "parts" },
      { type: "enemy", x: 10, y: 9, enemy: "walker" },
      { type: "stairs", x: 12, y: 12, targetFloor: 1, label: "丘" },
    ],
    floors: [
      null,
      {
        nameSuffix: "丘の上",
        start: { x: 1, y: 12 },
        terrain: [
          "##############",
          "#..........X.#",
          "#.####.#####.#",
          "#....#.......#",
          "####.#.#####.#",
          "#....#.#.....#",
          "#.####.#.###.#",
          "#......#.#...#",
          "#.######.#.#.#",
          "#....#.....#.#",
          "####.#.#####.#",
          "#......#.....#",
          "#............#",
          "##############",
        ],
        layers: { decor: [
          "              ", "    t   r     ", "  gggggggggg  ", " t   g     t  ", "     r        ", "  g    t      ", "  tttt   g    ", "     r        ", "  gggggg g g  ", "  t      g    ", "     r  gggg  ", "    f       t ", " r          d ", "              ",
        ] },
        entities: [
          { type: "stairs", x: 1, y: 12, targetFloor: 0, label: "下" },
          { type: "enemy", x: 8, y: 7, enemy: "runner" },
          { type: "item", x: 10, y: 10, loot: "parts" },
        ],
      },
    ],
  },
  vacant: {
    name: "空き地・通信塔跡",
    danger: 4,
    timeCost: 2,
    description: "部品を揃えた後に開く最終迷路。屋上の代わりに通信塔跡を突破して第一章を終える。",
    background: "park",
    terrain: [
      "##############",
      "#............#",
      "#.##########.#",
      "#.#........#.#",
      "#.#.######.#.#",
      "#.#.#....#.#.#",
      "#.#.#.##.#.#.#",
      "#...#....#...#",
      "###.######.###",
      "#...#....#...#",
      "#.###.##.###.#",
      "#............#",
      "#............#",
      "##############",
    ],
    layers: { decor: [
      "              ",
      "  r     f     ",
      "  ssssssssss  ",
      "  s      r s  ",
      "  s ssss s s  ",
      "  s s  p s s  ",
      "  s s ss s s  ",
      " r  s    s  r ",
      " sss ssss sss ",
      " r  s  f s  r ",
      "  sss ss sss  ",
      "     r        ",
      "   d          ",
      "              ",
    ] },
    start: { x: 1, y: 12 },
    entities: [
      { type: "enemy", x: 3, y: 7, enemy: "brute" },
      { type: "enemy", x: 10, y: 9, enemy: "teacher" },
      { type: "stairs", x: 12, y: 1, targetFloor: 1, label: "塔" },
    ],
    floors: [
      null,
      {
        nameSuffix: "通信塔",
        start: { x: 12, y: 12 },
        terrain: [
          "##############",
          "#..........X.#",
          "#.##########.#",
          "#.#........#.#",
          "#.#.######.#.#",
          "#.#.#....#.#.#",
          "#.#.#.##.#.#.#",
          "#...#....#...#",
          "###.######.###",
          "#...#....#...#",
          "#.###.##.###.#",
          "#............#",
          "#............#",
          "##############",
        ],
        layers: { decor: [
          "              ", "        r     ", "  wwwwwwwwww  ", "  w      r w  ", "  w wwww w w  ", "  w w  p w w  ", "  w w ww w w  ", " r  w    w  r ", " www wwww www ", " r  w  f w  r ", "  www ww www  ", "     r        ", "          d   ", "              ",
        ] },
        entities: [
          { type: "enemy", x: 6, y: 5, enemy: "brute" },
          { type: "event", x: 11, y: 1, event: "final_signal" },
          { type: "stairs", x: 12, y: 12, targetFloor: 0, label: "地" },
        ],
      },
    ],
  },
};


export const HUB_AREA = {
  name: "学校前の町内",
  danger: 1,
  description: "拠点前の住宅街。細い路地と店先を抜けて探索先へ向かう。旗人間が迷い込むこともある。",
  terrain: [
    "##############",
    "#....##......#",
    "#.##....##...#",
    "#....#.......#",
    "###..#..##...#",
    "#....#.......#",
    "#..####..##..#",
    "#............#",
    "#..##..####..#",
    "#......#.....#",
    "#..##..#..##.#",
    "#......#.....#",
    "#...##....#..#",
    "##############",
  ],
  layers: {
    decor: [
      "              ",
      " h  s     k   ",
      " ww    rr     ",
      "   r h     c  ",
      "     r  ss    ",
      " h   r      k ",
      "   ww    rr   ",
      " r    f    r  ",
      "   ss   ww    ",
      " h    r       ",
      "   kk r  h    ",
      " r    r     c ",
      "  s    h  r   ",
      "              ",
    ],
  },
  start: { x: 6, y: 7 },
  entities: [
    { type: "area", x: 7, y: 7, areaId: "school", label: "校" },
    { type: "area", x: 10, y: 7, areaId: "market", label: "商" },
    { type: "area", x: 2, y: 11, areaId: "hospital", label: "病" },
    { type: "area", x: 11, y: 11, areaId: "park", label: "公" },
    { type: "area", x: 8, y: 7, areaId: "vacant", label: "空", requiresParts: REQUIRED_PARTS },
    { type: "enemy", x: 3, y: 5, enemy: "walker", hub: true },
    { type: "enemy", x: 10, y: 8, enemy: "runner", hub: true },
  ],
};

export const CHARACTERS = {
  hero: { id: "hero", name: "主人公", role: "指揮", maxHp: 34, attack: 8, infection: 0 },
  minato: { id: "minato", name: "ミナト", role: "前衛", maxHp: 38, attack: 10, infection: 0 },
  akari: { id: "akari", name: "アカリ", role: "応急手当", maxHp: 26, attack: 5, infection: 0 },
  shun: { id: "shun", name: "シュン", role: "探索", maxHp: 28, attack: 6, infection: 0 },
};

export const ENEMIES = {
  walker: { name: "旗歩き", hp: 18, attack: 6, infection: 4, icon: "旗" },
  runner: { name: "走る旗人間", hp: 16, attack: 8, infection: 6, icon: "走" },
  brute: { name: "大型旗人間", hp: 32, attack: 11, infection: 8, icon: "巨" },
  teacher: { name: "旗先生", hp: 24, attack: 9, infection: 7, icon: "先" },
};

export const LOOT_TABLES = {
  school: [{ food: 1 }, { medicine: 1 }, { parts: 1 }],
  food: [{ food: 2 }, { food: 3 }, { food: 1, medicine: 1 }],
  medicine: [{ medicine: 2 }, { medicine: 1 }, { medicine: 1, parts: 1 }],
  parts: [{ parts: 1 }, { parts: 1, food: 1 }],
  weapon: [{ morale: 6 }, { parts: 1, morale: 4 }],
};

export function createInitialAreaDanger() {
  return Object.fromEntries(Object.entries(AREAS).map(([areaId, area]) => [areaId, area.danger]));
}

export function createInitialAreaNotes() {
  return Object.fromEntries(Object.keys(AREAS).map((areaId) => [areaId, {
    visits: 0,
    items: 0,
    events: 0,
    enemies: 0,
    allies: 0,
    lastVisitedDay: null,
  }]));
}

export function createInitialState() {
  return {
    day: 1,
    timeIndex: 0,
    food: 5,
    medicine: 1,
    parts: 0,
    traces: 0,
    morale: 55,
    flagPressure: 18,
    gameOver: false,
    chapter: 1,
    completedChapters: new Set(),
    currentAreaId: null,
    tactic: "balanced",
    rationPolicy: "normal",
    watchLevel: 0,
    currentFloor: 0,
    stepsInPeriod: 0,
    hubReturnPoint: { ...HUB_AREA.start },
    areaDanger: createInitialAreaDanger(),
    areaNotes: createInitialAreaNotes(),
    player: { ...HUB_AREA.start },
    terrain: HUB_AREA.terrain.map((row) => row.split("")),
    layers: cloneAreaLayers(HUB_AREA),
    entities: HUB_AREA.entities.filter((entity) => !entity.requiresParts).map((entity) => ({ ...entity })),
    party: [
      { ...CHARACTERS.hero, hp: CHARACTERS.hero.maxHp },
      { ...CHARACTERS.minato, hp: CHARACTERS.minato.maxHp },
    ],
    rescued: new Set(["hero", "minato"]),
    completedEvents: new Set(),
    collectedItems: new Set(),
    logs: ["放課後、街に奇妙な旗が立ち始めた。学校を拠点に生き延びよう。"],
  };
}

export function pushLog(state, message) {
  state.logs.push(message);
  if (state.logs.length > MAX_LOGS) state.logs.shift();
}

export function getFlagPressureTier(state) {
  const pressure = clamp(toFiniteNumber(state.flagPressure, 0), 0, MAX_FLAG_PRESSURE);
  if (pressure >= 80) return { id: "critical", name: "包囲寸前", pressure, battleThreat: 3, escapePenalty: 0.18 };
  if (pressure >= 55) return { id: "danger", name: "接近中", pressure, battleThreat: 2, escapePenalty: 0.12 };
  if (pressure >= 30) return { id: "uneasy", name: "ざわめき", pressure, battleThreat: 1, escapePenalty: 0.06 };
  return { id: "calm", name: "静か", pressure, battleThreat: 0, escapePenalty: 0 };
}

export function increaseFlagPressure(state, amount) {
  const before = clamp(toFiniteNumber(state.flagPressure, 0), 0, MAX_FLAG_PRESSURE);
  const after = clamp(before + amount, 0, MAX_FLAG_PRESSURE);
  state.flagPressure = after;
  return { before, after, changed: before !== after, tier: getFlagPressureTier(state) };
}

export function reduceFlagPressure(state, amount) {
  return increaseFlagPressure(state, -amount);
}

export function cloneAreaState(area, rescued = new Set(), currentDanger = area.danger, completedEvents = new Set(), collectedItems = new Set(), floor = 0) {
  const template = getAreaFloorTemplate(area, floor);
  const terrain = template.terrain.map((row) => row.split(""));
  const layers = cloneAreaLayers(template);
  const areaId = getAreaId(area);
  const entities = template.entities
    .filter((entity) => entity.type !== "ally" || !rescued.has(entity.ally))
    .filter((entity) => entity.type !== "event" || !completedEvents.has(entity.event))
    .filter((entity) => entity.type !== "item" || !collectedItems.has(getEntityCollectionKey(areaId, entity)))
    .map((entity) => entity.type === "item"
      ? { ...entity, collectionKey: getEntityCollectionKey(areaId, entity) }
      : { ...entity });

  entities.push(...createDangerReinforcements(area, currentDanger, entities));

  return {
    terrain,
    layers,
    entities,
    player: { ...(template.start ?? area.start) },
  };
}

export function getAreaFloorTemplate(area, floor = 0) {
  const floorTemplate = area.floors?.[floor];
  if (!floorTemplate) return area;
  return { ...area, ...floorTemplate, entities: floorTemplate.entities ?? area.entities };
}

function cloneAreaLayers(area) {
  const width = area.terrain[0]?.length ?? 0;
  const height = area.terrain.length;
  const emptyLayer = Array.from({ length: height }, () => Array.from({ length: width }, () => " "));

  return {
    decor: area.layers?.decor
      ? area.layers.decor.map((row) => row.split(""))
      : emptyLayer,
  };
}

export function createDangerReinforcements(area, currentDanger, existingEntities = []) {
  const reinforcementCount = Math.max(0, currentDanger - area.danger);
  if (reinforcementCount === 0) return [];

  const occupied = new Set(existingEntities.map((entity) => `${entity.x},${entity.y}`));
  occupied.add(`${area.start.x},${area.start.y}`);

  return getReinforcementSpawnTiles(area, occupied)
    .slice(0, reinforcementCount)
    .map((tile, index) => ({
      type: "enemy",
      x: tile.x,
      y: tile.y,
      enemy: DANGER_REINFORCEMENT_ENEMY,
      reinforcement: true,
      id: `danger_${index}_${tile.x}_${tile.y}`,
    }));
}

function getAreaId(area) {
  return Object.entries(AREAS).find(([, candidate]) => candidate === area)?.[0] ?? "unknown";
}

export function getEntityCollectionKey(areaId, entity) {
  return `${areaId}:${entity.type}:${entity.x}:${entity.y}:${entity.loot ?? entity.event ?? entity.ally ?? entity.enemy ?? "entity"}`;
}

function getReinforcementSpawnTiles(area, occupied) {
  const tiles = [];
  area.terrain.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (tile !== ".") return;
      if (occupied.has(`${x},${y}`)) return;
      const distanceFromStart = Math.abs(x - area.start.x) + Math.abs(y - area.start.y);
      tiles.push({ x, y, distanceFromStart });
    });
  });

  return tiles.sort((a, b) => b.distanceFromStart - a.distanceFromStart || b.y - a.y || b.x - a.x);
}

export function isWallAt(terrain, x, y) {
  return !terrain[y] || terrain[y][x] === undefined || terrain[y][x] === "#";
}

export function getAreaDanger(state, areaId) {
  return state.areaDanger?.[areaId] ?? AREAS[areaId]?.danger ?? HUB_AREA.danger;
}

export function increaseAreaDanger(state, areaId, amount = AREA_DANGER_INCREASE) {
  const before = getAreaDanger(state, areaId);
  const after = Math.min(MAX_AREA_DANGER, before + amount);
  state.areaDanger[areaId] = after;
  return { before, after, changed: after !== before };
}

export function recoverAreaDanger(state, amount = AREA_DANGER_RECOVERY) {
  const changes = [];
  Object.entries(AREAS).forEach(([areaId, area]) => {
    const before = getAreaDanger(state, areaId);
    const after = Math.max(area.danger, before - amount);
    state.areaDanger[areaId] = after;
    if (after !== before) {
      changes.push({ areaId, before, after });
    }
  });
  return changes;
}

export function getFrontlineReduction(state) {
  const minato = state.party.find((member) => member.id === "minato");
  return minato && minato.hp > 0 ? FRONTLINE_DAMAGE_REDUCTION : 0;
}

export function reduceIncomingDamage(state, damage) {
  return Math.max(1, damage - getFrontlineReduction(state));
}

export function hasPartyMember(state, memberId) {
  return state.party.some((member) => member.id === memberId);
}

export function getRestEffects(state) {
  const hasFirstAid = hasPartyMember(state, "akari");
  return {
    hp: REST_HEAL_AMOUNT + (hasFirstAid ? FIRST_AID_HEAL_BONUS : 0),
    infection: REST_INFECTION_RECOVERY + (hasFirstAid ? FIRST_AID_INFECTION_BONUS : 0),
    hasFirstAid,
  };
}

export function getMedicineEffects(state) {
  const hasFirstAid = hasPartyMember(state, "akari");
  return {
    hp: MEDICINE_HEAL_AMOUNT + (hasFirstAid ? FIRST_AID_HEAL_BONUS : 0),
    infection: MEDICINE_INFECTION_RECOVERY + (hasFirstAid ? FIRST_AID_INFECTION_BONUS : 0),
    hasFirstAid,
  };
}

export function getRationPolicy(state) {
  return RATION_POLICIES[state.rationPolicy] ?? RATION_POLICIES.normal;
}

export function setRationPolicy(state, policyId) {
  if (!RATION_POLICIES[policyId]) {
    return { ok: false, reason: "missing_policy", policy: getRationPolicy(state) };
  }

  state.rationPolicy = policyId;
  return { ok: true, policy: getRationPolicy(state) };
}

export function getDailyFoodNeed(state) {
  return Math.max(1, state.party.length + getRationPolicy(state).foodModifier);
}

export function getTactic(state) {
  return TACTICS[state.tactic] ?? TACTICS.balanced;
}

export function setTactic(state, tacticId) {
  if (!TACTICS[tacticId]) {
    return { ok: false, reason: "missing_tactic", tactic: getTactic(state) };
  }

  state.tactic = tacticId;
  return { ok: true, tactic: getTactic(state) };
}

export function getBattleInfectionGain(state, baseInfection) {
  return Math.max(0, baseInfection + getTactic(state).infectionModifier);
}

export function getEscapeChance(state, areaId) {
  const pressure = getFlagPressureTier(state);
  return clamp(0.68 - getAreaDanger(state, areaId) * 0.04 - pressure.escapePenalty + getTactic(state).escapeModifier, 0.12, 0.9);
}

export function recordAreaVisit(state, areaId) {
  const notes = ensureAreaNotes(state, areaId);
  if (!notes) return null;

  notes.visits += 1;
  notes.lastVisitedDay = state.day;
  return notes;
}

export function recordAreaNote(state, areaId, noteType, amount = 1) {
  const notes = ensureAreaNotes(state, areaId);
  if (!notes || !["items", "events", "enemies", "allies"].includes(noteType)) return null;

  notes[noteType] += amount;
  return notes;
}

export function getAreaNoteSummary(state, areaId) {
  const area = AREAS[areaId];
  if (!area) return null;

  const notes = ensureAreaNotes(state, areaId);
  return {
    areaId,
    name: area.name,
    visits: notes.visits,
    items: notes.items,
    events: notes.events,
    enemies: notes.enemies,
    allies: notes.allies,
    lastVisitedDay: notes.lastVisitedDay,
  };
}

export function getAreaNoteSummaries(state) {
  return Object.keys(AREAS).map((areaId) => getAreaNoteSummary(state, areaId));
}

function ensureAreaNotes(state, areaId) {
  if (!AREAS[areaId]) return null;
  state.areaNotes ??= createInitialAreaNotes();
  state.areaNotes[areaId] ??= { visits: 0, items: 0, events: 0, enemies: 0, allies: 0, lastVisitedDay: null };
  return state.areaNotes[areaId];
}

export function getAreaExplorationSummary(state, areaId) {
  const area = AREAS[areaId];
  if (!area) return null;

  const remainingEntities = area.entities.filter((entity) => {
    if (entity.type === "ally") return !state.rescued.has(entity.ally);
    if (entity.type === "event") return !state.completedEvents.has(entity.event);
    if (entity.type === "item") return !state.collectedItems.has(getEntityCollectionKey(areaId, entity));
    return true;
  });
  const currentDanger = getAreaDanger(state, areaId);

  return {
    areaId,
    name: area.name,
    baseDanger: area.danger,
    currentDanger,
    timeCost: area.timeCost,
    itemCount: remainingEntities.filter((entity) => entity.type === "item").length,
    eventCount: remainingEntities.filter((entity) => entity.type === "event").length,
    allyCount: remainingEntities.filter((entity) => entity.type === "ally").length,
    enemyCount: remainingEntities.filter((entity) => entity.type === "enemy").length,
    reinforcementCount: Math.max(0, currentDanger - area.danger),
  };
}

export function getRecommendedArea(state) {
  return Object.keys(AREAS)
    .map((areaId) => getAreaExplorationSummary(state, areaId))
    .sort((a, b) => areaRecommendationScore(b) - areaRecommendationScore(a) || a.currentDanger - b.currentDanger || a.name.localeCompare(b.name, "ja"))[0];
}

function areaRecommendationScore(summary) {
  return summary.allyCount * 8
    + summary.eventCount * 5
    + summary.itemCount * 2
    - summary.currentDanger * 3
    - summary.reinforcementCount * 2;
}

export function getChapterProgress(state) {
  const chapter = CHAPTERS[state.chapter] ?? CHAPTERS[1];
  const requirements = [
    {
      id: "visit_school",
      title: "校内を探索する",
      complete: (state.areaNotes?.school?.visits ?? 0) > 0,
    },
    {
      id: "rescue_akari",
      title: "アカリを救出する",
      complete: state.rescued.has("akari"),
    },
    {
      id: "check_locker",
      title: "ロッカーの異変を確認する",
      complete: state.completedEvents.has("locker"),
    },
    {
      id: "secure_broadcast",
      title: "放送室から退路を確保する",
      complete: state.completedEvents.has("broadcast"),
    },
    {
      id: "secure_part",
      title: "通信機修理用の部品を1個以上確保する",
      complete: state.parts >= 1,
    },
  ];

  const complete = requirements.every((requirement) => requirement.complete);
  return {
    chapterId: chapter.id,
    title: chapter.title,
    description: chapter.description,
    requirements,
    complete,
    alreadyCompleted: state.completedChapters.has(chapter.id),
  };
}

export function canCompleteChapter(state) {
  const progress = getChapterProgress(state);
  return progress.complete && !progress.alreadyCompleted;
}

export function completeChapter(state) {
  const progress = getChapterProgress(state);
  if (progress.alreadyCompleted) return { ok: false, reason: "already_completed", progress };
  if (!progress.complete) return { ok: false, reason: "requirements_missing", progress };

  const chapter = CHAPTERS[progress.chapterId];
  state.completedChapters.add(progress.chapterId);
  state.morale = Math.min(100, state.morale + chapter.reward.morale);
  state.food += chapter.reward.food;
  return { ok: true, progress, reward: { ...chapter.reward } };
}

export function getObjectives(state) {
  const rescuedCount = Object.keys(CHARACTERS).filter((memberId) => state.rescued.has(memberId)).length;
  const safeAreaCount = Object.keys(AREAS).filter((areaId) => getAreaDanger(state, areaId) < RAID_DANGER_THRESHOLD).length;
  const totalAreaCount = Object.keys(AREAS).length;

  return [
    {
      id: "repair_signal",
      title: "空き地への道を開く",
      description: "部品を集めて町内に空き地入口を出し、通信塔跡へ入れる状態にする。",
      current: Math.min(state.parts, REQUIRED_PARTS),
      target: REQUIRED_PARTS,
      unit: "個",
      complete: state.parts >= REQUIRED_PARTS,
    },
    {
      id: "find_truth",
      title: "事件の痕跡を集める",
      description: "救助後も真相を追えるように、街に残された手がかりを集める。",
      current: Math.min(state.traces, REQUIRED_TRACES_FOR_TRUTH),
      target: REQUIRED_TRACES_FOR_TRUTH,
      unit: "個",
      complete: state.traces >= REQUIRED_TRACES_FOR_TRUTH,
    },
    {
      id: "rescue_allies",
      title: "仲間を救出する",
      description: "校内と病院に残された仲間を見つけ、拠点に連れ帰る。",
      current: rescuedCount,
      target: Object.keys(CHARACTERS).length,
      unit: "人",
      complete: rescuedCount >= Object.keys(CHARACTERS).length,
    },
    {
      id: "control_pressure",
      title: "旗人間の包囲を抑える",
      description: "休息・イベント選択・読み合い戦闘で旗人間の接近を抑え、危険な探索判断を避ける。",
      current: Math.max(0, MAX_FLAG_PRESSURE - clamp(toFiniteNumber(state.flagPressure, 0), 0, MAX_FLAG_PRESSURE)),
      target: MAX_FLAG_PRESSURE,
      unit: "圧",
      complete: clamp(toFiniteNumber(state.flagPressure, 0), 0, MAX_FLAG_PRESSURE) < 55,
    },
    {
      id: "control_danger",
      title: "夜襲を抑える",
      description: "危険度が高い探索先を放置せず、休息と探索判断で拠点への夜襲を防ぐ。",
      current: safeAreaCount,
      target: totalAreaCount,
      unit: "箇所",
      complete: safeAreaCount >= totalAreaCount,
    },
  ];
}

export function buildBarricade(state, areaId) {
  if (state.parts < BARRICADE_PART_COST) {
    return { ok: false, reason: "no_parts" };
  }

  if (!AREAS[areaId]) {
    return { ok: false, reason: "missing_area" };
  }

  const before = getAreaDanger(state, areaId);
  const baseDanger = AREAS[areaId].danger;
  if (before <= baseDanger) {
    return { ok: false, reason: "no_effect", before, after: before };
  }

  const after = Math.max(baseDanger, before - BARRICADE_DANGER_REDUCTION);
  state.parts -= BARRICADE_PART_COST;
  state.areaDanger[areaId] = after;
  state.morale = Math.min(100, state.morale + 3);

  return { ok: true, areaId, before, after, cost: BARRICADE_PART_COST };
}

export function applyGuardDuty(state) {
  const before = state.watchLevel ?? 0;
  if (before >= WATCH_MAX_LEVEL) {
    return { ok: false, reason: "max_watch", before, after: before };
  }

  const after = Math.min(WATCH_MAX_LEVEL, before + 1);
  state.watchLevel = after;
  state.morale = Math.min(100, state.morale + 2);
  const pressure = reduceFlagPressure(state, FLAG_PRESSURE_GUARD_RECOVERY);
  return { ok: true, before, after, moraleGain: 2, pressure };
}

export function getWatchRaidReduction(state) {
  const watchLevel = Math.max(0, state.watchLevel ?? 0);
  return {
    watchLevel,
    damageReduction: watchLevel * WATCH_DAMAGE_REDUCTION,
    moraleReduction: watchLevel * WATCH_MORALE_REDUCTION,
  };
}

export function applyNightRaid(state) {
  const raidAreas = Object.entries(AREAS)
    .filter(([areaId]) => getAreaDanger(state, areaId) >= RAID_DANGER_THRESHOLD)
    .map(([areaId, area]) => ({ areaId, name: area.name, danger: getAreaDanger(state, areaId) }));

  if (raidAreas.length === 0) {
    return null;
  }

  const watch = getWatchRaidReduction(state);
  const rawDamage = Math.max(1, RAID_DAMAGE * raidAreas.length - watch.damageReduction);
  const totalDamage = reduceIncomingDamage(state, rawDamage);
  state.party.forEach((member) => {
    member.hp = Math.max(1, member.hp - totalDamage);
  });
  const moraleLoss = Math.max(0, RAID_MORALE_LOSS * raidAreas.length - watch.moraleReduction);
  state.morale = Math.max(0, state.morale - moraleLoss);
  state.watchLevel = 0;

  return {
    raidAreas,
    watchLevel: watch.watchLevel,
    totalDamage,
    moraleLoss,
    message: `危険度の高い${raidAreas.map((area) => area.name).join("・")}から旗人間が拠点近くまで押し寄せた。見張り${watch.watchLevel > 0 ? `Lv${watch.watchLevel}で軽減。` : "なし。"}全員HP -${totalDamage} / 士気 -${moraleLoss}。`,
  };
}

export function applyEndDay(state) {
  const messages = [];
  const policy = getRationPolicy(state);
  const requiredFood = getDailyFoodNeed(state);
  state.day += 1;
  const pressure = increaseFlagPressure(state, FLAG_PRESSURE_NIGHT_GAIN);
  state.food -= requiredFood;
  if (pressure.changed) messages.push(`夜の間に旗人間の気配が濃くなった。旗圧 ${pressure.before} → ${pressure.after}。`);
  messages.push(`夜が明けた。${policy.name}配給で食料を${requiredFood}消費した。`);

  if (policy.moraleChange !== 0 && state.food >= 0) {
    state.morale = clamp(state.morale + policy.moraleChange, 0, 100);
    messages.push(`配給方針の影響で士気 ${policy.moraleChange > 0 ? "+" : ""}${policy.moraleChange}。`);
  }

  if (state.food < 0) {
    const shortage = Math.abs(state.food);
    state.food = 0;
    state.morale = Math.max(0, state.morale - shortage * 8);
    state.party.forEach((member) => {
      member.hp = Math.max(1, member.hp - shortage * 5);
    });
    messages.push("食料が足りない。全員のHPと士気が下がった。");
  }

  const raid = applyNightRaid(state);
  if (raid) {
    messages.push(raid.message);
  }

  const infectedMember = state.party.find((member) => member.infection >= 100);
  if (infectedMember) {
    return { messages, gameOverMessage: `${infectedMember.name}の旗汚染が限界に達した。` };
  }

  if (state.day > MAX_DAY) {
    return { messages, gameOverMessage: "7日目までに救助信号を送れなかった。校舎は旗人間に包囲された。" };
  }

  return { messages, gameOverMessage: null };
}

export function applyRest(state) {
  const effects = getRestEffects(state);
  state.party.forEach((member) => {
    member.hp = Math.min(member.maxHp, member.hp + effects.hp);
    member.infection = Math.max(0, member.infection - effects.infection);
  });
  state.morale = Math.min(100, state.morale + 5);
  reduceFlagPressure(state, FLAG_PRESSURE_REST_RECOVERY);
  return recoverAreaDanger(state);
}

export function getScavengeBonus(state, loot) {
  if (!hasPartyMember(state, "shun")) return {};

  if (loot === "food") return { food: SCAVENGE_BONUS };
  if (loot === "medicine") return { medicine: SCAVENGE_BONUS };
  if (loot === "parts") return { parts: SCAVENGE_BONUS };
  if (loot === "weapon") return { morale: SCAVENGE_BONUS };
  return {};
}

function addResourceBundle(state, bundle) {
  Object.entries(bundle).forEach(([key, value]) => {
    state[key] += value;
  });
}

export function mergeResourceBundles(...bundles) {
  return bundles.reduce((merged, bundle) => {
    Object.entries(bundle).forEach(([key, value]) => {
      merged[key] = (merged[key] ?? 0) + value;
    });
    return merged;
  }, {});
}

export function applyLoot(state, loot, pickIndex = randomIndex) {
  const table = LOOT_TABLES[loot] ?? LOOT_TABLES.school;
  const base = table[pickIndex(table.length)];
  const bonus = getScavengeBonus(state, loot);
  const result = mergeResourceBundles(base, bonus);
  addResourceBundle(state, result);
  return result;
}

export function applyMedicineToMember(state, memberId) {
  if (state.medicine <= 0) {
    return { ok: false, reason: "no_medicine" };
  }

  const member = state.party.find((partyMember) => partyMember.id === memberId);
  if (!member) {
    return { ok: false, reason: "missing_member" };
  }

  const before = { hp: member.hp, infection: member.infection };
  if (before.hp >= member.maxHp && before.infection <= 0) {
    return { ok: false, reason: "no_effect", member };
  }

  const effects = getMedicineEffects(state);
  state.medicine -= 1;
  member.hp = Math.min(member.maxHp, member.hp + effects.hp);
  member.infection = Math.max(0, member.infection - effects.infection);

  return {
    ok: true,
    member,
    before,
    after: { hp: member.hp, infection: member.infection },
  };
}

export function rescueAllyInState(state, allyId) {
  if (state.rescued.has(allyId)) return null;
  const ally = { ...CHARACTERS[allyId], hp: CHARACTERS[allyId].maxHp };
  state.party.push(ally);
  state.rescued.add(allyId);
  state.morale = Math.min(100, state.morale + 10);
  return ally;
}

export function calculateBattlePreview(state, areaId, enemyId) {
  const enemy = ENEMIES[enemyId];
  const danger = getAreaDanger(state, areaId);
  const pressure = getFlagPressureTier(state);
  const tactic = getTactic(state);
  const basePartyAttack = state.party.reduce((sum, member) => sum + Math.max(1, member.attack - Math.floor(member.infection / 35)), 0);
  const partyAttack = Math.max(state.party.length, basePartyAttack + tactic.attackModifier);
  const rawEnemyDamage = Math.max(1, enemy.attack + danger + pressure.battleThreat - Math.floor(state.morale / 35));
  const enemyDamage = reduceIncomingDamage(state, rawEnemyDamage);
  const totalEnemyDamage = Math.max(1, Math.ceil(enemyDamage * tactic.damageMultiplier * (enemy.hp > partyAttack ? 1.4 : 1)));
  return {
    enemy,
    tactic,
    partyAttack,
    enemyDamage,
    totalEnemyDamage,
    infectionGain: getBattleInfectionGain(state, enemy.infection),
    escapeChance: getEscapeChance(state, areaId),
    pressure,
    canDefeatSafely: partyAttack >= enemy.hp,
  };
}

export function applyPartyDamage(state, totalDamage) {
  state.party.forEach((member) => {
    member.hp = Math.max(0, member.hp - Math.ceil(totalDamage / state.party.length));
  });
}

export function infectPartyMembers(state, amount) {
  state.party.forEach((member) => {
    member.infection = Math.min(100, member.infection + amount);
  });
}

export function getHeroFailureMessage(state) {
  const hero = state.party.find((member) => member.id === "hero");
  if (!hero || hero.hp <= 0) return "主人公が倒れた。拠点へ戻る者はいなかった。";
  if (hero.infection >= 100) return "主人公の旗汚染が限界に達した。意識が旗に塗りつぶされる。";
  return null;
}

export function completeEvent(state, eventId) {
  state.completedEvents.add(eventId);
  return state.completedEvents;
}

export function collectItem(state, areaId, entity) {
  state.collectedItems.add(entity.collectionKey ?? getEntityCollectionKey(areaId, entity));
  return state.collectedItems;
}

export function addTrace(state, amount = 1) {
  state.traces += amount;
  return state.traces;
}

export function getEnding(state) {
  if (state.traces >= REQUIRED_TRACES_FOR_TRUTH) {
    return {
      id: "truth_route",
      title: "救助信号：調査継続",
      message: "通信塔跡から救助信号を送った。救助の光が見えたが、集めた痕跡はこの街だけの事件ではないことを示している。君たちは脱出後、真相を追う準備を始めた。",
    };
  }

  return {
    id: "escape",
    title: "救助信号",
    message: "通信塔跡から救助信号を送った。夜明け前、遠くにヘリの光が見えた。ひとまず君たちは生き延びた。",
  };
}

export function serializeGameState(state) {
  return JSON.stringify({
    version: SAVE_VERSION,
    state: {
      day: state.day,
      timeIndex: state.timeIndex,
      food: state.food,
      medicine: state.medicine,
      parts: state.parts,
      traces: state.traces,
      morale: state.morale,
      flagPressure: clamp(toFiniteNumber(state.flagPressure, 0), 0, MAX_FLAG_PRESSURE),
      gameOver: state.gameOver,
      chapter: state.chapter,
      completedChapters: [...state.completedChapters],
      currentAreaId: state.currentAreaId,
      currentFloor: state.currentFloor ?? 0,
      stepsInPeriod: state.stepsInPeriod ?? 0,
      hubReturnPoint: { ...(state.hubReturnPoint ?? HUB_AREA.start) },
      tactic: getTactic(state).id,
      rationPolicy: getRationPolicy(state).id,
      watchLevel: state.watchLevel ?? 0,
      areaDanger: { ...state.areaDanger },
      areaNotes: cloneAreaNotes(state.areaNotes),
      player: { ...state.player },
      terrain: state.terrain.map((row) => [...row]),
      layers: cloneLayers(state.layers),
      entities: state.entities.map((entity) => ({ ...entity })),
      party: state.party.map((member) => ({ ...member })),
      rescued: [...state.rescued],
      completedEvents: [...state.completedEvents],
      collectedItems: [...state.collectedItems],
      logs: [...state.logs],
    },
  });
}

export function deserializeGameState(serialized) {
  const payload = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
  const data = payload?.state ?? payload;
  if (!data || typeof data !== "object") {
    throw new Error("Invalid save data");
  }

  const base = createInitialState();
  const party = restoreParty(data.party, base.party);
  return {
    ...base,
    day: toFiniteNumber(data.day, base.day),
    timeIndex: clamp(toFiniteNumber(data.timeIndex, base.timeIndex), 0, TIMES.length - 1),
    food: toFiniteNumber(data.food, base.food),
    medicine: toFiniteNumber(data.medicine, base.medicine),
    parts: toFiniteNumber(data.parts, base.parts),
    traces: toFiniteNumber(data.traces, base.traces),
    morale: clamp(toFiniteNumber(data.morale, base.morale), 0, 100),
    flagPressure: clamp(toFiniteNumber(data.flagPressure, base.flagPressure), 0, MAX_FLAG_PRESSURE),
    gameOver: Boolean(data.gameOver),
    chapter: CHAPTERS[data.chapter] ? data.chapter : base.chapter,
    completedChapters: new Set(toArray(data.completedChapters).filter((chapterId) => CHAPTERS[chapterId])),
    currentAreaId: AREAS[data.currentAreaId] ? data.currentAreaId : null,
    currentFloor: clamp(toFiniteNumber(data.currentFloor, base.currentFloor), 0, 4),
    stepsInPeriod: clamp(toFiniteNumber(data.stepsInPeriod, base.stepsInPeriod), 0, 99),
    hubReturnPoint: restorePoint(data.hubReturnPoint, base.hubReturnPoint),
    tactic: TACTICS[data.tactic] ? data.tactic : base.tactic,
    rationPolicy: RATION_POLICIES[data.rationPolicy] ? data.rationPolicy : base.rationPolicy,
    watchLevel: clamp(toFiniteNumber(data.watchLevel, base.watchLevel), 0, WATCH_MAX_LEVEL),
    areaDanger: restoreAreaDanger(data.areaDanger),
    areaNotes: restoreAreaNotes(data.areaNotes),
    player: restorePoint(data.player, base.player),
    terrain: restoreTerrain(data.terrain),
    layers: restoreLayers(data.layers),
    entities: restoreEntities(data.entities),
    party,
    rescued: restoreRescued(data.rescued, party),
    completedEvents: new Set(toArray(data.completedEvents)),
    collectedItems: new Set(toArray(data.collectedItems)),
    logs: restoreLogs(data.logs, base.logs),
  };
}

function restoreAreaDanger(areaDanger = {}) {
  const restored = createInitialAreaDanger();
  Object.keys(restored).forEach((areaId) => {
    restored[areaId] = clamp(toFiniteNumber(areaDanger[areaId], restored[areaId]), AREAS[areaId].danger, MAX_AREA_DANGER);
  });
  return restored;
}

function cloneAreaNotes(areaNotes = createInitialAreaNotes()) {
  return Object.fromEntries(Object.keys(AREAS).map((areaId) => [areaId, {
    visits: toFiniteNumber(areaNotes[areaId]?.visits, 0),
    items: toFiniteNumber(areaNotes[areaId]?.items, 0),
    events: toFiniteNumber(areaNotes[areaId]?.events, 0),
    enemies: toFiniteNumber(areaNotes[areaId]?.enemies, 0),
    allies: toFiniteNumber(areaNotes[areaId]?.allies, 0),
    lastVisitedDay: areaNotes[areaId]?.lastVisitedDay ?? null,
  }]));
}

function restoreAreaNotes(areaNotes = {}) {
  return cloneAreaNotes(areaNotes);
}

function restorePoint(point, fallback) {
  return {
    x: toFiniteNumber(point?.x, fallback.x),
    y: toFiniteNumber(point?.y, fallback.y),
  };
}

function restoreTerrain(terrain) {
  if (!Array.isArray(terrain)) return [];
  return terrain.map((row) => Array.isArray(row) ? [...row] : [...String(row)]);
}

function cloneLayers(layers = {}) {
  return {
    decor: Array.isArray(layers.decor) ? layers.decor.map((row) => [...row]) : [],
  };
}

function restoreLayers(layers = {}) {
  return cloneLayers(layers);
}

function restoreEntities(entities) {
  if (!Array.isArray(entities)) return [];
  return entities.map((entity) => ({ ...entity }));
}

function restoreParty(party, fallbackParty) {
  if (!Array.isArray(party) || party.length === 0) return fallbackParty.map((member) => ({ ...member }));

  const restoredParty = party
    .filter((member) => CHARACTERS[member?.id])
    .map((member) => {
      const template = CHARACTERS[member.id];
      return {
        ...template,
        hp: clamp(toFiniteNumber(member.hp, template.maxHp), 0, template.maxHp),
        infection: clamp(toFiniteNumber(member.infection, template.infection), 0, 100),
      };
    });

  return restoredParty.length > 0 ? restoredParty : fallbackParty.map((member) => ({ ...member }));
}

function restoreRescued(rescued, party) {
  const restored = new Set(toArray(rescued).filter((memberId) => CHARACTERS[memberId]));
  party.forEach((member) => restored.add(member.id));
  return restored;
}

function restoreLogs(logs, fallbackLogs) {
  const restoredLogs = toArray(logs).filter((log) => typeof log === "string").slice(-MAX_LOGS);
  return restoredLogs.length > 0 ? restoredLogs : [...fallbackLogs];
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value];
  return [];
}

function toFiniteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function canSendSignal(state) {
  return !state.currentAreaId && !state.gameOver && state.parts >= REQUIRED_PARTS;
}

function randomIndex(length) {
  return Math.floor(Math.random() * length);
}
