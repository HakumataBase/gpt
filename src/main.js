import {
  AREAS,
  HUB_AREA,
  REQUIRED_TRACES_FOR_TRUTH,
  ENEMIES,
  MAX_DAY,
  REQUIRED_PARTS,
  RATION_POLICIES,
  TIMES,
  TACTICS,
  addTrace,
  applyEndDay,
  applyGuardDuty,
  applyLoot,
  getAreaDanger,
  getFlagPressureTier,
  increaseAreaDanger,
  increaseFlagPressure,
  applyMedicineToMember,
  applyPartyDamage,
  applyRest,
  buildBarricade,
  calculateBattlePreview,
  canCompleteChapter,
  canSendSignal,
  cloneAreaState,
  collectItem,
  completeChapter,
  completeEvent,
  createInitialState,
  getChapterProgress,
  getEnding,
  getHeroFailureMessage,
  getAreaExplorationSummary,
  getAreaNoteSummaries,
  getMedicineEffects,
  getObjectives,
  getRationPolicy,
  getRecommendedArea,
  getTactic,
  hasPartyMember,
  infectPartyMembers,
  isWallAt,
  pushLog,
  recordAreaNote,
  recordAreaVisit,
  rescueAllyInState,
  reduceFlagPressure,
  setRationPolicy,
  setTactic,
  deserializeGameState,
  serializeGameState,
} from "./game-core.js";

const SAVE_STORAGE_KEY = "after-school-flag-panic.save.v1";

const CHARACTER_BADGES = {
  hero: "主",
  minato: "湊",
  akari: "明",
  shun: "駿",
};

const DECOR_LABELS = {
  b: "机",
  c: "箱",
  d: "扉",
  f: "旗",
  g: "草",
  k: "店",
  l: "棚",
  m: "薬",
  p: "器",
  r: "道",
  s: "物",
  t: "木",
  w: "窓",
};

const DEBUG_ENABLED = new URLSearchParams(window.location.search).has("debug");
const VIEWPORT_SIZE = 5;
const BLOCKING_DECOR = new Set(["b", "c", "k", "l", "m", "p", "s", "w"]);
const AREA_RETURN_POINTS = {
  school: { x: 7, y: 7 },
  market: { x: 10, y: 7 },
  hospital: { x: 2, y: 11 },
  park: { x: 11, y: 11 },
  vacant: { x: 8, y: 7 },
};
const STEPS_PER_TIME_SEGMENT = 14;

const state = createInitialState();

const ui = {
  day: document.querySelector("#day-status"),
  time: document.querySelector("#time-status"),
  food: document.querySelector("#food-status"),
  medicine: document.querySelector("#medicine-status"),
  parts: document.querySelector("#parts-status"),
  traces: document.querySelector("#traces-status"),
  morale: document.querySelector("#morale-status"),
  watch: document.querySelector("#watch-status"),
  tactic: document.querySelector("#tactic-status"),
  ration: document.querySelector("#ration-status"),
  chapter: document.querySelector("#chapter-status"),
  party: document.querySelector("#party-list"),
  objectives: document.querySelector("#objective-list"),
  mapPanel: document.querySelector(".map-panel"),
  map: document.querySelector("#map-grid"),
  areaName: document.querySelector("#area-name"),
  areaDescription: document.querySelector("#area-description"),
  areaNotes: document.querySelector("#area-note-list"),
  log: document.querySelector("#log-list"),
  liveMessage: document.querySelector("#live-message"),
  returnButton: document.querySelector("#return-button"),
  restButton: document.querySelector("#rest-button"),
  rationButton: document.querySelector("#ration-button"),
  medicineButton: document.querySelector("#medicine-button"),
  restartButton: document.querySelector("#restart-button"),
  saveButton: document.querySelector("#save-button"),
  loadButton: document.querySelector("#load-button"),
  debugPanel: document.querySelector("#debug-panel"),
  debugCompleteChapter: document.querySelector("#debug-complete-chapter"),
  debugFullResources: document.querySelector("#debug-full-resources"),
  debugWin: document.querySelector("#debug-win"),
  modal: document.querySelector("#modal"),
  modalTitle: document.querySelector("#modal-title"),
  modalBody: document.querySelector("#modal-body"),
  modalActions: document.querySelector("#modal-actions"),
};

function addLog(message) {
  pushLog(state, message);
  showLiveMessage(message);
}

function showLiveMessage(message) {
  ui.liveMessage.textContent = message;
  ui.liveMessage.style.animation = "none";
  void ui.liveMessage.offsetWidth;
  ui.liveMessage.style.animation = "";
}

function pressureLog(prefix, result) {
  if (!result.changed) return;
  addLog(`${prefix} 旗圧 ${result.before} → ${result.after}（${result.tier.name}）。`);
}

function resetBaseMap() {
  const hubState = cloneAreaState(HUB_AREA);
  state.player = { ...(state.hubReturnPoint ?? HUB_AREA.start) };
  state.terrain = hubState.terrain;
  state.layers = hubState.layers;
  state.entities = hubState.entities.filter((entity) => !entity.requiresParts || state.parts >= entity.requiresParts);
}

function enterArea(areaId) {
  if (state.gameOver) return;
  const area = AREAS[areaId];
  if (areaId === "vacant" && state.parts < REQUIRED_PARTS) {
    addLog(`空き地はまだ瓦礫で塞がっている。通信機の部品があと${REQUIRED_PARTS - state.parts}個必要だ。`);
    render();
    return;
  }
  state.currentAreaId = areaId;
  state.currentFloor = 0;
  state.stepsInPeriod = 0;
  const areaState = cloneAreaState(area, state.rescued, getAreaDanger(state, areaId), state.completedEvents, state.collectedItems, state.currentFloor);
  state.terrain = areaState.terrain;
  state.layers = areaState.layers;
  state.entities = areaState.entities;
  state.player = areaState.player;
  recordAreaVisit(state, areaId);
  addLog(`${area.name}へ向かった。${area.description}`);
  const reinforcementCount = areaState.entities.filter((entity) => entity.reinforcement).length;
  if (reinforcementCount > 0) {
    addLog(`危険度の上昇で、${reinforcementCount}体の旗人間が周囲に集まっている。`);
  }
  render();
}

function returnToBase() {
  if (!state.currentAreaId) return;
  closeModal();
  const area = AREAS[state.currentAreaId];
  const returnPoint = AREA_RETURN_POINTS[state.currentAreaId] ?? HUB_AREA.start;
  const dangerChange = increaseAreaDanger(state, state.currentAreaId);
  state.hubReturnPoint = { ...returnPoint };
  state.currentAreaId = null;
  state.currentFloor = 0;
  state.stepsInPeriod = 0;
  resetBaseMap();
  advanceTime(area.timeCost);
  pressureLog("探索で足跡を残した。", increaseFlagPressure(state, area.timeCost * 4));
  addLog(`拠点へ帰還した。${area.timeCost}区切り分の時間が経過した。`);
  if (dangerChange.changed) {
    addLog(`${area.name}の危険度が${dangerChange.after}に上がった。連続探索は危険だ。`);
  }
  render();
}

function advanceTime(cost = 1) {
  for (let i = 0; i < cost; i += 1) {
    state.timeIndex += 1;
    if (state.timeIndex >= TIMES.length) {
      state.timeIndex = 0;
      endDay();
    }
  }
}

function endDay() {
  const result = applyEndDay(state);
  result.messages.forEach(addLog);
  if (result.gameOverMessage && !state.gameOver) {
    triggerGameOver(result.gameOverMessage);
  }
}

function guardDuty() {
  if (state.gameOver || state.currentAreaId) return;
  const result = applyGuardDuty(state);
  if (!result.ok) {
    addLog("見張り体制はすでに最大だ。次の夜襲に備えよう。");
    render();
    return;
  }

  addLog(`見張り当番を組んだ。警戒 Lv${result.before} → Lv${result.after} / 士気 +${result.moraleGain}。`);
  if (result.pressure?.changed) addLog(`見張りが接近ルートを潰した。旗圧 ${result.pressure.before} → ${result.pressure.after}。`);
  advanceTime(1);
  render();
}

function rest() {
  if (state.gameOver || state.currentAreaId) return;
  const dangerChanges = applyRest(state);
  addLog("拠点で休んだ。HPが回復し、旗汚染と旗圧が少し下がった。");
  if (hasPartyMember(state, "akari")) {
    addLog("アカリの応急手当で、休息の回復効果が高まった。");
  }
  if (dangerChanges.length > 0) {
    addLog("周辺の騒ぎが少し収まり、探索先の危険度が下がった。");
  }
  advanceTime(1);
  render();
}

function movePlayer(dx, dy) {
  if (!state.terrain.length || state.gameOver || !ui.modal.classList.contains("hidden")) return;
  const next = { x: state.player.x + dx, y: state.player.y + dy };
  if (isWall(next.x, next.y)) {
    addLog("そこは通れない。別の道を探そう。");
    render();
    return;
  }
  state.player = next;
  countExplorationStep();
  resolveTile();
  if (!ui.modal.classList.contains("hidden") || state.gameOver) {
    render();
    return;
  }
  moveEnemies();
  checkEnemyContact();
  render();
}

function isWall(x, y) {
  if (isWallAt(state.terrain, x, y)) return true;
  const blockingEntity = state.entities.some((entity) => entity.x === x && entity.y === y && ["area", "stairs", "item", "event", "ally", "enemy"].includes(entity.type));
  const decor = state.layers?.decor?.[y]?.[x] ?? " ";
  return !blockingEntity && BLOCKING_DECOR.has(decor);
}

function countExplorationStep() {
  state.stepsInPeriod = (state.stepsInPeriod ?? 0) + 1;
  if (state.stepsInPeriod < STEPS_PER_TIME_SEGMENT) return;
  state.stepsInPeriod = 0;
  advanceTime(1);
  pressureLog("長く歩き回った足音が響いた。", increaseFlagPressure(state, 3));
  addLog("移動に時間を使った。日付と食料切れに注意しよう。");
}

function resolveTile() {
  const terrain = state.terrain[state.player.y][state.player.x];
  if (terrain === "X" && state.currentAreaId) {
    showChoice("出口", "拠点へ帰還しますか？", [
      { label: "帰還する", primary: true, action: returnToBase },
      { label: "探索を続ける", action: closeModal },
    ]);
    return;
  }

  const entityIndex = state.entities.findIndex((entity) => entity.x === state.player.x && entity.y === state.player.y);
  if (entityIndex === -1) return;
  const entity = state.entities[entityIndex];

  if (entity.type === "area") {
    const area = AREAS[entity.areaId];
    const locked = entity.requiresParts && state.parts < entity.requiresParts;
    showChoice(`${area.name}へ向かう`, locked ? `瓦礫と旗で塞がっている。部品を${entity.requiresParts}個集めると空き地から通信塔跡へ入れます。` : `${area.description} この探索先へ移動しますか？`, [
      locked
        ? { label: "閉じる", primary: true, action: closeModal }
        : { label: "向かう", primary: true, action: () => { closeModal(); enterArea(entity.areaId); } },
      ...(locked ? [] : [{ label: "町内に残る", action: closeModal }]),
    ]);
  } else if (entity.type === "stairs") {
    switchFloor(entity.targetFloor);
  } else if (entity.type === "item") {
    state.entities.splice(entityIndex, 1);
    collectItem(state, state.currentAreaId, entity);
    recordAreaNote(state, state.currentAreaId, "items");
    gainLoot(entity.loot);
  } else if (entity.type === "event") {
    if (entity.event !== "final_signal") {
      state.entities.splice(entityIndex, 1);
      completeEvent(state, entity.event);
      recordAreaNote(state, state.currentAreaId, "events");
    }
    runEvent(entity.event, entityIndex);
  } else if (entity.type === "ally") {
    state.entities.splice(entityIndex, 1);
    recordAreaNote(state, state.currentAreaId, "allies");
    rescueAlly(entity.ally);
  } else if (entity.type === "enemy") {
    startBattle(entity, entityIndex);
  }
}

function switchFloor(targetFloor) {
  if (!state.currentAreaId) return;
  const area = AREAS[state.currentAreaId];
  const areaState = cloneAreaState(area, state.rescued, getAreaDanger(state, state.currentAreaId), state.completedEvents, state.collectedItems, targetFloor);
  state.currentFloor = targetFloor;
  state.terrain = areaState.terrain;
  state.layers = areaState.layers;
  state.entities = areaState.entities;
  state.player = areaState.player;
  addLog(`${area.name}の${targetFloor + 1}層目へ移動した。階段で戻ることもできる。`);
  render();
}

function gainLoot(loot) {
  const result = applyLoot(state, loot);
  addLog(`物資を見つけた。${formatGain(result)}。`);
}

function runEvent(eventId, entityIndex = -1) {
  const events = {
    final_signal: {
      title: "通信塔の制御盤",
      body: "集めた部品がはまり、空き地の古い通信塔が一瞬だけ息を吹き返す。ここで第一章を終えますか？",
      choices: [
        { label: "救助信号を送る", primary: true, action: () => { if (entityIndex >= 0) state.entities.splice(entityIndex, 1); completeEvent(state, "final_signal"); recordAreaNote(state, state.currentAreaId, "events"); state.completedChapters.add(1); state.gameOver = true; addLog("通信塔跡を突破し、救助信号を送った。第一章クリア。"); showChoice("第一章クリア", "ボタンではなく、町内に出現した空き地のラストダンジョンを突破して救助信号を送った。", [{ label: "最初から", primary: true, action: restart }]); render(); } },
        { label: "まだ探索する", action: () => { closeModal(); render(); } },
      ],
    },
    locker: {
      title: "ロッカーの物音",
      body: "内側から小さな声がする。開ければ食料を得られるが、金属音で旗人間が寄ってくる。見捨てれば静かだが士気は落ちる。",
      choices: [
        { label: "こじ開ける", primary: true, action: () => { state.morale = Math.min(100, state.morale + 8); state.food += 1; pressureLog("ロッカーの音に旗人間が反応した。", increaseFlagPressure(state, 8)); addLog("ロッカーから保存食を見つけ、助けを求めるメモで全員の士気が上がった。"); closeModal(); render(); } },
        { label: "音を立てず印だけ残す", action: () => { state.morale = Math.max(0, state.morale - 3); pressureLog("静かに離れた。", reduceFlagPressure(state, 4)); addLog("救えたかもしれない声を背にした。士気が少し下がったが、敵の注意は逸れた。"); closeModal(); render(); } },
      ],
    },
    broadcast: {
      title: "放送室の赤いランプ",
      body: "放送設備はまだ生きている。校内放送で旗人間を誘導すれば退路を作れるが、声を出せば校舎全体がざわつく。",
      choices: [
        { label: "囮放送で退路を作る", primary: true, action: () => { addTrace(state); state.morale = Math.min(100, state.morale + 10); pressureLog("放送で群れを一方向へ誘導した。", reduceFlagPressure(state, 14)); addLog("放送室から退路を確保した。事件の痕跡も1つ記録し、第一章の突破口が見えた。"); closeModal(); render(); } },
        { label: "部品だけ外して逃げる", action: () => { state.parts += 1; pressureLog("壊れたスピーカーが大きな音を立てた。", increaseFlagPressure(state, 16)); addLog("放送アンプから使える部品を外したが、校舎中で旗が揺れ始めた。部品 +1。"); closeModal(); render(); } },
      ],
    },
    basket: {
      title: "倒れた自転車",
      body: "カゴの袋を調べますか？音を立てると近くの敵が反応するかもしれない。",
      choices: [
        { label: "調べる", primary: true, action: () => { state.food += 2; pressureLog("自転車のベルが鳴った。", increaseFlagPressure(state, 10)); addLog("袋から食料を2つ見つけた。遠くで旗人間の声がした。急いで離れよう。"); closeModal(); render(); } },
        { label: "やめる", action: () => { pressureLog("音を立てずに通り抜けた。", reduceFlagPressure(state, 3)); addLog("危険を避け、先を急いだ。物資はないが足取りは軽い。 "); closeModal(); render(); } },
      ],
    },
    ward: {
      title: "閉鎖病棟",
      body: "薬品棚がある。中に入ると汚染された空気を吸い込むかもしれない。",
      choices: [
        { label: "突入して薬を回収", primary: true, action: () => { state.medicine += 2; addTrace(state); infectParty(5); pressureLog("病棟の警報が短く鳴った。", increaseFlagPressure(state, 8)); addLog("薬を2つ回収し、閉鎖病棟の記録から痕跡を1つ得たが、全員の旗汚染が上がった。 "); closeModal(); render(); } },
        { label: "入口だけ封鎖", action: () => { state.morale = Math.min(100, state.morale + 4); pressureLog("病棟の扉を塞いだ。", reduceFlagPressure(state, 8)); addLog("病棟には入らず、扉を塞いだ。薬は得られないが夜の不安が少し減った。 "); closeModal(); render(); } },
      ],
    },
    flag: {
      title: "黒い旗の破片",
      body: "事件の手がかりかもしれない。持ち帰ると通信機の修理にも使えそうだ。",
      choices: [
        { label: "拾う", primary: true, action: () => { state.parts += 1; addTrace(state); infectParty(4); pressureLog("旗の破片が脈打った。", increaseFlagPressure(state, 8)); addLog("旗の破片を部品として回収し、痕跡を1つ得た。少し気分が悪い。 "); closeModal(); render(); } },
        { label: "燃やす", action: () => { state.morale = Math.min(100, state.morale + 8); pressureLog("黒い煙が消え、周囲が静まった。", reduceFlagPressure(state, 10)); addLog("旗の破片を燃やした。全員の士気が上がった。 "); closeModal(); render(); } },
      ],
    },
  };
  const event = events[eventId];
  showChoice(event.title, event.body, event.choices);
}

function rescueAlly(allyId) {
  const ally = rescueAllyInState(state, allyId);
  if (ally) {
    addLog(`${ally.name}を救出した。仲間が増えたが、夜の食料消費も増える。`);
  }
}

function moveEnemies() {
  for (const entity of state.entities) {
    if (entity.type !== "enemy") continue;
    const distance = Math.abs(entity.x - state.player.x) + Math.abs(entity.y - state.player.y);
    const shouldChase = entity.enemy === "runner" && distance <= 4;
    const options = shouldChase ? chaseSteps(entity) : shuffle([{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 0, y: 0 }]);
    const step = options.find((option) => !isBlockedForEnemy(entity.x + option.x, entity.y + option.y));
    if (step) {
      entity.x += step.x;
      entity.y += step.y;
    }
  }
}

function chaseSteps(entity) {
  const horizontal = { x: Math.sign(state.player.x - entity.x), y: 0 };
  const vertical = { x: 0, y: Math.sign(state.player.y - entity.y) };
  return shuffle([horizontal, vertical, { x: 0, y: 0 }]);
}

function isBlockedForEnemy(x, y) {
  return isWall(x, y) || state.terrain[y]?.[x] === "X" || state.entities.some((entity) => entity.x === x && entity.y === y && (entity.type === "enemy" || entity.type === "area" || entity.type === "stairs"));
}

function checkEnemyContact() {
  const enemyIndex = state.entities.findIndex((entity) => entity.type === "enemy" && entity.x === state.player.x && entity.y === state.player.y);
  if (enemyIndex !== -1) startBattle(state.entities[enemyIndex], enemyIndex);
}

function startBattle(entity, entityIndex) {
  const preview = calculateBattlePreview(state, state.currentAreaId, entity.enemy);
  const intent = pickEnemyIntent(preview.enemy);

  showChoice(
    `${preview.enemy.name} / ${intent.name}`,
    createBattlePreviewBody(preview, intent),
    [
      { label: "突く: 詠唱や突進を止める", primary: intent.id === "howl", action: () => resolveBattleMove("strike", preview, intent, entityIndex) },
      { label: "守る: 突進を受け流す", primary: intent.id === "assault", action: () => resolveBattleMove("guard", preview, intent, entityIndex) },
      { label: "誘導: 隙を作り旗圧を下げる", primary: intent.id === "guard", action: () => resolveBattleMove("lure", preview, intent, entityIndex) },
      { label: `逃げる: 成功率${Math.round(preview.escapeChance * 100)}%`, action: () => resolveBattleMove("escape", preview, intent, entityIndex) },
    ],
  );
}

function pickEnemyIntent(enemy) {
  const intents = [
    { id: "assault", name: "突進の構え", clue: `${enemy.name}は旗を前に倒し、一直線に踏み込もうとしている。`, best: "守る" },
    { id: "guard", name: "防御の構え", clue: `${enemy.name}は通路を塞ぎ、こちらの空振りを待っている。`, best: "誘導" },
    { id: "howl", name: "呼び声の構え", clue: `${enemy.name}の旗が震え、仲間を呼ぶ直前だ。`, best: "突く" },
  ];
  return randomPick(intents);
}

function resolveBattleMove(move, preview, intent, entityIndex) {
  const enemy = preview.enemy;
  if (move === "escape") {
    const success = Math.random() < preview.escapeChance;
    if (success) {
      state.morale = Math.max(0, state.morale - 4);
      addLog(`${enemy.name}から逃げ切った。士気が少し下がった。`);
      showChoice("逃走成功", createBattleResultBody(enemy, ["全員で距離を取った。", `${enemy.name}の追撃を振り切った。`, "士気 -4。"]), [
        { label: "探索へ戻る", primary: true, action: () => { closeModal(); render(); } },
      ]);
      return;
    }
    damageParty(preview.enemyDamage);
    state.morale = Math.max(0, state.morale - 8);
    addLog(`逃走に失敗した。追撃を受けて全員で${preview.enemyDamage}ダメージを受けた。`);
    showChoice("逃走失敗", createBattleResultBody(enemy, ["足音が廊下に響く。", `${enemy.name}の追撃を受けた。`, `全員に ${preview.enemyDamage} ダメージ / 士気 -8。`]), [
      { label: "探索へ戻る", primary: true, action: () => { closeModal(); checkPartyDefeat(); render(); } },
    ]);
    return;
  }

  const matchup = `${move}:${intent.id}`;
  const goodMatch = ["strike:howl", "guard:assault", "lure:guard"].includes(matchup);
  const badMatch = ["strike:guard", "guard:howl", "lure:assault"].includes(matchup);
  const lines = [intent.clue];
  let damage = preview.totalEnemyDamage;
  let infection = preview.infectionGain;
  let moraleGain = 2;
  let result = "counter";

  if (goodMatch) {
    damage = Math.max(0, Math.floor(preview.enemyDamage / 2));
    infection = Math.max(0, preview.infectionGain - 3);
    moraleGain = 5;
    result = "clean";
    pressureLog("読み勝って旗人間の呼吸を崩した。", reduceFlagPressure(state, move === "lure" ? 8 : 4));
    lines.push(`正解行動「${battleMoveName(move)}」。${enemy.name}の弱点を突いた。`);
  } else if (badMatch) {
    damage = preview.totalEnemyDamage + 4;
    infection = preview.infectionGain + 2;
    moraleGain = -4;
    pressureLog("読み違えた物音で旗人間が近づいた。", increaseFlagPressure(state, 8));
    lines.push(`読み違えた。${enemy.name}に主導権を握られた。`);
  } else {
    pressureLog("短い乱戦で周囲がざわついた。", increaseFlagPressure(state, 3));
    lines.push(`行動「${battleMoveName(move)}」で押し合いになった。`);
  }

  if (damage > 0) damageParty(damage);
  if (infection > 0) infectParty(infection);
  state.morale = Math.max(0, Math.min(100, state.morale + moraleGain));
  state.entities.splice(entityIndex, 1);
  recordAreaNote(state, state.currentAreaId, "enemies");
  lines.push(`${enemy.name}を突破した。`, `被害 ${damage} / 汚染 +${infection} / 士気 ${moraleGain >= 0 ? "+" : ""}${moraleGain}。`);
  addLog(`${enemy.name}を${goodMatch ? "読み勝って" : badMatch ? "苦戦しながら" : "突破して"}倒した。被害${damage}、汚染+${infection}。`);

  showChoice("戦闘結果", createBattleResultBody(enemy, lines, result), [
    { label: "探索へ戻る", primary: true, action: () => { closeModal(); checkPartyDefeat(); render(); } },
  ]);
}

function battleMoveName(move) {
  return { strike: "突く", guard: "守る", lure: "誘導" }[move] ?? move;
}

function createBattlePreviewBody({ enemy, partyAttack, totalEnemyDamage, infectionGain, escapeChance }, intent) {
  return createBattleBody(enemy, [
    `${enemy.name}が立ちはだかった。`,
    intent.clue,
    `正解候補:${intent.best} / 味方攻撃:${partyAttack} / 失敗時被害:${totalEnemyDamage} / 汚染:+${infectionGain}`,
    `逃走成功率 約${Math.round(escapeChance * 100)}%。旗圧:${getFlagPressureTier(state).name}。`,
  ], {
    mode: "preview",
    partyDamage: partyAttack,
    enemyDamage: totalEnemyDamage,
    infectionGain,
  });
}

function createBattleResultBody(enemy, lines, forcedResult = null) {
  const wonCleanly = forcedResult === "clean" || lines.some((line) => line.includes("押し切った") || line.includes("弱点を突いた"));
  const escaped = lines.some((line) => line.includes("逃げ") || line.includes("振り切った"));
  return createBattleBody(enemy, lines, {
    mode: escaped ? "escape" : "result",
    result: wonCleanly ? "clean" : "counter",
  });
}

function createBattleBody(enemy, lines, options = {}) {
  const body = document.createElement("div");
  body.className = `battle-body battle-${options.mode || "result"}`;
  const stage = document.createElement("div");
  stage.className = `battle-stage ${options.result === "counter" ? "enemy-counter" : "party-attack"}`;
  stage.innerHTML = `
    <div class="battle-side allies">
      <span class="battle-sprite hero-sprite">主</span>
      <span class="battle-name">生存班</span>
      <span class="battle-hp"><span style="width: ${options.result === "counter" ? 64 : 88}%"></span></span>
    </div>
    <div class="battle-action" aria-hidden="true">
      <span class="hit-effect hit-one">斬</span>
      <span class="hit-effect hit-two">!</span>
      <span class="battle-slash">⚔</span>
    </div>
    <div class="battle-side enemy">
      <span class="battle-sprite enemy-sprite">${enemy.icon}</span>
      <span class="battle-name">${enemy.name}</span>
      <span class="battle-hp danger"><span style="width: ${options.mode === "preview" ? 100 : 0}%"></span></span>
    </div>
  `;
  const summary = document.createElement("p");
  summary.className = "battle-summary";
  summary.textContent = options.mode === "preview"
    ? `読み合い戦闘: 敵の構えに合わせて「突く・守る・誘導」を選ぶ。想定与ダメージ ${options.partyDamage} / 失敗時反撃 ${options.enemyDamage}。`
    : "敵の構えと選んだ行動の相性で、被害・汚染・旗圧が変化しました。";
  const list = document.createElement("ol");
  list.className = "battle-lines";
  lines.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    list.append(item);
  });
  body.append(stage, summary, list);
  return body;
}

function damageParty(totalDamage) {
  applyPartyDamage(state, totalDamage);
}

function infectParty(amount) {
  infectPartyMembers(state, amount);
}

function checkPartyDefeat() {
  const message = getHeroFailureMessage(state);
  if (message) triggerGameOver(message);
}

function openRationMenu() {
  if (state.gameOver || state.currentAreaId) return;
  const currentPolicy = getRationPolicy(state);
  showChoice(
    "配給方針",
    "夜明けに消費する食料と士気変化を選びます。食料が不足すると通常通り不足ペナルティが発生します。",
    Object.values(RATION_POLICIES).map((policy) => ({
      label: `${policy.name}: ${policy.description}`,
      primary: policy.id === currentPolicy.id,
      action: () => {
        setRationPolicy(state, policy.id);
        addLog(`配給方針を${policy.name}に変更した。${policy.description}`);
        closeModal();
        render();
      },
    })),
  );
}

function openTacticMenu() {
  if (state.gameOver || state.currentAreaId) return;
  const currentTactic = getTactic(state);
  showChoice(
    "作戦変更",
    "次の戦闘方針を選んでください。慎重は被害を抑え、強行は短期決戦に向きます。",
    Object.values(TACTICS).map((tactic) => ({
      label: `${tactic.name}: ${tactic.description}`,
      primary: tactic.id === currentTactic.id,
      action: () => {
        setTactic(state, tactic.id);
        addLog(`作戦を${tactic.name}に変更した。${tactic.description}`);
        closeModal();
        render();
      },
    })),
  );
}

function scoutAreas() {
  if (state.gameOver || state.currentAreaId) return;
  const recommendation = getRecommendedArea(state);
  if (!recommendation) {
    addLog("偵察できる探索先が見つからない。");
    render();
    return;
  }

  const findings = [];
  if (recommendation.allyCount > 0) findings.push(`未救助の仲間 ${recommendation.allyCount}`);
  if (recommendation.eventCount > 0) findings.push(`未確認イベント ${recommendation.eventCount}`);
  if (recommendation.itemCount > 0) findings.push(`物資候補 ${recommendation.itemCount}`);
  if (recommendation.reinforcementCount > 0) findings.push(`追加敵 ${recommendation.reinforcementCount}`);

  addLog(`周辺を偵察した。次は${recommendation.name}が有望だ。${findings.join(" / ") || "目立つ反応は少ない"}。`);
  advanceTime(1);
  render();
}

function openMedicineMenu() {
  if (state.gameOver || state.currentAreaId) return;
  if (state.medicine <= 0) {
    addLog("薬がない。病院や探索先で物資を探そう。");
    render();
    return;
  }

  const targets = state.party.filter((member) => member.hp < member.maxHp || member.infection > 0);
  if (targets.length === 0) {
    addLog("今は治療が必要な仲間はいない。");
    render();
    return;
  }

  const effects = getMedicineEffects(state);
  const firstAidNote = effects.hasFirstAid ? " アカリの応急手当で効果が上がっています。" : "";
  showChoice(
    "薬を使う",
    `薬を1つ消費して、対象のHPを${effects.hp}回復し、旗汚染を${effects.infection}下げます。誰を治療しますか？${firstAidNote}`,
    [
      ...targets.map((member) => ({
        label: `${member.name} HP ${member.hp}/${member.maxHp} / 汚染 ${member.infection}%`,
        primary: member.id === "hero",
        action: () => useMedicine(member.id),
      })),
      { label: "やめる", action: closeModal },
    ],
  );
}

function useMedicine(memberId) {
  const result = applyMedicineToMember(state, memberId);
  if (!result.ok) {
    const messages = {
      no_medicine: "薬がない。",
      missing_member: "その仲間は見つからない。",
      no_effect: "今は治療の必要がない。",
    };
    addLog(messages[result.reason] ?? "薬を使えなかった。");
  } else {
    const hpGain = result.after.hp - result.before.hp;
    const infectionDrop = result.before.infection - result.after.infection;
    addLog(`${result.member.name}に薬を使った。HP +${hpGain} / 旗汚染 -${infectionDrop}。`);
  }
  closeModal();
  render();
}

function openBarricadeMenu() {
  if (state.gameOver || state.currentAreaId) return;
  if (state.parts <= 0) {
    addLog("部品がない。バリケードを作るには部品が1つ必要だ。");
    render();
    return;
  }

  const targets = Object.entries(AREAS)
    .filter(([areaId, area]) => getAreaDanger(state, areaId) > area.danger);

  if (targets.length === 0) {
    addLog("今は補強が必要な探索先はない。");
    render();
    return;
  }

  showChoice(
    "バリケードを作る",
    "部品を1つ消費して、選んだ探索先の危険度を2下げます。通信機修理用の部品を使うので慎重に選んでください。",
    [
      ...targets.map(([areaId, area]) => ({
        label: `${area.name} 危険度 ${getAreaDanger(state, areaId)} → ${Math.max(area.danger, getAreaDanger(state, areaId) - 2)}`,
        primary: getAreaDanger(state, areaId) >= 5,
        action: () => useBarricade(areaId),
      })),
      { label: "やめる", action: closeModal },
    ],
  );
}

function useBarricade(areaId) {
  const result = buildBarricade(state, areaId);
  if (!result.ok) {
    const messages = {
      no_parts: "部品が足りない。",
      missing_area: "その探索先は見つからない。",
      no_effect: "今は補強の必要がない。",
    };
    addLog(messages[result.reason] ?? "バリケードを作れなかった。");
  } else {
    addLog(`${AREAS[areaId].name}にバリケードを作った。部品 -${result.cost} / 危険度 ${result.before} → ${result.after}。`);
  }
  closeModal();
  render();
}

function finishChapter() {
  if (state.gameOver || state.currentAreaId) return;
  const result = completeChapter(state);
  if (!result.ok) {
    const missing = result.progress.requirements
      .filter((requirement) => !requirement.complete)
      .map((requirement) => `・${requirement.title}`)
      .join("\n");
    showChoice(result.reason === "already_completed" ? "章完了済み" : "一章未完了", missing || "第一章はすでに完了しています。", [
      { label: "閉じる", primary: true, action: closeModal },
    ]);
    render();
    return;
  }

  addLog(`一章を完了した。士気 +${result.reward.morale} / 食料 +${result.reward.food}。`);
  showChoice(
    `${result.progress.title} 完了`,
    "校内の安全確保と通信機修理の足がかりを得た。第二章では商店街と病院へ本格的に踏み込み、救助信号の完成を目指そう。",
    [{ label: "第二章へ進む", primary: true, action: closeModal }],
  );
  render();
}

function sendSignal() {
  if (state.currentAreaId || state.gameOver) return;
  if (!canSendSignal(state)) {
    addLog(`通信機の部品が足りない。あと${REQUIRED_PARTS - state.parts}個必要だ。`);
    render();
    return;
  }
  state.gameOver = true;
  const ending = getEnding(state);
  showChoice(ending.title, ending.message, [
    { label: "もう一度遊ぶ", primary: true, action: restart },
  ]);
  addLog(`救助信号の送信に成功した。${ending.title}。`);
  render();
}

function triggerGameOver(message) {
  state.gameOver = true;
  addLog(message);
  showChoice("ゲームオーバー", message, [{ label: "最初から", primary: true, action: restart }]);
}

function restart() {
  const fresh = createInitialState();
  Object.assign(state, fresh);
  closeModal();
  render();
}

function saveGame() {
  if (state.gameOver) return;
  addLog("現在の状況をセーブした。");
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, serializeGameState(state));
  } catch {
    addLog("セーブに失敗した。ブラウザの保存領域を確認してください。");
  }
  render();
}

function loadGame() {
  let saved = null;
  try {
    saved = localStorage.getItem(SAVE_STORAGE_KEY);
  } catch {
    addLog("ロードに失敗した。ブラウザの保存領域を確認してください。");
    render();
    return;
  }

  if (!saved) {
    addLog("ロードできるセーブデータがない。");
    render();
    return;
  }

  try {
    Object.assign(state, deserializeGameState(saved));
    addLog("セーブデータをロードした。探索を再開しよう。");
    closeModal();
  } catch {
    addLog("セーブデータが壊れているためロードできなかった。");
  }
  render();
}

function hasSavedGame() {
  try {
    return localStorage.getItem(SAVE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function showChoice(title, body, choices) {
  ui.modalTitle.textContent = title;
  ui.modalBody.innerHTML = "";
  if (body instanceof Node) {
    ui.modalBody.append(body);
  } else {
    ui.modalBody.textContent = body;
  }
  ui.modalActions.innerHTML = "";
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice.label;
    if (choice.primary) button.classList.add("primary");
    button.addEventListener("click", () => {
      if (choice.closeOnAction !== false) closeModal();
      choice.action();
    });
    ui.modalActions.append(button);
  });
  ui.modal.classList.remove("hidden");
}

function closeModal() {
  ui.modal.classList.add("hidden");
}

function render() {
  ui.day.textContent = `${state.day} / ${MAX_DAY}日目`;
  ui.time.textContent = TIMES[state.timeIndex];
  ui.food.textContent = state.food;
  ui.medicine.textContent = state.medicine;
  ui.parts.textContent = `${state.parts} / ${REQUIRED_PARTS}`;
  ui.traces.textContent = `${state.traces} / ${REQUIRED_TRACES_FOR_TRUTH}`;
  ui.morale.textContent = state.morale;
  ui.watch.textContent = `Lv${state.watchLevel ?? 0} / 旗圧${getFlagPressureTier(state).pressure}`;
  ui.tactic.textContent = getTactic(state).name;
  const chapterProgress = getChapterProgress(state);
  ui.ration.textContent = getRationPolicy(state).name;
  ui.chapter.textContent = chapterProgress.alreadyCompleted ? "一章完了" : "一章進行中";
  ui.party.innerHTML = state.party.map((member) => `
    <li>
      <span class="character-icon character-${member.id}" aria-hidden="true">${CHARACTER_BADGES[member.id] ?? member.name[0]}</span>
      <span class="character-copy"><span class="character-name"><span>${member.name}</span><span>${member.role}</span></span><span class="character-meta">HP ${member.hp}/${member.maxHp} / 汚染 ${member.infection}% / 攻 ${member.attack}</span></span>
    </li>
  `).join("");
  renderObjectives();
  renderMap();
  renderAreaNotes();
  renderLogs();
  ui.returnButton.disabled = !state.currentAreaId || state.gameOver;
  ui.restButton.disabled = !!state.currentAreaId || state.gameOver;
  ui.rationButton.disabled = !!state.currentAreaId || state.gameOver;
  ui.medicineButton.disabled = !!state.currentAreaId || state.gameOver || state.medicine <= 0;
  ui.saveButton.disabled = state.gameOver;
  ui.loadButton.disabled = !hasSavedGame();
}

function renderObjectives() {
  ui.objectives.innerHTML = "";
  const chapterProgress = getChapterProgress(state);
  const chapterItem = document.createElement("li");
  chapterItem.className = chapterProgress.alreadyCompleted ? "complete" : "";
  chapterItem.innerHTML = `<span class="objective-title">${chapterProgress.alreadyCompleted ? "✓" : "□"} ${chapterProgress.title}</span><span class="objective-progress">${chapterProgress.requirements.filter((requirement) => requirement.complete).length}/${chapterProgress.requirements.length}項目</span><span class="objective-description">${chapterProgress.description}</span>`;
  ui.objectives.append(chapterItem);

  getObjectives(state).forEach((objective) => {
    const item = document.createElement("li");
    item.className = objective.complete ? "complete" : "";

    const title = document.createElement("span");
    title.className = "objective-title";
    title.textContent = `${objective.complete ? "✓" : "□"} ${objective.title}`;

    const progress = document.createElement("span");
    progress.className = "objective-progress";
    progress.textContent = `${objective.current}/${objective.target}${objective.unit}`;

    const description = document.createElement("span");
    description.className = "objective-description";
    description.textContent = objective.description;

    item.append(title, progress, description);
    ui.objectives.append(item);
  });
}

function renderMap() {
  ui.map.innerHTML = "";
  const isBase = !state.currentAreaId;
  ui.mapPanel.classList.toggle("base-mode", isBase);
  const area = isBase ? HUB_AREA : AREAS[state.currentAreaId];
  const floorSuffix = !isBase && state.currentFloor ? ` ${state.currentFloor + 1}層` : "";
  ui.areaName.textContent = isBase ? "学校前の町内" : `${area.name}${floorSuffix}`;
  ui.areaDescription.textContent = isBase
    ? "拠点前の14×14町内マップです。目的地の看板に乗ると探索先へ向かえます。旗人間にも注意。"
    : `${area.description} 主人公の周囲25マスだけが見える探索画面です。`;
  ui.map.style.display = "grid";
  ui.map.style.setProperty("--map-columns", VIEWPORT_SIZE);
  ui.map.className = `map-grid area-theme-${isBase ? "base" : state.currentAreaId}`;

  const viewport = getViewportBounds();
  for (let y = viewport.top; y <= viewport.bottom; y += 1) {
    for (let x = viewport.left; x <= viewport.right; x += 1) {
      const tile = document.createElement("div");
      const terrain = state.terrain[y]?.[x] ?? "#";
      const decor = state.layers?.decor?.[y]?.[x] ?? " ";
      const entity = state.entities.find((item) => item.x === x && item.y === y);
      const isPlayer = state.player.x === x && state.player.y === y;
      tile.className = "tile";
      tile.dataset.terrain = terrain;
      tile.dataset.decor = decor.trim() ? decor : "none";
      tile.setAttribute("aria-label", tileLabel(terrain, decor, entity, isPlayer));
      if (terrain === "#") tile.classList.add("wall");
      if (BLOCKING_DECOR.has(decor)) tile.classList.add("blocked-decor");
      if (terrain === "X") tile.classList.add("exit");
      if (decor.trim()) {
        const decorLayer = document.createElement("span");
        decorLayer.className = "tile-layer tile-decor";
        decorLayer.textContent = DECOR_LABELS[decor] ?? "·";
        tile.append(decorLayer);
      }
      if (terrain === "X") {
        const exitLayer = document.createElement("span");
        exitLayer.className = "tile-layer tile-exit";
        exitLayer.textContent = "出";
        tile.append(exitLayer);
      }
      if (entity) {
        tile.classList.add(entity.type);
        tile.append(createEntityLayer(entity));
        if (entity.type === "area" || entity.type === "stairs") {
          tile.tabIndex = 0;
          tile.role = "button";
          tile.addEventListener("click", () => entity.type === "area" ? enterArea(entity.areaId) : switchFloor(entity.targetFloor));
          tile.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (entity.type === "area") enterArea(entity.areaId);
              else switchFloor(entity.targetFloor);
            }
          });
        }
      }
      if (isPlayer) {
        tile.classList.add("player");
        tile.append(createCharacterLayer("hero", "主人公"));
      }
      ui.map.append(tile);
    }
  }
}

function getViewportBounds() {
  const height = state.terrain.length;
  const width = state.terrain[0]?.length ?? 0;
  const half = Math.floor(VIEWPORT_SIZE / 2);
  const maxLeft = Math.max(0, width - VIEWPORT_SIZE);
  const maxTop = Math.max(0, height - VIEWPORT_SIZE);
  const left = Math.min(maxLeft, Math.max(0, state.player.x - half));
  const top = Math.min(maxTop, Math.max(0, state.player.y - half));
  return { left, top, right: left + VIEWPORT_SIZE - 1, bottom: top + VIEWPORT_SIZE - 1 };
}

function createEntityLayer(entity) {
  if (entity.type === "ally") return createCharacterLayer(entity.ally, entityLabel(entity));
  const layer = document.createElement("span");
  layer.className = "tile-layer tile-entity";
  layer.textContent = entityLabel(entity);
  return layer;
}

function createCharacterLayer(characterId, label) {
  const badge = document.createElement("span");
  badge.className = `tile-layer tile-character character-${characterId}`;
  badge.textContent = CHARACTER_BADGES[characterId] ?? label[0] ?? "仲";
  badge.setAttribute("aria-label", label);
  return badge;
}

function tileLabel(terrain, decor, entity, isPlayer) {
  if (isPlayer) return "主人公";
  if (entity) return entityLabel(entity);
  if (terrain === "#") return "壁";
  if (terrain === "X") return "出口";
  if (BLOCKING_DECOR.has(decor)) return `${DECOR_LABELS[decor] ?? "障害物"}（通行不可）`;
  if (decor.trim()) return DECOR_LABELS[decor] ?? "地形装飾";
  return "床";
}

function entityLabel(entity) {
  if (entity.type === "area") return entity.label ?? AREAS[entity.areaId]?.name?.[0] ?? "行";
  if (entity.type === "stairs") return entity.label ?? "階";
  if (entity.type === "enemy") return ENEMIES[entity.enemy].icon;
  if (entity.type === "item") return "物";
  if (entity.type === "event") return "?";
  if (entity.type === "ally") return "仲";
  return "";
}

function renderAreaNotes() {
  ui.areaNotes.innerHTML = "";
  getAreaNoteSummaries(state).forEach((summary) => {
    const item = document.createElement("li");
    const lastVisited = summary.lastVisitedDay ? `${summary.lastVisitedDay}日目` : "未踏";
    item.textContent = `${summary.name}: 探索${summary.visits}回 / 物資${summary.items} / イベント${summary.events} / 敵${summary.enemies} / 仲間${summary.allies} / 最終 ${lastVisited}`;
    ui.areaNotes.append(item);
  });
}

const VISIBLE_LOG_COUNT = 9;

function renderLogs() {
  ui.log.innerHTML = "";
  const visibleLogs = [...state.logs].reverse().slice(0, VISIBLE_LOG_COUNT);
  visibleLogs.forEach((log) => {
    const item = document.createElement("li");
    item.textContent = log;
    ui.log.append(item);
  });
  const hiddenLogCount = Math.max(0, state.logs.length - visibleLogs.length);
  if (hiddenLogCount > 0) {
    const item = document.createElement("li");
    item.className = "muted-log";
    item.textContent = `古いログ ${hiddenLogCount} 件を省略中`;
    ui.log.append(item);
  }
}

function debugCompleteChapterOne() {
  if (!DEBUG_ENABLED) return;
  closeModal();
  state.currentAreaId = null;
  state.terrain = [];
  state.entities = [];
  state.player = { x: 0, y: 0 };
  recordAreaVisit(state, "school");
  completeEvent(state, "locker");
  completeEvent(state, "broadcast");
  rescueAllyInState(state, "akari");
  state.parts = Math.max(state.parts, 1);
  if (!state.completedChapters.has(1)) completeChapter(state);
  addLog("[DEBUG] 第一章クリア状態にしました。");
  render();
}

function debugFullResources() {
  if (!DEBUG_ENABLED) return;
  state.food = 12;
  state.medicine = 8;
  state.parts = Math.max(state.parts, REQUIRED_PARTS);
  state.traces = Math.max(state.traces, REQUIRED_TRACES_FOR_TRUTH);
  state.morale = 100;
  state.party.forEach((member) => {
    member.hp = member.maxHp;
    member.infection = 0;
  });
  addLog("[DEBUG] 資源とHPを最大化しました。");
  render();
}

function debugWin() {
  if (!DEBUG_ENABLED) return;
  debugFullResources();
  sendSignal();
}

function randomPick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatGain(result) {
  const labels = { food: "食料", medicine: "薬", parts: "部品", morale: "士気" };
  return Object.entries(result).map(([key, value]) => `${labels[key]} +${value}`).join(" / ");
}

ui.returnButton.addEventListener("click", returnToBase);
ui.restButton.addEventListener("click", rest);
ui.rationButton.addEventListener("click", openRationMenu);
ui.medicineButton.addEventListener("click", openMedicineMenu);
ui.restartButton.addEventListener("click", restart);
ui.saveButton.addEventListener("click", saveGame);
ui.loadButton.addEventListener("click", loadGame);
if (DEBUG_ENABLED) {
  ui.debugPanel.classList.remove("hidden");
  ui.debugCompleteChapter.addEventListener("click", debugCompleteChapterOne);
  ui.debugFullResources.addEventListener("click", debugFullResources);
  ui.debugWin.addEventListener("click", debugWin);
}
document.querySelector("#move-up").addEventListener("click", () => movePlayer(0, -1));
document.querySelector("#move-down").addEventListener("click", () => movePlayer(0, 1));
document.querySelector("#move-left").addEventListener("click", () => movePlayer(-1, 0));
document.querySelector("#move-right").addEventListener("click", () => movePlayer(1, 0));
document.addEventListener("keydown", (event) => {
  const keys = {
    ArrowUp: [0, -1],
    w: [0, -1],
    W: [0, -1],
    ArrowDown: [0, 1],
    s: [0, 1],
    S: [0, 1],
    ArrowLeft: [-1, 0],
    a: [-1, 0],
    A: [-1, 0],
    ArrowRight: [1, 0],
    d: [1, 0],
    D: [1, 0],
  };
  if (keys[event.key]) {
    event.preventDefault();
    movePlayer(...keys[event.key]);
  }
});

render();
