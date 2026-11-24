import { loadGolemMasterData } from "./data/golemData.js";
import { loadSavedBuilds, showToast } from "./ui/storage.js";

const state = {
  masterData: null,
  masterOk: false,
  fighters: [],
  selectedA: null,
  selectedB: null
};

const els = {
  dataStatus: document.getElementById("data-status"),
  masterError: document.getElementById("master-error"),
  reloadDataBtn: document.getElementById("reload-data-btn"),
  selectA: document.getElementById("fighter-a-select"),
  selectB: document.getElementById("fighter-b-select"),
  cardA: document.getElementById("fighter-a-card"),
  cardB: document.getElementById("fighter-b-card"),
  startBattleBtn: document.getElementById("start-battle-btn"),
  randomMatchBtn: document.getElementById("random-match-btn"),
  battleSummary: document.getElementById("battle-summary"),
  battleLog: document.getElementById("battle-log")
};

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

function clearBlankArena(message = "") {
  state.fighters = [];
  state.selectedA = null;
  state.selectedB = null;
  els.selectA.innerHTML = "";
  els.selectB.innerHTML = "";
  els.cardA.innerHTML = "";
  els.cardB.innerHTML = "";
  els.battleSummary.innerHTML = "";
  els.battleLog.textContent = message;
  els.startBattleBtn.disabled = true;
  els.randomMatchBtn.disabled = true;
}

function summarizeFighter(build, byId) {
  const core = byId[build.core];
  const rLeg = byId[build.rightLeg];
  const lLeg = byId[build.leftLeg];
  const isDualLeg = rLeg?.slot === "両脚占有";
  const move = rLeg ? (isDualLeg ? (rLeg.move || 0) : (rLeg.move || 0) + (lLeg?.move || 0)) : 0;
  return {
    name: build.name || "名称未設定ゴーレム",
    hp: core?.hp || 0,
    maxMp: core?.maxMp || 0,
    move,
    tactic: build.tactic || "バランスよく戦え"
  };
}

function renderFighterCard(container, fighter) {
  if (!fighter) {
    container.innerHTML = "";
    return;
  }
  const spec = summarizeFighter(fighter, state.masterData.byId);
  container.innerHTML = `
    <div><strong>${escapeHtml(spec.name)}</strong></div>
    <div class="muted" style="margin-top:4px;">さくせん: ${escapeHtml(spec.tactic)}</div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-label">胴体耐久</div><div class="stat-value">${spec.hp}</div></div>
      <div class="stat-box"><div class="stat-label">最大魔力</div><div class="stat-value">${spec.maxMp}</div></div>
      <div class="stat-box"><div class="stat-label">移動力</div><div class="stat-value">${spec.move}</div></div>
    </div>
  `;
}

function renderSelectOptions() {
  const optionsHtml = state.fighters
    .map((f, idx) => `<option value="${idx}">${escapeHtml(f.name || "名称未設定ゴーレム")}</option>`)
    .join("");
  els.selectA.innerHTML = optionsHtml;
  els.selectB.innerHTML = optionsHtml;
  els.selectA.value = "0";
  els.selectB.value = state.fighters.length > 1 ? "1" : "0";
  state.selectedA = state.fighters[Number(els.selectA.value)] || null;
  state.selectedB = state.fighters[Number(els.selectB.value)] || null;
  renderFighterCard(els.cardA, state.selectedA);
  renderFighterCard(els.cardB, state.selectedB);
  els.startBattleBtn.disabled = !(state.selectedA && state.selectedB);
  els.randomMatchBtn.disabled = state.fighters.length < 2;
}

function runBattle() {
  if (!state.masterOk || !state.selectedA || !state.selectedB) return;
  const a = summarizeFighter(state.selectedA, state.masterData.byId);
  const b = summarizeFighter(state.selectedB, state.masterData.byId);
  const scoreA = a.hp + a.maxMp;
  const scoreB = b.hp + b.maxMp;
  const winnerText = scoreA === scoreB ? "引き分け" : scoreA > scoreB ? `${a.name} の勝利` : `${b.name} の勝利`;
  els.battleSummary.innerHTML = `<div class="log-winner">${escapeHtml(winnerText)}</div>`;
  els.battleLog.innerHTML = `
    <div class="log-entry"><span class="log-turn">[T1]</span>${escapeHtml(a.name)} (耐久:${a.hp} / 魔力:${a.maxMp}) vs ${escapeHtml(b.name)} (耐久:${b.hp} / 魔力:${b.maxMp})</div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function applyMasterLoadResult(res) {
  state.masterData = res.data;
  state.masterOk = Boolean(res.ok);
  renderStatus(res);
  if (!state.masterOk) {
    clearBlankArena(res.message);
    return;
  }
  state.fighters = loadSavedBuilds();
  if (state.fighters.length === 0) {
    clearBlankArena("保存済み機体がありません。ビルダーで機体を作成・保存してください。");
    return;
  }
  renderSelectOptions();
}

function bindEvents() {
  els.selectA.addEventListener("change", () => {
    state.selectedA = state.fighters[Number(els.selectA.value)] || null;
    renderFighterCard(els.cardA, state.selectedA);
  });
  els.selectB.addEventListener("change", () => {
    state.selectedB = state.fighters[Number(els.selectB.value)] || null;
    renderFighterCard(els.cardB, state.selectedB);
  });
  els.startBattleBtn.addEventListener("click", runBattle);
  els.randomMatchBtn.addEventListener("click", () => {
    if (!state.masterOk || state.fighters.length < 2) return;
    const idxA = Math.floor(Math.random() * state.fighters.length);
    let idxB = Math.floor(Math.random() * (state.fighters.length - 1));
    if (idxB >= idxA) idxB += 1;
    els.selectA.value = String(idxA);
    els.selectB.value = String(idxB);
    state.selectedA = state.fighters[idxA];
    state.selectedB = state.fighters[idxB];
    runBattle();
  });
  els.reloadDataBtn.addEventListener("click", async () => {
    const res = await loadGolemMasterData();
    await applyMasterLoadResult(res);
    showToast(res.message);
  });
  window.addEventListener("offline", async () => {
    const res = await loadGolemMasterData();
    await applyMasterLoadResult(res);
  });
}

async function init() {
  bindEvents();
  const res = await loadGolemMasterData();
  await applyMasterLoadResult(res);
}

init();