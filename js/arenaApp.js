import { loadGolemMasterData } from "./data/golemData.js";
import { loadSavedBuilds, showToast } from "./ui/storage.js";

const DEFAULT_BUILDS = [
  {
    id: "preset_knight",
    name: "アイアンナイト",
    core: "C02",
    head: "H01",
    rightArm: "A02",
    leftArm: "A01",
    rightWeapon: "W01",
    leftWeapon: "S02",
    rightLeg: "L01",
    leftLeg: "L01",
    tactic: "ガンガン近づけ"
  },
  {
    id: "preset_mage",
    name: "アークメイジ",
    core: "C03",
    head: "H02",
    rightArm: "A01",
    leftArm: "A01",
    rightWeapon: "W05",
    leftWeapon: "W02",
    rightLeg: "L02",
    leftLeg: "L02",
    tactic: "距離をとって戦え"
  },
  {
    id: "preset_twin",
    name: "ツインファング",
    core: "C01",
    head: "H02",
    rightArm: "A02",
    leftArm: "A02",
    rightWeapon: "W01",
    leftWeapon: "W01",
    rightLeg: "L02",
    leftLeg: "L02",
    tactic: "ガンガン近づけ"
  }
];

const state = {
  masterData: null,
  masterOk: false,
  builds: [],
  fighter1Id: "",
  fighter2Id: ""
};

const els = {
  dataStatus: document.getElementById("data-status"),
  masterError: document.getElementById("master-error"),
  reloadDataBtn: document.getElementById("reload-data-btn"),
  fighter1Select: document.getElementById("fighter1-select"),
  fighter2Select: document.getElementById("fighter2-select"),
  fighter1Card: document.getElementById("fighter1-card"),
  fighter2Card: document.getElementById("fighter2-card"),
  startBattleBtn: document.getElementById("start-battle-btn"),
  randomBattleBtn: document.getElementById("random-battle-btn"),
  battleBanner: document.getElementById("battle-banner"),
  battleLog: document.getElementById("battle-log")
};

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderStatus(statusInfo) {
  els.dataStatus.textContent = statusInfo.message;
  els.dataStatus.classList.toggle("is-fallback", !statusInfo.ok);
  if (!statusInfo.ok) {
    els.masterError.style.display = "block";
    els.masterError.textContent = statusInfo.message;
  } else {
    els.masterError.style.display = "none";
    els.masterError.textContent = "";
  }
}

function getAllBuilds() {
  const saved = loadSavedBuilds() || [];
  return [...saved, ...DEFAULT_BUILDS];
}

function calcFighterStats(build) {
  const byId = state.masterData?.byId || {};
  const core = byId[build.core] || { name: "未選択", hp: 250, maxMp: 100, mpRegen: 15, baseCost: 0 };
  const head = byId[build.head] || { name: "未選択", baseCost: 0, acc: 0 };
  const rArm = byId[build.rightArm] || { name: "未選択", baseCost: 0, acc: 0 };
  const lArm = byId[build.leftArm] || { name: "未選択", baseCost: 0, acc: 0 };
  const rLeg = byId[build.rightLeg] || { name: "未選択", move: 1, baseCost: 0, slot: "片脚" };
  const lLeg = byId[build.leftLeg] || { name: "未選択", move: 1, baseCost: 0, slot: "片脚" };
  const rWeap = byId[build.rightWeapon] || null;
  const lWeap = byId[build.leftWeapon] || null;

  const isDualLeg = String(rLeg.slot || "").includes("両脚");
  const isDualArm = String(rArm.slot || "").includes("両腕");
  const isDualWeapon = Boolean(rWeap && String(rWeap.slot || "").includes("両手"));

  const activeParts = [core, head, rArm];
  if (!isDualArm && build.leftArm) activeParts.push(lArm);
  activeParts.push(rLeg);
  if (!isDualLeg && build.leftLeg) activeParts.push(lLeg);
  if (rWeap) activeParts.push(rWeap);
  if (!isDualWeapon && lWeap) activeParts.push(lWeap);

  const baseCost = activeParts.reduce((sum, p) => sum + (p.baseCost || 0), 0);
  const mpRegen = (core.mpRegen || 0) - baseCost;
  const move = isDualLeg ? (rLeg.move || 1) : (rLeg.move || 1) + (lLeg.move || 1);
  const accBonus = [head, rArm, lArm, rWeap, lWeap]
    .filter(Boolean)
    .reduce((sum, p) => sum + (p.acc || 0), 0);

  const handWeapons = [];
  if (rWeap && (rWeap.power || 0) > 0) {
    handWeapons.push({ ...rWeap, hand: isDualWeapon ? "両手" : "右手" });
  }
  if (!isDualWeapon && lWeap && (lWeap.power || 0) > 0) {
    handWeapons.push({ ...lWeap, hand: "左手" });
  }

  const builtinWeapons = [];
  [core, head, rArm, lArm].forEach((p, idx) => {
    if ((p.power || 0) > 0) {
      builtinWeapons.push({ ...p, hand: `内蔵${idx + 1}` });
    }
  });

  const isDualWield = !isDualWeapon && Boolean(rWeap && lWeap && (rWeap.power || 0) > 0 && (lWeap.power || 0) > 0);

  return {
    name: build.name || "名称未設定ゴーレム",
    tactic: build.tactic || "バランスよく戦え",
    hp: core.hp || 250,
    maxHp: core.hp || 250,
    mp: core.maxMp || 100,
    maxMp: core.maxMp || 100,
    mpRegen,
    move,
    accBonus,
    handWeapons,
    builtinWeapons,
    isDualWield,
    equipmentSummary: {
      core: core.name || "なし",
      head: head.name || "なし",
      rightArm: rArm.name || "なし",
      leftArm: isDualArm ? `${rArm.name}（両腕占有）` : (lArm.name || "なし"),
      leg: isDualLeg
        ? `${rLeg.name}（両脚占有）`
        : `${rLeg.name || "なし"} / ${lLeg.name || "なし"}`,
      rightWeapon: rWeap ? rWeap.name : "なし",
      leftWeapon: isDualWeapon
        ? `${rWeap.name}（両手占有）`
        : (lWeap ? lWeap.name : "なし")
    }
  };
}

function renderFighterCard(targetEl, build) {
  if (!targetEl) return;
  if (!build) {
    targetEl.innerHTML = `<p class="muted">機体が選択されていません。</p>`;
    return;
  }
  const st = calcFighterStats(build);
  const eq = st.equipmentSummary;
  targetEl.innerHTML = `
    <div class="preview-header">
      <h3 class="preview-name">${escapeHtml(st.name)}</h3>
      <span class="tag">${escapeHtml(st.tactic)}</span>
    </div>
    <p class="muted" style="margin:0 0 8px;">さくせん: ${escapeHtml(st.tactic)}</p>
    <div class="equip-summary muted">
      <div class="equip-row">胴体: ${escapeHtml(eq.core)} / 頭部: ${escapeHtml(eq.head)}</div>
      <div class="equip-row">右腕: ${escapeHtml(eq.rightArm)} / 左腕: ${escapeHtml(eq.leftArm)}</div>
      <div class="equip-row">脚部: ${escapeHtml(eq.leg)}</div>
      <div class="equip-row">右手: ${escapeHtml(eq.rightWeapon)} / 左手: ${escapeHtml(eq.leftWeapon)}</div>
    </div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-label">胴体耐久</div><div class="stat-value">${st.hp}</div></div>
      <div class="stat-box"><div class="stat-label">最大魔力</div><div class="stat-value">${st.mp}</div></div>
      <div class="stat-box"><div class="stat-label">移動力</div><div class="stat-value">${st.move}</div></div>
    </div>
  `;
}

function selectAttackQueue(fighter, distance) {
  const handCandidates = (fighter.handWeapons || []).filter(
    (w) => (w.power || 0) > 0 && distance <= (w.range || 1)
  );

  if (handCandidates.length > 0) {
    const affordable = handCandidates.filter((w) => (w.useCost || 0) <= fighter.mp);
    if (affordable.length > 0) {
      if (fighter.tactic === "省エネ・粘り強く戦え") {
        return [[...affordable].sort((a, b) => (a.useCost || 0) - (b.useCost || 0))[0]];
      }
      return affordable;
    }
    return [];
  }

  const builtinInRange = (fighter.builtinWeapons || []).filter(
    (w) => (w.power || 0) > 0 && distance <= (w.range || 1) && (w.useCost || 0) <= fighter.mp
  );
  if (builtinInRange.length > 0) {
    return [[...builtinInRange].sort((a, b) => (b.power || 0) - (a.power || 0))[0]];
  }

  return [];
}

function executeSingleAttack(actor, defender, weapon, logs) {
  const cost = weapon.useCost || 0;
  actor.mp = Math.max(0, actor.mp - cost);
  const hitChance = Math.max(25, Math.min(98, 80 + (actor.accBonus || 0) + (weapon.acc || 0)));
  const roll = Math.random() * 100;
  const handPrefix = weapon.hand && !String(weapon.hand).startsWith("内蔵") ? `[${weapon.hand}] ` : "";

  if (roll > hitChance) {
    logs.push(`・${actor.name} の${handPrefix}「${weapon.name}」は外れた！（消費MP:${cost} / 残MP:${actor.mp}）`);
    return;
  }

  const dmg = Math.max(1, weapon.power || 10);
  defender.hp = Math.max(0, defender.hp - dmg);
  logs.push(
    `・${actor.name} が${handPrefix}「${weapon.name}」で攻撃！ ${defender.name} に ${dmg} ダメージ（消費MP:${cost} / 残MP:${actor.mp} / 相手耐久:${defender.hp}）`
  );

  if (defender.hp <= 0) {
    logs.push(`・${defender.name} の耐久が 0 になった！`);
  }
}

function runAutoBattle(build1, build2) {
  const f1 = calcFighterStats(build1);
  const f2 = calcFighterStats(build2);
  let distance = 4;
  const logs = [];
  const maxTurns = 30;

  logs.push(`[T1] ${f1.name} (耐久:${f1.hp} / 魔力:${f1.mp}) vs ${f2.name} (耐久:${f2.hp} / 魔力:${f2.mp})`);

  for (let turn = 1; turn <= maxTurns; turn += 1) {
    if (turn > 1) {
      logs.push(`--- ターン ${turn}（距離:${distance}）---`);
    }

    for (const [actor, defender] of [
      [f1, f2],
      [f2, f1]
    ]) {
      if (actor.hp <= 0 || defender.hp <= 0) break;

      actor.mp = Math.min(actor.maxMp, actor.mp + actor.mpRegen);

      const moveStep = Math.max(1, actor.move || 1);
      if (actor.tactic === "距離をとって戦え") {
        if (distance < 3) {
          distance += moveStep;
          logs.push(`・${actor.name} は距離をとって後退（距離:${distance} / 魔力:${actor.mp}）`);
        }
      } else if (distance > 1) {
        const nextDist = Math.max(1, distance - moveStep);
        if (nextDist !== distance) {
          distance = nextDist;
          logs.push(`・${actor.name} が接近（距離:${distance} / 魔力:${actor.mp}）`);
        }
      }

      const attacks = selectAttackQueue(actor, distance);
      if (attacks.length === 0) {
        logs.push(`・${actor.name} は攻撃できる武器がないか魔力不足のため待機（魔力:${actor.mp}）`);
        continue;
      }

      for (const weapon of attacks) {
        if (defender.hp <= 0) break;
        if ((weapon.useCost || 0) > actor.mp) {
          logs.push(`・${actor.name} は魔力不足で「${weapon.name}」の追撃を見送った（残MP:${actor.mp}）`);
          break;
        }
        executeSingleAttack(actor, defender, weapon, logs);
      }

      if (defender.hp <= 0) break;
    }

    if (f1.hp <= 0 || f2.hp <= 0) break;
  }

  let winnerName = null;
  if (f1.hp > 0 && f2.hp <= 0) {
    winnerName = f1.name;
  } else if (f2.hp > 0 && f1.hp <= 0) {
    winnerName = f2.name;
  } else if (f1.hp !== f2.hp) {
    winnerName = f1.hp > f2.hp ? f1.name : f2.name;
  }

  logs.push(winnerName ? `決着：${winnerName} の勝利！` : "決着：規定ターン終了（引き分け）");
  return { winnerName, logs };
}

function renderBattleResult(result) {
  if (!result) return;

  if (els.battleBanner) {
    els.battleBanner.style.display = "block";
    els.battleBanner.textContent = result.winnerName
      ? `${result.winnerName} の勝利`
      : "引き分け";
  }

  if (els.battleLog) {
    els.battleLog.style.display = "block";
    const lines = Array.isArray(result.logs) ? result.logs : [];
    els.battleLog.innerHTML = lines
      .map((line) => `<div class="log-line">${escapeHtml(line)}</div>`)
      .join("");
    els.battleLog.scrollTop = 0;
  }
}

function syncBuildSelectors() {
  state.builds = getAllBuilds();
  if (!state.fighter1Id && state.builds[0]) state.fighter1Id = state.builds[0].id;
  if (!state.fighter2Id && state.builds[1]) state.fighter2Id = state.builds[1].id;
  if (!state.fighter2Id && state.builds[0]) state.fighter2Id = state.builds[0].id;

  const optionsHtml = state.builds
    .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name || "名称未設定ゴーレム")}</option>`)
    .join("");

  if (els.fighter1Select) {
    els.fighter1Select.innerHTML = optionsHtml;
    els.fighter1Select.value = state.fighter1Id;
  }
  if (els.fighter2Select) {
    els.fighter2Select.innerHTML = optionsHtml;
    els.fighter2Select.value = state.fighter2Id;
  }

  const f1 = state.builds.find((b) => b.id === state.fighter1Id) || state.builds[0];
  const f2 = state.builds.find((b) => b.id === state.fighter2Id) || state.builds[1] || state.builds[0];
  renderFighterCard(els.fighter1Card, f1);
  renderFighterCard(els.fighter2Card, f2);
}

function handleStartBattle() {
  if (!state.masterOk) return;
  const f1 = state.builds.find((b) => b.id === state.fighter1Id) || state.builds[0];
  const f2 = state.builds.find((b) => b.id === state.fighter2Id) || state.builds[1] || state.builds[0];
  if (!f1 || !f2) return;
  const result = runAutoBattle(f1, f2);
  renderBattleResult(result);
}

function handleRandomBattle() {
  if (!state.masterOk || state.builds.length === 0) return;
  const idx1 = Math.floor(Math.random() * state.builds.length);
  let idx2 = Math.floor(Math.random() * state.builds.length);
  if (state.builds.length > 1 && idx2 === idx1) {
    idx2 = (idx1 + 1) % state.builds.length;
  }
  state.fighter1Id = state.builds[idx1].id;
  state.fighter2Id = state.builds[idx2].id;
  syncBuildSelectors();
  handleStartBattle();
}

async function applyMasterLoadResult(res) {
  state.masterData = res.data;
  state.masterOk = Boolean(res.ok);
  renderStatus(res);
  if (els.startBattleBtn) els.startBattleBtn.disabled = !state.masterOk;
  if (els.randomBattleBtn) els.randomBattleBtn.disabled = !state.masterOk;
  syncBuildSelectors();
}

function bindEvents() {
  els.fighter1Select?.addEventListener("change", (e) => {
    state.fighter1Id = e.target.value;
    const f1 = state.builds.find((b) => b.id === state.fighter1Id);
    renderFighterCard(els.fighter1Card, f1);
  });

  els.fighter2Select?.addEventListener("change", (e) => {
    state.fighter2Id = e.target.value;
    const f2 = state.builds.find((b) => b.id === state.fighter2Id);
    renderFighterCard(els.fighter2Card, f2);
  });

  els.startBattleBtn?.addEventListener("click", handleStartBattle);
  els.randomBattleBtn?.addEventListener("click", handleRandomBattle);

  els.reloadDataBtn?.addEventListener("click", async () => {
    const res = await loadGolemMasterData();
    await applyMasterLoadResult(res);
    showToast(res.message);
  });
}

async function init() {
  bindEvents();
  const res = await loadGolemMasterData();
  await applyMasterLoadResult(res);
}

init();