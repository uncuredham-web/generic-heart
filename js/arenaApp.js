import {
  loadGolemMasterData,
  TACTIC_OPTIONS,
  DEFAULT_TACTIC,
  PRESET_BUILDS
} from "./data/golemData.js";
import { loadSavedBuilds, showToast } from "./ui/storage.js";
import { calcFighterStats, runAutoBattle } from "./rules/battleRules.js";

const TACTICS = Array.isArray(TACTIC_OPTIONS) && TACTIC_OPTIONS.length > 0
  ? TACTIC_OPTIONS
  : [
      "精密狙撃で仕留めろ",
      "確実に当てて押し切れ",
      "間合いを制して翻弄せよ",
      "しぶとく生き残れ",
      "全力で薙ぎ払え"
    ];

const LEGACY_TACTIC_MAP = {
  "ガンガン近づけ": "確実に当てて押し切れ",
  "バランスよく戦え": "確実に当てて押し切れ",
  "距離をとって戦え": "間合いを制して翻弄せよ",
  "省エネ・粘り強く戦え": "しぶとく生き残れ"
};

function normalizeTactic(tactic) {
  if (TACTICS.includes(tactic)) return tactic;
  if (tactic && LEGACY_TACTIC_MAP[tactic] && TACTICS.includes(LEGACY_TACTIC_MAP[tactic])) {
    return LEGACY_TACTIC_MAP[tactic];
  }
  return DEFAULT_TACTIC && TACTICS.includes(DEFAULT_TACTIC) ? DEFAULT_TACTIC : TACTICS[0];
}

const FALLBACK_BUILDS = [
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
    tactic: "確実に当てて押し切れ"
  },
  {
    id: "preset_mage",
    name: "アークメイジ",
    core: "C03",
    head: "H02",
    rightArm: "A01",
    leftArm: "A01",
    rightWeapon: "W06",
    leftWeapon: "W05",
    rightLeg: "L02",
    leftLeg: "L02",
    tactic: "間合いを制して翻弄せよ"
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
    tactic: "全力で薙ぎ払え"
  }
];

function getDefaultBuilds() {
  const source = Array.isArray(PRESET_BUILDS) && PRESET_BUILDS.length > 0
    ? PRESET_BUILDS
    : FALLBACK_BUILDS;

  return source.map((p, idx) => ({
    id: p.id || `preset_${idx + 1}`,
    name: p.golemName || p.name || `プリセット機体${idx + 1}`,
    core: p.core || "",
    head: p.head || "",
    rightArm: p.rightArm || "",
    leftArm: p.leftArm || "",
    rightWeapon: p.rightWeapon || "",
    leftWeapon: p.leftWeapon || "",
    rightLeg: p.rightLeg || "",
    leftLeg: p.leftLeg || "",
    tactic: normalizeTactic(p.tactic)
  }));
}

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

function setArenaControlsLocked(locked) {
  if (els.fighter1Select) els.fighter1Select.disabled = locked;
  if (els.fighter2Select) els.fighter2Select.disabled = locked;
  if (els.startBattleBtn) els.startBattleBtn.disabled = locked;
  if (els.randomBattleBtn) els.randomBattleBtn.disabled = locked;
}

function clearBattleView() {
  if (els.battleBanner) {
    els.battleBanner.style.display = "none";
    els.battleBanner.textContent = "";
  }
  if (els.battleLog) {
    els.battleLog.style.display = "none";
    els.battleLog.innerHTML = "";
  }
}

function renderStatus(statusInfo) {
  if (els.dataStatus) {
    els.dataStatus.textContent = statusInfo.message;
    els.dataStatus.classList.toggle("is-fallback", !statusInfo.ok);
  }
  if (els.masterError) {
    if (!statusInfo.ok) {
      els.masterError.style.display = "block";
      els.masterError.textContent = statusInfo.message;
    } else {
      els.masterError.style.display = "none";
      els.masterError.textContent = "";
    }
  }
}

function getAllBuilds() {
  const savedRaw = Array.isArray(loadSavedBuilds()) ? loadSavedBuilds() : [];
  const saved = savedRaw.map((b) => ({
    ...b,
    tactic: normalizeTactic(b.tactic)
  }));
  const defaults = getDefaultBuilds();

  const seenIds = new Set(saved.map((b) => String(b.id || "")).filter(Boolean));
  const seenNames = new Set(
    saved.map((b) => String(b.name || "").trim()).filter(Boolean)
  );

  const merged = [...saved];
  for (const preset of defaults) {
    const pId = String(preset.id || "");
    const pName = String(preset.name || "").trim();
    if (seenIds.has(pId) || seenNames.has(pName)) continue;
    merged.push(preset);
    if (pId) seenIds.add(pId);
    if (pName) seenNames.add(pName);
  }
  return merged;
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
  const normalizedBuild = {
    ...build,
    tactic: normalizeTactic(build.tactic)
  };
  const st = calcFighterStats(normalizedBuild, state.masterData);
  const eq = st.equipmentSummary;
  const mpRegenLabel = st.mpRegen >= 0 ? `+${st.mpRegen}` : `${st.mpRegen}`;

  targetEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
      <h3 style="margin:0;font-size:1.1rem;">${escapeHtml(st.name)}</h3>
      <span class="tag">${escapeHtml(st.tactic)}</span>
    </div>
    <div class="equip-summary muted">
      <div class="equip-row"><strong>胴体:</strong> ${escapeHtml(eq.core)}</div>
      <div class="equip-row"><strong>頭部:</strong> ${escapeHtml(eq.head)}</div>
      <div class="equip-row"><strong>右腕:</strong> ${escapeHtml(eq.rightArm)}</div>
      <div class="equip-row"><strong>左腕:</strong> ${escapeHtml(eq.leftArm)}</div>
      <div class="equip-row"><strong>脚部:</strong> ${escapeHtml(eq.leg)}</div>
      <div class="equip-row"><strong>右手:</strong> ${escapeHtml(eq.rightWeapon)}</div>
      <div class="equip-row"><strong>左手:</strong> ${escapeHtml(eq.leftWeapon)}</div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(3, minmax(0, 1fr));">
      <div class="stat-box"><div class="stat-label">胴体耐久</div><div class="stat-value">${st.hp}</div></div>
      <div class="stat-box"><div class="stat-label">最大魔力</div><div class="stat-value">${st.maxMp}</div></div>
      <div class="stat-box"><div class="stat-label">移動力（回復${mpRegenLabel}）</div><div class="stat-value">${st.move}</div></div>
    </div>
  `;
}

function formatLogLineHtml(line) {
  const text = String(line);
  if (text.startsWith("[T1]")) {
    return `<div class="log-line is-header">${escapeHtml(text)}</div>`;
  }
  if (text.startsWith("--- ターン")) {
    return `<div class="log-line is-turn-divider">${escapeHtml(text)}</div>`;
  }
  if (text.startsWith("決着：")) {
    return `<div class="log-line is-result">${escapeHtml(text)}</div>`;
  }

  const parenIdx = text.indexOf("（");
  if (parenIdx > 0 && text.endsWith("）")) {
    const mainPart = text.slice(0, parenIdx).trim();
    const metaPart = text.slice(parenIdx);
    return `<div class="log-line">${escapeHtml(mainPart)}<span class="log-sub">${escapeHtml(metaPart)}</span></div>`;
  }

  return `<div class="log-line">${escapeHtml(text)}</div>`;
}

function renderBattleResult(result) {
  if (!result) return;

  if (els.battleBanner) {
    els.battleBanner.style.display = "block";
    if (result.winnerName) {
      els.battleBanner.textContent = `${result.winnerName} の勝利`;
    } else {
      const hasKoDraw = Array.isArray(result.logs) &&
        result.logs.some((l) => String(l).includes("相打ち"));
      els.battleBanner.textContent = hasKoDraw ? "相打ち（引き分け）" : "引き分け";
    }
  }

  if (els.battleLog) {
    els.battleLog.style.display = "block";
    const lines = Array.isArray(result.logs) ? result.logs : [];
    els.battleLog.innerHTML = lines.map(formatLogLineHtml).join("");
  }
}

function syncBuildSelectors() {
  if (!state.masterOk || !state.masterData) {
    if (els.fighter1Select) els.fighter1Select.innerHTML = "";
    if (els.fighter2Select) els.fighter2Select.innerHTML = "";
    renderFighterCard(els.fighter1Card, null);
    renderFighterCard(els.fighter2Card, null);
    clearBattleView();
    setArenaControlsLocked(true);
    return;
  }

  setArenaControlsLocked(false);
  state.builds = getAllBuilds();
  if (!state.builds.some((b) => b.id === state.fighter1Id)) {
    state.fighter1Id = state.builds[0]?.id || "";
  }
  if (!state.builds.some((b) => b.id === state.fighter2Id)) {
    state.fighter2Id = state.builds[1]?.id || state.builds[0]?.id || "";
  }

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
  syncBuildSelectors();
}

function bindEvents() {
  els.fighter1Select?.addEventListener("change", (e) => {
    if (!state.masterOk) return;
    state.fighter1Id = e.target.value;
    const f1 = state.builds.find((b) => b.id === state.fighter1Id);
    renderFighterCard(els.fighter1Card, f1);
  });

  els.fighter2Select?.addEventListener("change", (e) => {
    if (!state.masterOk) return;
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

  window.addEventListener("offline", async () => {
    const res = await loadGolemMasterData();
    await applyMasterLoadResult(res);
  });

  window.addEventListener("storage", () => {
    syncBuildSelectors();
  });

  window.addEventListener("focus", () => {
    syncBuildSelectors();
  });
}

async function init() {
  setArenaControlsLocked(true);
  bindEvents();
  const res = await loadGolemMasterData();
  await applyMasterLoadResult(res);
}

init();