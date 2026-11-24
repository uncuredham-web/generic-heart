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
  fighter2Id: "",
  lastWinnerSide: null
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

function applyFighterCardWinnerStyle(cardEl, isWinner) {
  const host = cardEl?.closest(".card, .fighter-card, .column-card") || cardEl;
  if (!host) return;
  host.classList.toggle("is-winner-card", Boolean(isWinner));
  if (isWinner) {
    host.style.borderColor = "#34d399";
    host.style.boxShadow = "0 0 0 2px rgba(52, 211, 153, 0.35), 0 10px 24px rgba(16, 185, 129, 0.14)";
    host.style.backgroundColor = "rgba(16, 185, 129, 0.06)";
  } else {
    host.style.borderColor = "";
    host.style.boxShadow = "";
    host.style.backgroundColor = "";
  }
}

function clearBattleView() {
  state.lastWinnerSide = null;
  applyFighterCardWinnerStyle(els.fighter1Card, false);
  applyFighterCardWinnerStyle(els.fighter2Card, false);

  if (els.battleBanner) {
    els.battleBanner.style.display = "none";
    els.battleBanner.innerHTML = "";
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

function renderFighterCard(targetEl, build, isWinner = false) {
  if (!targetEl) return;
  if (!state.masterOk || !state.masterData) {
    targetEl.innerHTML = "";
    applyFighterCardWinnerStyle(targetEl, false);
    return;
  }
  if (!build) {
    targetEl.innerHTML = `<p class="muted">機体が選択されていません。</p>`;
    applyFighterCardWinnerStyle(targetEl, false);
    return;
  }
  const normalizedBuild = {
    ...build,
    tactic: normalizeTactic(build.tactic)
  };
  const st = calcFighterStats(normalizedBuild, state.masterData);
  const eq = st.equipmentSummary;
  const mpRegenLabel = st.mpRegen >= 0 ? `+${st.mpRegen}` : `${st.mpRegen}`;
  const winnerRow = isWinner
    ? `<div style="margin-bottom:6px;"><span class="tag" style="background:#059669;color:#ffffff;border-color:#10b981;">勝利</span></div>`
    : "";

  targetEl.innerHTML = `
    ${winnerRow}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
      <h3 style="margin:0;font-size:1.08rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(st.name)}</h3>
      <span class="tag" style="white-space:nowrap;flex-shrink:0;">${escapeHtml(st.tactic)}</span>
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
      <div class="stat-box">
        <div class="stat-label">最大魔力</div>
        <div class="stat-value">${st.maxMp}</div>
        <div class="stat-sub muted" style="font-size:0.75rem;margin-top:2px;">毎ターン ${escapeHtml(mpRegenLabel)}</div>
      </div>
      <div class="stat-box"><div class="stat-label">移動力</div><div class="stat-value">${st.move}</div></div>
    </div>
  `;

  applyFighterCardWinnerStyle(targetEl, isWinner);
}

function formatLogLineHtml(line) {
  const raw = String(line);
  const parts = raw.split("\n");
  const mainText = parts[0] || "";
  const subText = parts.slice(1).join("\n");

  const extraClass = mainText.startsWith("[T1]")
    ? " is-header"
    : mainText.startsWith("--- ターン")
      ? " is-turn-divider"
      : mainText.startsWith("決着：")
        ? " is-result"
        : "";

  const subHtml = subText
    ? `<span class="log-sub" style="display:block;margin-top:2px;white-space:pre-line;">${escapeHtml(subText)}</span>`
    : "";

  return `<div class="log-line${extraClass}" style="white:normal;line-height:1.55;">${escapeHtml(mainText)}${subHtml}</div>`;
}

function renderBattleResult(result) {
  if (!result) return;

  state.lastWinnerSide = result.winnerSide || null;

  const f1 = state.builds.find((b) => b.id === state.fighter1Id) || state.builds[0];
  const f2 = state.builds.find((b) => b.id === state.fighter2Id) || state.builds[1] || state.builds[0];
  renderFighterCard(els.fighter1Card, f1, state.lastWinnerSide === "fighter1");
  renderFighterCard(els.fighter2Card, f2, state.lastWinnerSide === "fighter2");

  if (els.battleBanner) {
    els.battleBanner.style.display = "block";
    const hasKoDraw = Array.isArray(result.logs) &&
      result.logs.some((l) => String(l).includes("相打ち"));

    const titleText = result.winnerName
      ? `${result.winnerName} の勝利`
      : (hasKoDraw ? "相打ち（引き分け）" : "引き分け");

    const reasonText = result.decisionReason ? escapeHtml(result.decisionReason) : "";

    els.battleBanner.innerHTML = reasonText
      ? `<div style="font-size:1.05rem;font-weight:700;">${escapeHtml(titleText)}</div><div style="font-size:0.88rem;opacity:0.92;margin-top:4px;line-height:1.45;">${reasonText}</div>`
      : `<div style="font-size:1.05rem;font-weight:700;">${escapeHtml(titleText)}</div>`;
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
    renderFighterCard(els.fighter1Card, null, false);
    renderFighterCard(els.fighter2Card, null, false);
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
  renderFighterCard(els.fighter1Card, f1, state.lastWinnerSide === "fighter1");
  renderFighterCard(els.fighter2Card, f2, state.lastWinnerSide === "fighter2");
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
  state.lastWinnerSide = null;
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
    state.lastWinnerSide = null;
    const f1 = state.builds.find((b) => b.id === state.fighter1Id);
    const f2 = state.builds.find((b) => b.id === state.fighter2Id);
    renderFighterCard(els.fighter1Card, f1, false);
    renderFighterCard(els.fighter2Card, f2, false);
  });

  els.fighter2Select?.addEventListener("change", (e) => {
    if (!state.masterOk) return;
    state.fighter2Id = e.target.value;
    state.lastWinnerSide = null;
    const f1 = state.builds.find((b) => b.id === state.fighter1Id);
    const f2 = state.builds.find((b) => b.id === state.fighter2Id);
    renderFighterCard(els.fighter1Card, f1, false);
    renderFighterCard(els.fighter2Card, f2, false);
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