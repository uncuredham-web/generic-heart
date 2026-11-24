import { loadGolemMasterData } from "./data/golemData.js";
import { loadSavedBuilds, showToast } from "./ui/storage.js";
import { calcFighterStats, runAutoBattle } from "./rules/battleRules.js";

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

function renderFighterCard(targetEl, build) {
  if (!targetEl) return;
  if (!state.masterOk || !state.masterData) {
    targetEl.innerHTML = "";
    return;
  }
  if (!build) {
    targetEl.innerHTML = `<p class="muted">機体が選択されていません。</p>`;
    return;
  }
  const st = calcFighterStats(build, state.masterData);
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
  if (!state.masterOk || !state.masterData) {
    if (els.fighter1Select) els.fighter1Select.innerHTML = "";
    if (els.fighter2Select) els.fighter2Select.innerHTML = "";
    renderFighterCard(els.fighter1Card, null);
    renderFighterCard(els.fighter2Card, null);
    return;
  }

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
  if (!state.masterOk || !state.masterData) return;
  const f1 = state.builds.find((b) => b.id === state.fighter1Id) || state.builds[0];
  const f2 = state.builds.find((b) => b.id === state.fighter2Id) || state.builds[1] || state.builds[0];
  if (!f1 || !f2) return;
  const result = runAutoBattle(f1, f2, state.masterData);
  renderBattleResult(result);
}

function handleRandomBattle() {
  if (!state.masterOk || !state.masterData || state.builds.length === 0) return;
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