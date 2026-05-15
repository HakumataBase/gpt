import {
  AREAS,
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
  increaseAreaDanger,
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
  setRationPolicy,
  setTactic,
  deserializeGameState,
  serializeGameState,
} from "./game-core.js";

const SAVE_STORAGE_KEY = "after-school-flag-panic.save.v1";

const ASSET_PATHS = {
  characters: {
    hero: "assets/characters/hero.svg",
    minato: "assets/characters/minato.svg",
    akari: "assets/characters/akari.svg",
    shun: "assets/characters/shun.svg",
  },
};

const DEBUG_ENABLED = new URLSearchParams(window.location.search).has("debug");

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
  areas: document.querySelector("#area-actions"),
  mapPanel: document.querySelector(".map-panel"),
  map: document.querySelector("#map-grid"),
  areaName: document.querySelector("#area-name"),
  areaDescription: document.querySelector("#area-description"),
  areaNotes: document.querySelector("#area-note-list"),
  log: document.querySelector("#log-list"),
  returnButton: document.querySelector("#return-button"),
  restButton: document.querySelector("#rest-button"),
  guardButton: document.querySelector("#guard-button"),
  chapterButton: document.querySelector("#chapter-button"),
  scoutButton: document.querySelector("#scout-button"),
  tacticButton: document.querySelector("#tactic-button"),
  rationButton: document.querySelector("#ration-button"),
  medicineButton: document.querySelector("#medicine-button"),
  barricadeButton: document.querySelector("#barricade-button"),
  restartButton: document.querySelector("#restart-button"),
  saveButton: document.querySelector("#save-button"),
  loadButton: document.querySelector("#load-button"),
  signalButton: document.querySelector("#send-signal-button"),
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
}

function enterArea(areaId) {
  if (state.gameOver) return;
  const area = AREAS[areaId];
  state.currentAreaId = areaId;
  const areaState = cloneAreaState(area, state.rescued, getAreaDanger(state, areaId), state.completedEvents, state.collectedItems);
  state.terrain = areaState.terrain;
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
  const dangerChange = increaseAreaDanger(state, state.currentAreaId);
  state.currentAreaId = null;
  state.entities = [];
  state.terrain = [];
  advanceTime(area.timeCost);
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
  advanceTime(1);
  render();
}

function rest() {
  if (state.gameOver || state.currentAreaId) return;
  const dangerChanges = applyRest(state);
  addLog("拠点で休んだ。HPが回復し、旗汚染が少し下がった。");
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
  if (!state.currentAreaId || state.gameOver || !ui.modal.classList.contains("hidden")) return;
  const next = { x: state.player.x + dx, y: state.player.y + dy };
  if (isWall(next.x, next.y)) {
    addLog("そこは通れない。別の道を探そう。");
    render();
    return;
  }
  state.player = next;
  resolveTile();
  if (!ui.modal.classList.contains("hidden") || !state.currentAreaId || state.gameOver) {
    render();
    return;
  }
  moveEnemies();
  checkEnemyContact();
  render();
}

function isWall(x, y) {
  return isWallAt(state.terrain, x, y);
}

function resolveTile() {
  const terrain = state.terrain[state.player.y][state.player.x];
  if (terrain === "X") {
    showChoice("出口", "拠点へ帰還しますか？", [
      { label: "帰還する", primary: true, action: returnToBase },
      { label: "探索を続ける", action: closeModal },
    ]);
    return;
  }

  const entityIndex = state.entities.findIndex((entity) => entity.x === state.player.x && entity.y === state.player.y);
  if (entityIndex === -1) return;
  const entity = state.entities[entityIndex];

  if (entity.type === "item") {
    state.entities.splice(entityIndex, 1);
    collectItem(state, state.currentAreaId, entity);
    recordAreaNote(state, state.currentAreaId, "items");
    gainLoot(entity.loot);
  } else if (entity.type === "event") {
    state.entities.splice(entityIndex, 1);
    completeEvent(state, entity.event);
    recordAreaNote(state, state.currentAreaId, "events");
    runEvent(entity.event);
  } else if (entity.type === "ally") {
    state.entities.splice(entityIndex, 1);
    recordAreaNote(state, state.currentAreaId, "allies");
    rescueAlly(entity.ally);
  } else if (entity.type === "enemy") {
    startBattle(entity, entityIndex);
  }
}

function gainLoot(loot) {
  const result = applyLoot(state, loot);
  addLog(`物資を見つけた。${formatGain(result)}。`);
}

function runEvent(eventId) {
  const events = {
    locker: {
      title: "ロッカーの物音",
      body: "内側から小さな声がする。開ければ誰かを助けられるかもしれないが、敵を呼ぶ危険もある。",
      choices: [
        { label: "開ける", primary: true, action: () => { state.morale += 6; state.food += 1; addLog("ロッカーから保存食を見つけ、士気が上がった。"); closeModal(); render(); } },
        { label: "無視する", action: () => { state.morale -= 4; addLog("見なかったことにした。士気が少し下がった。"); closeModal(); render(); } },
      ],
    },
    basket: {
      title: "倒れた自転車",
      body: "カゴの袋を調べますか？音を立てると近くの敵が反応するかもしれない。",
      choices: [
        { label: "調べる", primary: true, action: () => { state.food += 2; addLog("袋から食料を2つ見つけた。遠くで旗人間の声がした。"); closeModal(); render(); } },
        { label: "やめる", action: () => { addLog("危険を避け、先を急いだ。"); closeModal(); render(); } },
      ],
    },
    ward: {
      title: "閉鎖病棟",
      body: "薬品棚がある。中に入ると汚染された空気を吸い込むかもしれない。",
      choices: [
        { label: "入る", primary: true, action: () => { state.medicine += 2; addTrace(state); infectParty(5); addLog("薬を2つ回収し、閉鎖病棟の記録から痕跡を1つ得たが、全員の旗汚染が上がった。"); closeModal(); render(); } },
        { label: "避ける", action: () => { addLog("病棟には入らず、扉を閉じた。"); closeModal(); render(); } },
      ],
    },
    flag: {
      title: "黒い旗の破片",
      body: "事件の手がかりかもしれない。持ち帰ると通信機の修理にも使えそうだ。",
      choices: [
        { label: "拾う", primary: true, action: () => { state.parts += 1; addTrace(state); infectParty(4); addLog("旗の破片を部品として回収し、痕跡を1つ得た。少し気分が悪い。"); closeModal(); render(); } },
        { label: "燃やす", action: () => { state.morale += 8; addLog("旗の破片を燃やした。全員の士気が上がった。"); closeModal(); render(); } },
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
  return isWall(x, y) || state.terrain[y][x] === "X" || state.entities.some((entity) => entity.x === x && entity.y === y && entity.type === "enemy");
}

function checkEnemyContact() {
  const enemyIndex = state.entities.findIndex((entity) => entity.type === "enemy" && entity.x === state.player.x && entity.y === state.player.y);
  if (enemyIndex !== -1) startBattle(state.entities[enemyIndex], enemyIndex);
}

function startBattle(entity, entityIndex) {
  const preview = calculateBattlePreview(state, state.currentAreaId, entity.enemy);
  const { enemy, escapeChance } = preview;

  showChoice(
    enemy.name,
    createBattlePreviewBody(preview),
    [
      {
        label: "戦う",
        primary: true,
        action: () => resolveFight(enemy, preview, entityIndex),
      },
      {
        label: "逃げる",
        action: () => {
          const success = Math.random() < escapeChance;
          if (success) {
            state.morale = Math.max(0, state.morale - 4);
            addLog(`${enemy.name}から逃げ切った。士気が少し下がった。`);
            showChoice("逃走成功", createBattleResultBody(enemy, ["全員で距離を取った。", `${enemy.name}の追撃を振り切った。`, "士気 -4。"]), [
              { label: "探索へ戻る", primary: true, action: () => { closeModal(); render(); } },
            ]);
          } else {
            damageParty(preview.enemyDamage);
            state.morale = Math.max(0, state.morale - 8);
            addLog(`逃走に失敗した。追撃を受けて全員で${preview.enemyDamage}ダメージを受けた。`);
            showChoice("逃走失敗", createBattleResultBody(enemy, ["足音が廊下に響く。", `${enemy.name}の追撃を受けた。`, `全員に ${preview.enemyDamage} ダメージ / 士気 -8。`]), [
              { label: "探索へ戻る", primary: true, action: () => { closeModal(); checkPartyDefeat(); render(); } },
            ]);
          }
        },
      },
    ],
  );
}

function resolveFight(enemy, preview, entityIndex) {
  const lines = [
    `作戦「${preview.tactic.name}」で前に出る。`,
    `味方の総攻撃！ ${preview.partyAttack} ダメージ。`,
  ];

  if (preview.canDefeatSafely) {
    state.entities.splice(entityIndex, 1);
    recordAreaNote(state, state.currentAreaId, "enemies");
    state.morale = Math.min(100, state.morale + 3);
    lines.push(`${enemy.name}を押し切った。`, "士気 +3。");
    addLog(`${enemy.name}を倒した。士気が少し上がった。`);
  } else {
    damageParty(preview.totalEnemyDamage);
    infectParty(preview.infectionGain);
    state.entities.splice(entityIndex, 1);
    recordAreaNote(state, state.currentAreaId, "enemies");
    lines.push(`${enemy.name}の反撃！ 全員で ${preview.totalEnemyDamage} ダメージを分け合った。`, `旗汚染 +${preview.infectionGain}。`, `${enemy.name}を辛くも倒した。`);
    addLog(`${enemy.name}を辛くも倒した。全員が${preview.totalEnemyDamage}ダメージを分け合い、旗汚染が${preview.infectionGain}進んだ。`);
  }

  showChoice("戦闘結果", createBattleResultBody(enemy, lines), [
    { label: "探索へ戻る", primary: true, action: () => { closeModal(); checkPartyDefeat(); render(); } },
  ]);
}

function createBattlePreviewBody({ enemy, tactic, partyAttack, totalEnemyDamage, infectionGain, escapeChance }) {
  return createBattleBody(enemy, [
    `${enemy.name}が立ちはだかった。`,
    `作戦:${tactic.name} / 推定攻撃:${partyAttack} / 被害:${totalEnemyDamage} / 汚染:+${infectionGain}`,
    `逃走成功率 約${Math.round(escapeChance * 100)}%。`,
  ], {
    mode: "preview",
    partyDamage: partyAttack,
    enemyDamage: totalEnemyDamage,
    infectionGain,
  });
}

function createBattleResultBody(enemy, lines) {
  const wonCleanly = lines.some((line) => line.includes("押し切った"));
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
    ? `接触戦闘: 味方が踏み込み、敵の反撃前に削り切れるかが勝負。想定与ダメージ ${options.partyDamage} / 反撃 ${options.enemyDamage}。`
    : "味方と敵がぶつかり合い、攻撃・反撃・決着を順に処理しました。";
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
  ui.watch.textContent = `Lv${state.watchLevel ?? 0}`;
  ui.tactic.textContent = getTactic(state).name;
  const chapterProgress = getChapterProgress(state);
  ui.ration.textContent = getRationPolicy(state).name;
  ui.chapter.textContent = chapterProgress.alreadyCompleted ? "一章完了" : "一章進行中";
  ui.party.innerHTML = state.party.map((member) => `
    <li>
      <img class="character-icon" src="${ASSET_PATHS.characters[member.id]}" alt="" loading="lazy" />
      <span class="character-copy"><span class="character-name"><span>${member.name}</span><span>${member.role}</span></span><span class="character-meta">HP ${member.hp}/${member.maxHp} / 汚染 ${member.infection}% / 攻 ${member.attack}</span></span>
    </li>
  `).join("");
  renderObjectives();
  renderAreaButtons();
  renderMap();
  renderAreaNotes();
  renderLogs();
  ui.returnButton.disabled = !state.currentAreaId || state.gameOver;
  ui.restButton.disabled = !!state.currentAreaId || state.gameOver;
  ui.guardButton.disabled = !!state.currentAreaId || state.gameOver;
  ui.chapterButton.disabled = !!state.currentAreaId || state.gameOver || !canCompleteChapter(state);
  ui.scoutButton.disabled = !!state.currentAreaId || state.gameOver;
  ui.tacticButton.disabled = !!state.currentAreaId || state.gameOver;
  ui.rationButton.disabled = !!state.currentAreaId || state.gameOver;
  ui.medicineButton.disabled = !!state.currentAreaId || state.gameOver || state.medicine <= 0;
  ui.barricadeButton.disabled = !!state.currentAreaId || state.gameOver || state.parts <= 0;
  ui.signalButton.disabled = !!state.currentAreaId || state.gameOver;
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

function renderAreaButtons() {
  ui.areas.innerHTML = "";
  Object.entries(AREAS).forEach(([id, area]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "area-button";
    button.disabled = !!state.currentAreaId || state.gameOver;
    const currentDanger = getAreaDanger(state, id);
    const dangerNote = currentDanger > area.danger ? `${area.danger}→${currentDanger}` : `${currentDanger}`;
    const summary = getAreaExplorationSummary(state, id);
    const scoutingNote = `物資${summary.itemCount} / イベント${summary.eventCount} / 仲間${summary.allyCount} / 追加敵${summary.reinforcementCount}`;
    button.title = `${area.name}: 危険度 ${dangerNote} / ${area.timeCost}区切り消費 / ${scoutingNote}`;
    button.setAttribute("aria-label", button.title);
    button.innerHTML = `<span class="area-title">${area.name}</span><span class="area-meta">危${dangerNote}・${area.timeCost}区</span><span class="area-summary">物${summary.itemCount} イ${summary.eventCount} 仲${summary.allyCount} 敵+${summary.reinforcementCount}</span>`;
    button.addEventListener("click", () => enterArea(id));
    ui.areas.append(button);
  });
}

function renderMap() {
  ui.map.innerHTML = "";
  if (!state.currentAreaId) {
    ui.mapPanel.classList.add("base-mode");
    ui.areaName.textContent = "学校拠点";
    ui.areaDescription.textContent = "拠点では左の探索先と行動ボタンだけ見れば進行できます。仲間や目標の詳細は必要な時だけ開いてください。";
    ui.map.innerHTML = `<div class="base-placeholder">探索先を選択</div>`;
    ui.map.style.display = "flex";
    return;
  }

  ui.mapPanel.classList.remove("base-mode");
  const area = AREAS[state.currentAreaId];
  ui.areaName.textContent = area.name;
  ui.areaDescription.textContent = area.description;
  ui.map.style.display = "grid";

  for (let y = 0; y < state.terrain.length; y += 1) {
    for (let x = 0; x < state.terrain[y].length; x += 1) {
      const tile = document.createElement("div");
      const terrain = state.terrain[y][x];
      const entity = state.entities.find((item) => item.x === x && item.y === y);
      const isPlayer = state.player.x === x && state.player.y === y;
      tile.className = "tile";
      tile.textContent = terrain === "X" ? "出" : "";
      if (terrain === "#") tile.classList.add("wall");
      if (terrain === "X") tile.classList.add("exit");
      if (entity) {
        tile.classList.add(entity.type);
        tile.textContent = entityLabel(entity);
      }
      if (isPlayer) {
        tile.className = "tile player";
        tile.textContent = "主";
      }
      ui.map.append(tile);
    }
  }
}

function entityLabel(entity) {
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
ui.guardButton.addEventListener("click", guardDuty);
ui.chapterButton.addEventListener("click", finishChapter);
ui.scoutButton.addEventListener("click", scoutAreas);
ui.tacticButton.addEventListener("click", openTacticMenu);
ui.rationButton.addEventListener("click", openRationMenu);
ui.medicineButton.addEventListener("click", openMedicineMenu);
ui.barricadeButton.addEventListener("click", openBarricadeMenu);
ui.restartButton.addEventListener("click", restart);
ui.saveButton.addEventListener("click", saveGame);
ui.loadButton.addEventListener("click", loadGame);
ui.signalButton.addEventListener("click", sendSignal);
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
