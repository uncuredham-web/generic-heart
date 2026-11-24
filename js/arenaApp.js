import { loadGolemMasterData } from "./data/golemData.js";
import { AI_POLICIES, calculateGolemBuild, simulateBattle } from "./rules/battleRules.js";
import { loadSavedBuilds, showToast } from "./ui/storage.js";

const state = {
  masterData: null,
  fighters: [],
  selectedA: null,
  selectedB: null,
  lastResult: null
};

const els = {
  dataStatus: document.getElementById("data-status"),
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

function buildFighterPool(masterData) {
  const presets = (masterData.presets || []).map((p) => ({
    ...calculateGolemBuild(p, masterData),
    origin: "プリセット"
  }));
  const customs = loadSavedBuilds().map((c) => ({
    ...calculateGolemBuild(c, masterData),
    origin: "カスタム保存"
  }));
  return [...customs, ...presets];
}

function renderStatus(statusInfo) {
  els.dataStatus.textContent = statusInfo.message;
  els.dataStatus.classList.toggle("is-fallback", statusInfo.source !== "sheet");
}

function renderFighterCard(container, fighter, currentHp = null) {
  if (!fighter) {
    container.innerHTML = `<p class="muted">機体を選択してください</p>`;
    return;
  }
  const hp = currentHp !== null ? currentHp : fighter.stats.hp;
  const pct = Math.max(0, Math.min(100, Math.round((hp / fighter.stats.hp) * 100)));
  const isLow = pct <= 30;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <strong>${escapeHtml(fighter.name)}</strong>
      <span class="tag">${fighter.origin}</span>
    </div>
    <div class="muted" style="margin-top:4px;">
      ${AI_POLICIES[fighter.aiPolicy].label} ／ コスト ${fighter.totalCost}
    </div>
    <div class="hp-bar-track">
      <div class="hp-bar-fill ${isLow ? "is-low" : ""}" style="width:${pct}%;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
      <span>HP: ${hp} / ${fighter.stats.hp}</span>
      <span>${pct}%</span>
    </div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-label">攻撃力</div><div class="stat-value">${fighter.stats.atk}</div></div>
      <div class="stat-box"><div class="stat-label">防御力</div><div class="stat-value">${fighter.stats.def}</div></div>
      <div class="stat-box"><div class="stat-label">素早さ</div><div class="stat-value">${fighter.stats.spd}</div></div>
    </div>
  `;
}

function renderSelectOptions() {
  const optionsHtml = state.fighters
    .map((f, idx) => `<option value="${idx}">[${f.origin}] ${escapeHtml(f.name)}</option>`)
    .join("");

  els.selectA.innerHTML = optionsHtml;
  els.selectB.innerHTML = optionsHtml;

  const idxA = Math.max(0, state.fighters.findIndex((f) => f.id === state.selectedA?.id));
  const idxB = Math.max(0, state.fighters.findIndex((f) => f.id === state.selectedB?.id));

  els.selectA.value = String(idxA);
  els.selectB.value = String(idxB === idxA && state.fighters.length > 1 ? 1 : idxB);

  state.selectedA = state.fighters[Number(els.selectA.value)] || null;
  state.selectedB = state.fighters[Number(els.selectB.value)] || null;

  renderFighterCard(els.cardA, state.selectedA);
  renderFighterCard(els.cardB, state.selectedB);
}

function renderBattleResult(result) {
  if (!result) return;

  renderFighterCard(els.cardA, state.selectedA, result.finalHp.a);
  renderFighterCard(els.cardB, state.selectedB, result.finalHp.b);

  els.battleSummary.innerHTML = `
    <div class="log-winner">
      勝敗結果：${result.winnerSide === "DRAW" ? "引き分け" : `${result.winnerSide}「${escapeHtml(result.winnerName)}」の勝利！`}
    </div>
  `;

  els.battleLog.innerHTML = result.logs
    .map((entry) => {
      const cls =
        entry.kind === "crit" ? "log-crit" : entry.kind === "skill" ? "log-skill" : "";
      return `
        <div class="log-entry ${cls}">
          <span class="log-turn">[T${entry.turn}]</span>
          <span>${escapeHtml(entry.text)}</span>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function runBattle() {
  if (!state.selectedA || !state.selectedB) return;
  const result = simulateBattle(state.selectedA, state.selectedB);
  state.lastResult = result;
  renderBattleResult(result);
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
    if (state.fighters.length < 2) return;
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
    state.masterData = res.data;
    state.fighters = buildFighterPool(state.masterData);
    renderStatus(res);
    renderSelectOptions();
    showToast(res.message);
  });
}

async function init() {
  bindEvents();
  const res = await loadGolemMasterData();
  state.masterData = res.data;
  state.fighters = buildFighterPool(state.masterData);
  state.selectedA = state.fighters[0] || null;
  state.selectedB = state.fighters[1] || state.fighters[0] || null;
  renderStatus(res);
  renderSelectOptions();
}

init();
