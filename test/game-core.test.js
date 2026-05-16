import test from "node:test";
import assert from "node:assert/strict";

import {
  AREAS,
  HUB_AREA,
  RATION_POLICIES,
  TACTICS,
  REQUIRED_TRACES_FOR_TRUTH,
  MAX_DAY,
  MAX_AREA_DANGER,
  REQUIRED_PARTS,
  addTrace,
  applyEndDay,
  applyGuardDuty,
  applyLoot,
  applyMedicineToMember,
  applyNightRaid,
  applyPartyDamage,
  applyRest,
  buildBarricade,
  getAreaDanger,
  getAreaNoteSummaries,
  getAreaNoteSummary,
  getChapterProgress,
  increaseAreaDanger,
  calculateBattlePreview,
  canCompleteChapter,
  canSendSignal,
  cloneAreaState,
  collectItem,
  completeChapter,
  completeEvent,
  createDangerReinforcements,
  createInitialState,
  getEnding,
  getAreaExplorationSummary,
  getEntityCollectionKey,
  getHeroFailureMessage,
  getMedicineEffects,
  getObjectives,
  getRationPolicy,
  getDailyFoodNeed,
  getRecommendedArea,
  getBattleInfectionGain,
  getEscapeChance,
  getTactic,
  getWatchRaidReduction,
  getFrontlineReduction,
  getFlagPressureTier,
  getRestEffects,
  getScavengeBonus,
  infectPartyMembers,
  isWallAt,
  pushLog,
  recordAreaNote,
  recordAreaVisit,
  reduceIncomingDamage,
  rescueAllyInState,
  setRationPolicy,
  setTactic,
  deserializeGameState,
  serializeGameState,
} from "../src/game-core.js";

test("initial state starts at the school base with the hero and Minato", () => {
  const state = createInitialState();

  assert.equal(state.day, 1);
  assert.equal(state.timeIndex, 0);
  assert.equal(state.food, 5);
  assert.equal(state.traces, 0);
  assert.equal(state.currentAreaId, null);
  assert.equal(state.tactic, "balanced");
  assert.equal(state.rationPolicy, "normal");
  assert.equal(state.watchLevel, 0);
  assert.deepEqual(state.areaDanger, { school: 1, market: 3, hospital: 4, park: 2 });
  assert.deepEqual(state.party.map((member) => member.id), ["hero", "minato"]);
  assert.ok(state.rescued.has("hero"));
  assert.ok(state.rescued.has("minato"));
  assert.equal(state.completedEvents.size, 0);
  assert.equal(state.collectedItems.size, 0);
  assert.equal(state.areaNotes.school.visits, 0);
  assert.deepEqual(state.player, HUB_AREA.start);
  assert.equal(state.terrain.length, 14);
  assert.equal(state.terrain[0].length, 14);
  assert.equal(state.entities.filter((entity) => entity.type === "area").length, 4);
  assert.equal(state.entities.some((entity) => entity.type === "enemy"), true);
  assert.equal(getAreaDanger(state, null), HUB_AREA.danger);
});

test("cloneAreaState creates mutable map state and filters rescued allies", () => {
  const rescued = new Set(["hero", "minato", "akari"]);
  const areaState = cloneAreaState(AREAS.school, rescued);

  assert.deepEqual(areaState.player, AREAS.school.start);
  assert.equal(areaState.terrain[0][0], "#");
  assert.equal(areaState.entities.some((entity) => entity.type === "ally" && entity.ally === "akari"), false);

  areaState.terrain[0][0] = ".";
  assert.equal(AREAS.school.terrain[0][0], "#", "area templates must not be mutated by exploration state");
});


test("area templates use expanded 14x14 maps with separate decor layers", () => {
  for (const area of Object.values(AREAS)) {
    assert.equal(area.terrain.length, 14);
    assert.equal(area.layers.decor.length, 14);
    for (const row of area.terrain) assert.equal(row.length, 14);
    for (const row of area.layers.decor) assert.equal(row.length, 14);
  }

  const areaState = cloneAreaState(AREAS.school);
  assert.equal(areaState.layers.decor[1][3], "d");
  areaState.layers.decor[1][3] = " ";
  assert.equal(AREAS.school.layers.decor[1][3], "d", "decor layer templates must not be mutated by exploration state");
});

test("completed events are filtered from future area clones", () => {
  const state = createInitialState();

  const initialAreaState = cloneAreaState(AREAS.school, state.rescued, AREAS.school.danger, state.completedEvents);
  assert.equal(initialAreaState.entities.some((entity) => entity.type === "event" && entity.event === "locker"), true);

  completeEvent(state, "locker");
  const areaState = cloneAreaState(AREAS.school, state.rescued, AREAS.school.danger, state.completedEvents);

  assert.equal(state.completedEvents.has("locker"), true);
  assert.equal(areaState.entities.some((entity) => entity.type === "event" && entity.event === "locker"), false);
});


test("collected items are filtered from future area clones and summaries", () => {
  const state = createInitialState();
  const areaState = cloneAreaState(AREAS.school, state.rescued, AREAS.school.danger, state.completedEvents, state.collectedItems);
  const item = areaState.entities.find((entity) => entity.type === "item" && entity.loot === "parts");

  assert.equal(item.collectionKey, getEntityCollectionKey("school", item));
  assert.equal(getAreaExplorationSummary(state, "school").itemCount, 2);

  collectItem(state, "school", item);
  const nextAreaState = cloneAreaState(AREAS.school, state.rescued, AREAS.school.danger, state.completedEvents, state.collectedItems);

  assert.equal(state.collectedItems.has(item.collectionKey), true);
  assert.equal(nextAreaState.entities.some((entity) => entity.type === "item" && entity.loot === "parts"), false);
  assert.equal(getAreaExplorationSummary(state, "school").itemCount, 1);
});

test("cloneAreaState adds reinforcement enemies when current danger exceeds base danger", () => {
  const area = AREAS.school;
  const areaState = cloneAreaState(area, new Set(), area.danger + 2);
  const reinforcements = areaState.entities.filter((entity) => entity.reinforcement);

  assert.equal(reinforcements.length, 2);
  assert.equal(reinforcements.every((entity) => entity.type === "enemy" && entity.enemy === "walker"), true);
  assert.equal(reinforcements.some((entity) => entity.x === area.start.x && entity.y === area.start.y), false);
});

test("createDangerReinforcements returns no extra enemies at base danger", () => {
  assert.deepEqual(createDangerReinforcements(AREAS.market, AREAS.market.danger), []);
});

test("isWallAt rejects walls and out-of-bounds positions", () => {
  const { terrain } = cloneAreaState(AREAS.school);

  assert.equal(isWallAt(terrain, 0, 0), true);
  assert.equal(isWallAt(terrain, 1, 1), false);
  assert.equal(isWallAt(terrain, -1, 1), true);
  assert.equal(isWallAt(terrain, 1, 99), true);
});

test("Minato frontline reduces incoming damage while he can act", () => {
  const state = createInitialState();

  assert.equal(getFrontlineReduction(state), 2);
  assert.equal(reduceIncomingDamage(state, 6), 4);
  assert.equal(reduceIncomingDamage(state, 1), 1);

  state.party.find((member) => member.id === "minato").hp = 0;
  assert.equal(getFrontlineReduction(state), 0);
  assert.equal(reduceIncomingDamage(state, 6), 6);
});


test("guard duty raises watch level and reduces the next night raid", () => {
  const state = createInitialState();
  state.morale = 20;
  increaseAreaDanger(state, "hospital", 1);

  let guard = applyGuardDuty(state);
  assert.equal(guard.ok, true);
  assert.equal(guard.after, 1);
  assert.equal(guard.pressure.after, 12);
  guard = applyGuardDuty(state);
  assert.equal(guard.ok, true);
  assert.equal(guard.after, 2);
  assert.deepEqual(applyGuardDuty(state), { ok: false, reason: "max_watch", before: 2, after: 2 });
  assert.deepEqual(getWatchRaidReduction(state), { watchLevel: 2, damageReduction: 4, moraleReduction: 6 });

  const raid = applyNightRaid(state);

  assert.equal(raid.watchLevel, 2);
  assert.equal(raid.totalDamage, 1);
  assert.equal(raid.moraleLoss, 0);
  assert.equal(state.party[0].hp, 33);
  assert.equal(state.party[1].hp, 37);
  assert.equal(state.morale, 24);
  assert.equal(state.watchLevel, 0);
  assert.match(raid.message, /見張りLv2/);
});

test("applyNightRaid damages party and morale when area danger is too high", () => {
  const state = createInitialState();
  state.morale = 20;
  increaseAreaDanger(state, "hospital", 1);

  const raid = applyNightRaid(state);

  assert.equal(raid.raidAreas.length, 1);
  assert.equal(raid.raidAreas[0].areaId, "hospital");
  assert.equal(raid.totalDamage, 2);
  assert.equal(raid.moraleLoss, 6);
  assert.equal(state.party[0].hp, 32);
  assert.equal(state.party[1].hp, 36);
  assert.equal(state.morale, 14);
  assert.match(raid.message, /病院/);
});

test("applyNightRaid does nothing below the raid danger threshold", () => {
  const state = createInitialState();

  assert.equal(applyNightRaid(state), null);
  assert.equal(state.party[0].hp, state.party[0].maxHp);
  assert.equal(state.morale, 55);
});


test("ration policies adjust daily food consumption and morale", () => {
  const state = createInitialState();

  assert.equal(getRationPolicy(state), RATION_POLICIES.normal);
  assert.equal(getDailyFoodNeed(state), 2);
  assert.equal(setRationPolicy(state, "missing").ok, false);

  assert.equal(setRationPolicy(state, "conserve").ok, true);
  assert.equal(getDailyFoodNeed(state), 1);
  state.food = 3;
  state.morale = 50;
  let result = applyEndDay(state);
  assert.equal(state.food, 2);
  assert.equal(state.morale, 47);
  assert.match(result.messages.find((message) => /節約配給/.test(message)), /節約配給/);
  assert.match(result.messages.find((message) => /士気 -3/.test(message)), /士気 -3/);

  setRationPolicy(state, "generous");
  state.food = 5;
  state.morale = 98;
  result = applyEndDay(state);
  assert.equal(state.food, 2);
  assert.equal(state.morale, 100);
  assert.match(result.messages.find((message) => /厚め配給/.test(message)), /厚め配給/);
  assert.match(result.messages.find((message) => /士気 \+4/.test(message)), /士気 \+4/);
});

test("applyEndDay consumes food by party size without starvation when food remains", () => {
  const state = createInitialState();
  state.food = 3;

  const result = applyEndDay(state);

  assert.equal(state.day, 2);
  assert.equal(state.food, 1);
  assert.equal(state.morale, 55);
  assert.equal(result.gameOverMessage, null);
  assert.match(result.messages[0], /旗圧 18 → 26/);
  assert.match(result.messages[1], /標準配給で食料を2消費/);
});

test("applyEndDay includes raid messages after food consumption", () => {
  const state = createInitialState();
  state.food = 5;
  increaseAreaDanger(state, "hospital", 1);

  const result = applyEndDay(state);

  assert.equal(result.gameOverMessage, null);
  assert.equal(result.messages.length, 3);
  assert.match(result.messages.at(-1), /拠点近くまで押し寄せた/);
  assert.equal(state.party[0].hp, 32);
});

test("applyEndDay applies starvation penalties and detects the day limit", () => {
  const state = createInitialState();
  state.day = MAX_DAY;
  state.food = 0;

  const result = applyEndDay(state);

  assert.equal(state.day, MAX_DAY + 1);
  assert.equal(state.food, 0);
  assert.equal(state.morale, 39);
  assert.equal(state.party[0].hp, 24);
  assert.equal(state.party[1].hp, 28);
  assert.equal(result.gameOverMessage, "7日目までに救助信号を送れなかった。校舎は旗人間に包囲された。");
  assert.equal(result.messages.length, 3);
});


test("flag pressure changes battle risk and recovery actions", () => {
  const state = createInitialState();

  assert.equal(getFlagPressureTier(state).id, "calm");
  state.flagPressure = 60;
  assert.equal(getFlagPressureTier(state).id, "danger");
  const preview = calculateBattlePreview(state, "school", "walker");
  assert.equal(preview.pressure.battleThreat, 2);
  assert.equal(getEscapeChance(state, "school"), 0.52);

  applyRest(state);
  assert.equal(state.flagPressure, 50);
});

test("Akari first aid improves rest and medicine effects after rescue", () => {
  const state = createInitialState();

  assert.deepEqual(getRestEffects(state), { hp: 8, infection: 4, hasFirstAid: false });
  assert.deepEqual(getMedicineEffects(state), { hp: 18, infection: 12, hasFirstAid: false });

  rescueAllyInState(state, "akari");

  assert.deepEqual(getRestEffects(state), { hp: 12, infection: 6, hasFirstAid: true });
  assert.deepEqual(getMedicineEffects(state), { hp: 22, infection: 14, hasFirstAid: true });
});

test("applyRest uses Akari first aid bonuses when she is in the party", () => {
  const state = createInitialState();
  rescueAllyInState(state, "akari");
  state.party[0].hp = 10;
  state.party[0].infection = 10;

  applyRest(state);

  assert.equal(state.party[0].hp, 22);
  assert.equal(state.party[0].infection, 4);
});

test("applyRest heals HP, lowers infection, and caps morale", () => {
  const state = createInitialState();
  state.morale = 99;
  state.party[0].hp = 20;
  state.party[0].infection = 3;
  state.party[1].hp = state.party[1].maxHp;
  state.party[1].infection = 12;

  applyRest(state);

  assert.equal(state.party[0].hp, 28);
  assert.equal(state.party[0].infection, 0);
  assert.equal(state.party[1].hp, state.party[1].maxHp);
  assert.equal(state.party[1].infection, 8);
  assert.equal(state.morale, 100);
});

test("area danger rises after exploration and recovers toward base on rest", () => {
  const state = createInitialState();

  assert.deepEqual(increaseAreaDanger(state, "school"), { before: 1, after: 2, changed: true });
  increaseAreaDanger(state, "school", 99);
  assert.equal(getAreaDanger(state, "school"), MAX_AREA_DANGER);

  const changes = applyRest(state);

  assert.deepEqual(changes, [{ areaId: "school", before: MAX_AREA_DANGER, after: MAX_AREA_DANGER - 1 }]);
  assert.equal(getAreaDanger(state, "school"), MAX_AREA_DANGER - 1);
  assert.equal(getAreaDanger(state, "market"), AREAS.market.danger);
});



test("area notes track visits and discoveries by area", () => {
  const state = createInitialState();

  assert.equal(recordAreaVisit(state, "school").visits, 1);
  assert.equal(state.areaNotes.school.lastVisitedDay, 1);
  assert.equal(recordAreaNote(state, "school", "items").items, 1);
  assert.equal(recordAreaNote(state, "school", "events").events, 1);
  assert.equal(recordAreaNote(state, "school", "enemies", 2).enemies, 2);
  assert.equal(recordAreaNote(state, "school", "allies").allies, 1);

  const summary = getAreaNoteSummary(state, "school");
  assert.deepEqual(
    { visits: summary.visits, items: summary.items, events: summary.events, enemies: summary.enemies, allies: summary.allies, lastVisitedDay: summary.lastVisitedDay },
    { visits: 1, items: 1, events: 1, enemies: 2, allies: 1, lastVisitedDay: 1 },
  );
  assert.equal(getAreaNoteSummary(state, "missing"), null);
  assert.equal(recordAreaNote(state, "school", "unknown"), null);
  assert.equal(getAreaNoteSummaries(state).length, Object.keys(AREAS).length);
});

test("area exploration summary reflects completed events, rescued allies, and reinforcements", () => {
  const state = createInitialState();

  let summary = getAreaExplorationSummary(state, "school");
  assert.equal(summary.itemCount, 2);
  assert.equal(summary.eventCount, 2);
  assert.equal(summary.allyCount, 1);
  assert.equal(summary.reinforcementCount, 0);

  completeEvent(state, "locker");
  rescueAllyInState(state, "akari");
  increaseAreaDanger(state, "school", 2);
  summary = getAreaExplorationSummary(state, "school");

  assert.equal(summary.eventCount, 1);
  assert.equal(summary.allyCount, 0);
  assert.equal(summary.reinforcementCount, 2);
});

test("recommended area prioritizes useful low-risk exploration targets", () => {
  const state = createInitialState();

  assert.equal(getRecommendedArea(state).areaId, "school");

  completeEvent(state, "locker");
  rescueAllyInState(state, "akari");
  increaseAreaDanger(state, "school", 3);

  assert.equal(getRecommendedArea(state).areaId, "hospital");
});



test("chapter one requires school progress and grants completion rewards once", () => {
  const state = createInitialState();

  let progress = getChapterProgress(state);
  assert.equal(progress.chapterId, 1);
  assert.equal(progress.complete, false);
  assert.equal(canCompleteChapter(state), false);
  assert.equal(completeChapter(state).reason, "requirements_missing");

  recordAreaVisit(state, "school");
  rescueAllyInState(state, "akari");
  completeEvent(state, "locker");
  state.parts = 1;
  assert.equal(getChapterProgress(state).complete, false, "broadcast-room route should be required for chapter one");
  completeEvent(state, "broadcast");
  state.food = 2;
  state.morale = 50;

  progress = getChapterProgress(state);
  assert.equal(progress.complete, true);
  assert.equal(canCompleteChapter(state), true);

  const result = completeChapter(state);
  assert.equal(result.ok, true);
  assert.deepEqual(result.reward, { morale: 8, food: 1 });
  assert.equal(state.completedChapters.has(1), true);
  assert.equal(state.food, 3);
  assert.equal(state.morale, 58);
  assert.equal(canCompleteChapter(state), false);
  assert.equal(completeChapter(state).reason, "already_completed");
});

test("objectives summarize repair, truth, allies, and danger progress", () => {
  const state = createInitialState();

  let objectives = getObjectives(state);
  assert.deepEqual(objectives.map((objective) => objective.id), ["repair_signal", "find_truth", "rescue_allies", "control_pressure", "control_danger"]);
  assert.deepEqual(objectives.map((objective) => objective.complete), [false, false, false, true, true]);
  assert.equal(objectives.find((objective) => objective.id === "repair_signal").current, 0);
  assert.equal(objectives.find((objective) => objective.id === "rescue_allies").current, 2);

  state.parts = REQUIRED_PARTS;
  addTrace(state, REQUIRED_TRACES_FOR_TRUTH);
  rescueAllyInState(state, "akari");
  rescueAllyInState(state, "shun");
  increaseAreaDanger(state, "hospital", 1);
  objectives = getObjectives(state);

  assert.equal(objectives.find((objective) => objective.id === "repair_signal").complete, true);
  assert.equal(objectives.find((objective) => objective.id === "find_truth").complete, true);
  assert.equal(objectives.find((objective) => objective.id === "rescue_allies").complete, true);
  assert.equal(objectives.find((objective) => objective.id === "control_pressure").complete, true);
  assert.equal(objectives.find((objective) => objective.id === "control_danger").complete, false);
  assert.equal(objectives.find((objective) => objective.id === "control_danger").current, 3);
});

test("buildBarricade spends parts to reduce elevated area danger and raise morale", () => {
  const state = createInitialState();
  state.parts = 2;
  state.morale = 98;
  increaseAreaDanger(state, "market", 3);

  const result = buildBarricade(state, "market");

  assert.deepEqual(result, { ok: true, areaId: "market", before: 6, after: 4, cost: 1 });
  assert.equal(state.parts, 1);
  assert.equal(getAreaDanger(state, "market"), 4);
  assert.equal(state.morale, 100);
});

test("buildBarricade refuses missing parts, missing area, and base danger", () => {
  const state = createInitialState();
  state.parts = 0;

  assert.deepEqual(buildBarricade(state, "school"), { ok: false, reason: "no_parts" });

  state.parts = 1;
  assert.deepEqual(buildBarricade(state, "missing"), { ok: false, reason: "missing_area" });
  assert.deepEqual(buildBarricade(state, "school"), { ok: false, reason: "no_effect", before: 1, after: 1 });
  assert.equal(state.parts, 1);
});

test("applyLoot supports deterministic loot selection for tests", () => {
  const state = createInitialState();

  const result = applyLoot(state, "food", () => 1);

  assert.deepEqual(result, { food: 3 });
  assert.equal(state.food, 8);
});

test("Shun scavenging improves loot from focused supply searches", () => {
  const state = createInitialState();
  rescueAllyInState(state, "shun");

  assert.deepEqual(getScavengeBonus(state, "food"), { food: 1 });
  assert.deepEqual(getScavengeBonus(state, "medicine"), { medicine: 1 });
  assert.deepEqual(getScavengeBonus(state, "parts"), { parts: 1 });

  const foodResult = applyLoot(state, "food", () => 0);
  assert.deepEqual(foodResult, { food: 3 });
  assert.equal(state.food, 8);

  const partsResult = applyLoot(state, "parts", () => 0);
  assert.deepEqual(partsResult, { parts: 2 });
  assert.equal(state.parts, 2);
});

test("Shun scavenging does not apply before rescue", () => {
  const state = createInitialState();

  assert.deepEqual(getScavengeBonus(state, "food"), {});
  assert.deepEqual(applyLoot(state, "food", () => 0), { food: 2 });
});

test("applyMedicineToMember consumes medicine, heals HP, and lowers infection", () => {
  const state = createInitialState();
  state.party[0].hp = 10;
  state.party[0].infection = 20;

  const result = applyMedicineToMember(state, "hero");

  assert.equal(result.ok, true);
  assert.equal(state.medicine, 0);
  assert.deepEqual(result.before, { hp: 10, infection: 20 });
  assert.deepEqual(result.after, { hp: 28, infection: 8 });
  assert.equal(state.party[0].hp, 28);
  assert.equal(state.party[0].infection, 8);
});

test("applyMedicineToMember uses Akari first aid bonuses", () => {
  const state = createInitialState();
  rescueAllyInState(state, "akari");
  state.medicine = 1;
  state.party[0].hp = 5;
  state.party[0].infection = 20;

  const result = applyMedicineToMember(state, "hero");

  assert.equal(result.ok, true);
  assert.deepEqual(result.after, { hp: 27, infection: 6 });
});

test("applyMedicineToMember refuses invalid or unnecessary medicine use", () => {
  const state = createInitialState();

  assert.deepEqual(applyMedicineToMember(state, "missing"), { ok: false, reason: "missing_member" });
  assert.equal(state.medicine, 1);

  const noEffect = applyMedicineToMember(state, "hero");
  assert.equal(noEffect.ok, false);
  assert.equal(noEffect.reason, "no_effect");
  assert.equal(state.medicine, 1);

  state.medicine = 0;
  state.party[0].hp = 1;
  assert.deepEqual(applyMedicineToMember(state, "hero"), { ok: false, reason: "no_medicine" });
});

test("rescueAllyInState adds a new ally only once and raises morale", () => {
  const state = createInitialState();

  const ally = rescueAllyInState(state, "akari");
  const duplicate = rescueAllyInState(state, "akari");

  assert.equal(ally.name, "アカリ");
  assert.equal(duplicate, null);
  assert.deepEqual(state.party.map((member) => member.id), ["hero", "minato", "akari"]);
  assert.equal(state.morale, 65);
});


test("battle tactics alter attack, damage, infection, and escape odds", () => {
  const state = createInitialState();

  assert.equal(getTactic(state), TACTICS.balanced);
  assert.equal(setTactic(state, "missing").ok, false);

  assert.equal(setTactic(state, "cautious").ok, true);
  let preview = calculateBattlePreview(state, "school", "walker");
  assert.equal(preview.tactic.id, "cautious");
  assert.equal(preview.partyAttack, 16);
  assert.equal(preview.totalEnemyDamage, 5);
  assert.equal(preview.infectionGain, 2);
  assert.equal(preview.canDefeatSafely, false);
  assert.equal(getBattleInfectionGain(state, 1), 0);
  assert.equal(getEscapeChance(state, "school"), 0.74);

  setTactic(state, "aggressive");
  preview = calculateBattlePreview(state, "school", "walker");
  assert.equal(preview.tactic.id, "aggressive");
  assert.equal(preview.partyAttack, 22);
  assert.equal(preview.totalEnemyDamage, 5);
  assert.equal(preview.infectionGain, 6);
  assert.equal(preview.canDefeatSafely, true);
  assert.equal(getEscapeChance(state, "school"), 0.56);
});

test("battle preview accounts for party infection, area danger, and morale", () => {
  const state = createInitialState();
  state.morale = 35;
  state.party[0].infection = 70;
  increaseAreaDanger(state, "hospital", 2);

  const preview = calculateBattlePreview(state, "hospital", "brute");

  assert.equal(preview.partyAttack, 16);
  assert.equal(preview.enemyDamage, 14);
  assert.equal(preview.totalEnemyDamage, 20);
  assert.equal(preview.canDefeatSafely, false);
});

test("party damage, infection, and hero failure checks are bounded", () => {
  const state = createInitialState();

  applyPartyDamage(state, 200);
  assert.equal(state.party[0].hp, 0);
  assert.equal(state.party[1].hp, 0);
  assert.equal(getHeroFailureMessage(state), "主人公が倒れた。拠点へ戻る者はいなかった。");

  state.party[0].hp = 1;
  infectPartyMembers(state, 999);
  assert.equal(state.party[0].infection, 100);
  assert.equal(state.party[1].infection, 100);
  assert.equal(getHeroFailureMessage(state), "主人公の旗汚染が限界に達した。意識が旗に塗りつぶされる。");
});

test("traces unlock the investigation ending", () => {
  const state = createInitialState();

  assert.equal(addTrace(state), 1);
  assert.equal(getEnding(state).id, "escape");

  addTrace(state, REQUIRED_TRACES_FOR_TRUTH - state.traces);
  const ending = getEnding(state);

  assert.equal(ending.id, "truth_route");
  assert.match(ending.message, /真相/);
});

test("canSendSignal only succeeds at base with enough parts", () => {
  const state = createInitialState();
  state.parts = REQUIRED_PARTS;

  assert.equal(canSendSignal(state), true);
  state.currentAreaId = "school";
  assert.equal(canSendSignal(state), false);
  state.currentAreaId = null;
  state.gameOver = true;
  assert.equal(canSendSignal(state), false);
});

test("pushLog keeps the log list bounded", () => {
  const state = createInitialState();

  for (let i = 0; i < 100; i += 1) {
    pushLog(state, `log-${i}`);
  }

  assert.equal(state.logs.length, 80);
  assert.equal(state.logs[0], "log-20");
  assert.equal(state.logs.at(-1), "log-99");
});


test("save data serializes and restores campaign progress", () => {
  const state = createInitialState();
  state.day = 3;
  state.timeIndex = 2;
  state.food = 9;
  state.medicine = 2;
  state.parts = 2;
  state.traces = 1;
  setTactic(state, "aggressive");
  setRationPolicy(state, "conserve");
  recordAreaVisit(state, "school");
  completeEvent(state, "locker");
  completeEvent(state, "broadcast");
  state.parts = 1;
  rescueAllyInState(state, "akari");
  completeChapter(state);
  applyGuardDuty(state);
  recordAreaVisit(state, "hospital");
  recordAreaNote(state, "hospital", "items", 2);
  recordAreaNote(state, "hospital", "enemies");
  increaseAreaDanger(state, "hospital", 2);
  completeEvent(state, "ward");
  collectItem(state, "hospital", AREAS.hospital.entities.find((entity) => entity.type === "item" && entity.loot === "medicine"));
  rescueAllyInState(state, "akari");
  state.morale = 72;
  state.party[0].hp = 17;
  state.party[0].infection = 30;
  const areaState = cloneAreaState(AREAS.hospital, state.rescued, getAreaDanger(state, "hospital"), state.completedEvents);
  state.currentAreaId = "hospital";
  state.terrain = areaState.terrain;
  state.layers = areaState.layers;
  state.entities = areaState.entities;
  state.player = { x: 2, y: 3 };
  pushLog(state, "セーブ前のログ");

  const restored = deserializeGameState(serializeGameState(state));

  assert.equal(restored.day, 3);
  assert.equal(restored.timeIndex, 2);
  assert.equal(restored.food, 10);
  assert.equal(restored.medicine, 2);
  assert.equal(restored.parts, 1);
  assert.equal(restored.traces, 1);
  assert.equal(restored.tactic, "aggressive");
  assert.equal(restored.rationPolicy, "conserve");
  assert.equal(restored.completedChapters.has(1), true);
  assert.equal(restored.watchLevel, 1);
  assert.equal(restored.morale, 72);
  assert.equal(restored.currentAreaId, "hospital");
  assert.deepEqual(restored.player, { x: 2, y: 3 });
  assert.equal(restored.areaDanger.hospital, 6);
  assert.equal(restored.areaNotes.hospital.visits, 1);
  assert.equal(restored.areaNotes.hospital.items, 2);
  assert.equal(restored.areaNotes.hospital.enemies, 1);
  assert.equal(restored.rescued.has("akari"), true);
  assert.equal(restored.completedEvents.has("ward"), true);
  assert.equal(restored.collectedItems.size, 1);
  assert.equal(restored.party.find((member) => member.id === "hero").hp, 17);
  assert.equal(restored.party.find((member) => member.id === "hero").infection, 30);
  assert.equal(restored.entities.some((entity) => entity.type === "event" && entity.event === "ward"), false);
  assert.equal(restored.logs.at(-1), "セーブ前のログ");

  const originalDecor = state.layers.decor[1][3];
  restored.terrain[0][0] = ".";
  restored.layers.decor[1][3] = " ";
  assert.equal(state.terrain[0][0], "#", "restored terrain must not share mutable rows with saved state");
  assert.equal(state.layers.decor[1][3], originalDecor, "restored decor layers must not share mutable rows with saved state");
});

test("save data restoration falls back safely for invalid fields", () => {
  const restored = deserializeGameState({
    day: Number.POSITIVE_INFINITY,
    morale: 999,
    currentAreaId: "unknown",
    tactic: "unknown",
    rationPolicy: "unknown",
    watchLevel: 99,
    areaDanger: { school: -10, hospital: 999 },
    party: [{ id: "hero", hp: 999, infection: -5 }, { id: "ghost", hp: 1, infection: 1 }],
    rescued: ["hero", "ghost"],
    completedEvents: ["locker"],
    completedChapters: [1, 99],
  });

  assert.equal(restored.day, 1);
  assert.equal(restored.morale, 100);
  assert.equal(restored.currentAreaId, null);
  assert.equal(restored.tactic, "balanced");
  assert.equal(restored.rationPolicy, "normal");
  assert.equal(restored.watchLevel, 2);
  assert.equal(restored.areaDanger.school, AREAS.school.danger);
  assert.equal(restored.areaDanger.hospital, MAX_AREA_DANGER);
  assert.deepEqual(restored.party.map((member) => member.id), ["hero"]);
  assert.equal(restored.party[0].hp, restored.party[0].maxHp);
  assert.equal(restored.party[0].infection, 0);
  assert.equal(restored.rescued.has("hero"), true);
  assert.equal(restored.rescued.has("ghost"), false);
  assert.equal(restored.completedEvents.has("locker"), true);
  assert.equal(restored.completedChapters.has(1), true);
  assert.equal(restored.completedChapters.has(99), false);
});
