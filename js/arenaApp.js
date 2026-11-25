import {
  loadGolemMasterData,
  TACTIC_OPTIONS,
  DEFAULT_TACTIC,
  PRESET_BUILDS,
  BUDGET_LIMIT_GOLD,
  toFiniteNumber
} from "./data/golemData.js";
import { loadSavedBuilds, showToast } from "./ui/storage.js";
import {
  calcFighterStats,
  runAutoBattle,
  isDualArmPart,
  isDualWeaponPart,
  isDualLegPart
} from "./rules/battleRules.js";

export const RARITY_LIMITS = {
  legendMax: 1,
  rareMax: 2
};

export const BUDGET_LIMIT = BUDGET_LIMIT_GOLD || 1000;

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
    id: "preset_iron_knight",
    name: "アイアンナイト",
    golemName: "アイアンナイト",
    core: "C02",
    head: "H01",
    rightArm: "A02",
    leftArm: "A01",
    rightLeg: "L01",
    leftLeg: "L01",
    rightWeapon: "W01",
    leftWeapon: "S02",
    tactic: "確実に当てて押し切れ"
  },
  {
    id: "preset_bronze_hammer",
    name: "ブロンズハンマー",
    golemName: "ブロンズハンマー",
    core: "C02",
    head: "H02",
    rightArm: "A02",
    leftArm: "A02",
    rightLeg: "L01",
    leftLeg: "L01",
    rightWeapon: "W03",
    leftWeapon: "",
    tactic: "確実に当てて押し切れ"
  },
  {
    id: "preset_mana_spear",
    name: "マナスピアシューター",
    golemName: "マナスピアシューター",
    core: "C03",
    head: "H02",
    rightArm: "A01",
    leftArm: "A01",
    rightLeg: "L02",
    leftLeg: "L02",
    rightWeapon: "W06",
    leftWeapon: "W02",
    tactic: "間合いを制して翻弄せよ"
  },
  {
    id: "preset_crystal_mage",
    name: "クリスタルメイジ",
    golemName: "クリスタルメイジ",
    core: "C03",
    head: "H01",
    rightArm: "A01",
    leftArm: "A02",
    rightLeg: "L02",
    leftLeg: "L01",
    rightWeapon: "W05",
    leftWeapon: "S01",
    tactic: "間合いを制して翻弄せよ"
  },
  {
    id: "preset_wind_duelist",
    name: "ウィンドデュエリスト",
    golemName: "ウィンドデュエリスト",
    core: "C01",
    head: "H02",
    rightArm: "A01",
    leftArm: "A01",
    rightLeg: "L02",
    leftLeg: "L02",
    rightWeapon: "W01",
    leftWeapon: "W06",
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
  startBattle10Btn: document.getElementById("start-battle-10-btn"),
  randomBattleBtn: document.getElementById("random-battle-btn"),
  randomBattle10Btn: document.getElementById("random-battle-10-btn"),
  battleBanner: document.getElementById("battle-banner"),
  battleLog: document.getElementById("battle-log")
};

const BATTLE_BUTTONS = [
  els.startBattleBtn,
  els.startBattle10Btn,
  els.randomBattleBtn,
  els.randomBattle10Btn
].filter(Boolean);

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatGold(amount) {
  const n = Math.max(0, Math.round(toFiniteNumber(amount, 0)));
  return `${n.toLocaleString()}G`;
}

export function validateBuildConstraints(build = {}, masterData = state.masterData) {
  const byId = masterData?.byId || {};
  const violations = [];
  let legendCount = 0;
  let rareCount = 0;
  let totalPrice = 0;

  const slotEntries = [
    { key: "core", id: build.core, label: "胴体" },
    { key: "head", id: build.head, label: "頭部" },
    { key: "rightArm", id: build.rightArm, label: "右腕" },
    { key: "leftArm", id: build.leftArm, label: "左腕" },
    { key: "rightLeg", id: build.rightLeg, label: "右脚" },
    { key: "leftLeg", id: build.leftLeg, label: "左脚" },
    { key: "rightWeapon", id: build.rightWeapon, label: "右手装備" },
    { key: "leftWeapon", id: build.leftWeapon, label: "左手装備" }
  ];

  const countedMultiSlotIds = new Set();

  for (const entry of slotEntries) {
    if (!entry.id) continue;
    const part = byId[entry.id];
    if (!part) {
      violations.push(`不明なパーツID（${entry.label}: ${entry.id}）が含まれています。`);
      continue;
    }

    const isMultiSlot =
      isDualArmPart(part) || isDualLegPart(part) || isDualWeaponPart(part);

    if (isMultiSlot) {
      if (countedMultiSlotIds.has(entry.id)) {
        continue;
      }
      countedMultiSlotIds.add(entry.id);
    }

    totalPrice += Math.max(0, toFiniteNumber(part.price, 0));

    const rarity = String(part.rarity || "コモン").trim();
    if (rarity === "レジェンド") {
      legendCount += 1;
    } else if (rarity === "レア") {
      rareCount += 1;
    }
  }

  if (legendCount > RARITY_LIMITS.legendMax) {
    violations.push(
      `レジェンドパーツは${RARITY_LIMITS.legendMax}個までです（現在: ${legendCount}個）。`
    );
  }
  if (rareCount > RARITY_LIMITS.rareMax) {
    violations.push(
      `レアパーツは${RARITY_LIMITS.rareMax}個までです（現在: ${rareCount}個）。`
    );
  }
  if (totalPrice > BUDGET_LIMIT) {
    violations.push(
      `所持金上限（${formatGold(BUDGET_LIMIT)}）を超過しています（合計: ${formatGold(totalPrice)}）。`
    );
  }

  return {
    ok: violations.length === 0,
    legendCount,
    rareCount,
    totalPrice,
    budgetLimit: BUDGET_LIMIT,
    violations
  };
}

export const validateBuildRarityLimits = validateBuildConstraints;

function setActiveBattleButton(activeBtn) {
  BATTLE_BUTTONS.forEach((btn) => {
    const isActive = btn === activeBtn;
    btn.classList.toggle("btn-primary", isActive);
    btn.classList.toggle("btn-secondary", !isActive);
  });
}

function updateBattleButtonsState() {
  if (!state.masterOk || !state.masterData) {
    BATTLE_BUTTONS.forEach((btn) => {
      btn.disabled = true;
    });
    return;
  }

  const f1 = state.builds.find((b) => b.id === state.fighter1Id) || null;
  const f2 = state.builds.find((b) => b.id === state.fighter2Id) || null;

  const check1 = f1 ? validateBuildConstraints(f1, state.masterData) : { ok: false };
  const check2 = f2 ? validateBuildConstraints(f2, state.masterData) : { ok: false };
  const canStart = Boolean(f1 && f2 && check1.ok && check2.ok);

  if (els.startBattleBtn) els.startBattleBtn.disabled = !canStart;
  if (els.startBattle10Btn) els.startBattle10Btn.disabled = !canStart;

  const legalCount = state.builds.filter(
    (b) => validateBuildConstraints(b, state.masterData).ok
  ).length;
  if (els.randomBattleBtn) els.randomBattleBtn.disabled = legalCount < 2;
  if (els.randomBattle10Btn) els.randomBattle10Btn.disabled = legalCount < 2;
}

function setArenaControlsLocked(locked) {
  if (els.fighter1Select) els.fighter1Select.disabled = locked;
  if (els.fighter2Select) els.fighter2Select.disabled = locked;
  if (locked) {
    BATTLE_BUTTONS.forEach((btn) => {
      btn.disabled = true;
    });
  } else {
    updateBattleButtonsState();
  }
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
    els.battleBanner.hidden = true;
    els.battleBanner.style.display = "none";
    els.battleBanner.innerHTML = "";
  }
  if (els.battleLog) {
    els.battleLog.hidden = true;
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
      els.masterError.hidden = false;
      els.masterError.style.display = "block";
      els.masterError.textContent = statusInfo.message;
    } else {
      els.masterError.hidden = true;
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

function formatPartLabelWithPrice(partId) {
  if (!partId || !state.masterData?.byId?.[partId]) return "なし（0G）";
  const p = state.masterData.byId[partId];
  return `${p.name}（${formatGold(p.price)}）`;
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
  const mpRegenLabel = st.mpRegen >= 0 ? `+${st.mpRegen}` : `${st.mpRegen}`;
  const winnerRow = isWinner
    ? `<div style="margin-bottom:6px;"><span class="tag" style="background:#059669;color:#ffffff;border-color:#10b981;">勝利</span></div>`
    : "";

  const check = validateBuildConstraints(normalizedBuild, state.masterData);
  const overBudget = check.totalPrice > BUDGET_LIMIT;
  const violationHtml = check.ok
    ? ""
    : `<div class="rarity-alert" role="alert" style="margin-bottom:10px;padding:8px 10px;border-radius:6px;background:rgba(239,68,68,0.14);border:1px solid rgba(248,113,113,0.6);color:#fecaca;font-size:0.82rem;line-height:1.45;">
        <strong>出撃不可（制限違反）</strong><br/>
        ${escapeHtml(check.violations.join(" / "))}
      </div>`;

  targetEl.innerHTML = `
    ${winnerRow}
    ${violationHtml}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
      <h3 style="margin:0;font-size:1.08rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(st.name)}</h3>
      <span class="tag" style="white-space:nowrap;flex-shrink:0;">${escapeHtml(st.tactic)}</span>
    </div>
    <div class="muted" style="font-size:0.8rem;margin-bottom:4px;">
      所持金合計：<strong style="color:${overBudget ? "#f87171" : "#86efac"};">${escapeHtml(formatGold(check.totalPrice))}</strong> / ${escapeHtml(formatGold(BUDGET_LIMIT))}
    </div>
    <div class="muted" style="font-size:0.78rem;margin-bottom:8px;">
      レジェンド ${check.legendCount}/${RARITY_LIMITS.legendMax} ・ レア ${check.rareCount}/${RARITY_LIMITS.rareMax}
    </div>
    <div class="equip-summary muted">
      <div class="equip-row"><strong>胴体:</strong> ${escapeHtml(formatPartLabelWithPrice(normalizedBuild.core))}</div>
      <div class="equip-row"><strong>頭部:</strong> ${escapeHtml(formatPartLabelWithPrice(normalizedBuild.head))}</div>
      <div class="equip-row"><strong>右腕:</strong> ${escapeHtml(formatPartLabelWithPrice(normalizedBuild.rightArm))}</div>
      <div class="equip-row"><strong>左腕:</strong> ${escapeHtml(formatPartLabelWithPrice(normalizedBuild.leftArm))}</div>
      <div class="equip-row"><strong>右脚:</strong> ${escapeHtml(formatPartLabelWithPrice(normalizedBuild.rightLeg))}</div>
      <div class="equip-row"><strong>左脚:</strong> ${escapeHtml(formatPartLabelWithPrice(normalizedBuild.leftLeg))}</div>
      <div class="equip-row"><strong>右手:</strong> ${escapeHtml(formatPartLabelWithPrice(normalizedBuild.rightWeapon))}</div>
      <div class="equip-row"><strong>左手:</strong> ${escapeHtml(formatPartLabelWithPrice(normalizedBuild.leftWeapon))}</div>
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

  return `<div class="log-line${extraClass}" style="white-space:normal;line-height:1.55;">${escapeHtml(mainText)}${subHtml}</div>`;
}

function renderBattleResult(result) {
  if (!result) return;

  state.lastWinnerSide = result.winnerSide || null;

  const f1 = state.builds.find((b) => b.id === state.fighter1Id) || state.builds[0];
  const f2 = state.builds.find((b) => b.id === state.fighter2Id) || state.builds[1] || state.builds[0];
  renderFighterCard(els.fighter1Card, f1, state.lastWinnerSide === "fighter1");
  renderFighterCard(els.fighter2Card, f2, state.lastWinnerSide === "fighter2");

  if (els.battleBanner) {
    els.battleBanner.hidden = false;
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
    els.battleLog.hidden = false;
    els.battleLog.style.display = "block";
    const lines = Array.isArray(result.logs) ? result.logs : [];
    els.battleLog.innerHTML = lines.map(formatLogLineHtml).join("");
  }
}

function renderTenBattleResult({ title, scoreLine, summaryLines }) {
  state.lastWinnerSide = null;
  applyFighterCardWinnerStyle(els.fighter1Card, false);
  applyFighterCardWinnerStyle(els.fighter2Card, false);

  if (els.battleBanner) {
    els.battleBanner.hidden = false;
    els.battleBanner.style.display = "block";
    els.battleBanner.innerHTML = `
      <div style="font-size:1.05rem;font-weight:700;">${escapeHtml(title)}</div>
      <div style="font-size:0.95rem;font-weight:700;margin-top:4px;line-height:1.45;">${escapeHtml(scoreLine)}</div>
    `;
  }

  if (els.battleLog) {
    els.battleLog.hidden = false;
    els.battleLog.style.display = "block";
    els.battleLog.innerHTML = summaryLines
      .map((line) => `<div class="log-line is-result" style="white-space:normal;line-height:1.55;">${escapeHtml(line)}</div>`)
      .join("");
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
    .map((b) => {
      const check = validateBuildConstraints(b, state.masterData);
      const tag = check.ok ? ` [${formatGold(check.totalPrice)}]` : ` [${formatGold(check.totalPrice)} / 制限違反]`;
      return `<option value="${escapeHtml(b.id)}">${escapeHtml((b.name || "名称未設定ゴーレム") + tag)}</option>`;
    })
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
  updateBattleButtonsState();
}

function validatePairForBattle(f1, f2) {
  if (!f1 || !f2) return false;
  const check1 = validateBuildConstraints(f1, state.masterData);
  const check2 = validateBuildConstraints(f2, state.masterData);
  if (!check1.ok || !check2.ok) {
    const msgs = [
      !check1.ok ? `機体1「${f1.name}」: ${check1.violations.join(" / ")}` : "",
      !check2.ok ? `機体2「${f2.name}」: ${check2.violations.join(" / ")}` : ""
    ].filter(Boolean);
    showToast(msgs.join(" | ") || "制限違反の機体は出撃できません。");
    updateBattleButtonsState();
    return false;
  }
  return true;
}

function executeTenMatchSeries(f1, f2, titlePrefix = "") {
  const name1 = f1.name || "機体1";
  const name2 = f2.name || "機体2";
  let wins1 = 0;
  let wins2 = 0;
  let draws = 0;
  const summaryLines = [];

  for (let i = 1; i <= 10; i++) {
    const res = runAutoBattle(f1, f2, state.masterData);
    if (res.winnerSide === "fighter1") {
      wins1 += 1;
      summaryLines.push(`${i}戦目：${name1} の勝利`);
    } else if (res.winnerSide === "fighter2") {
      wins2 += 1;
      summaryLines.push(`${i}戦目：${name2} の勝利`);
    } else {
      draws += 1;
      const reason = res.decisionReason ? `（${res.decisionReason}）` : "";
      summaryLines.push(`${i}戦目：引き分け${reason}`);
    }
  }

  renderTenBattleResult({
    title: `${titlePrefix}${name1} vs ${name2}（10連戦）`,
    scoreLine: `${name1}：${wins1}勝 ／ ${name2}：${wins2}勝（引分：${draws}回）`,
    summaryLines
  });
}

function handleStartBattle() {
  if (!state.masterOk || !state.masterData) return;
  setActiveBattleButton(els.startBattleBtn);
  const f1 = state.builds.find((b) => b.id === state.fighter1Id) || state.builds[0];
  const f2 = state.builds.find((b) => b.id === state.fighter2Id) || state.builds[1] || state.builds[0];
  if (!validatePairForBattle(f1, f2)) return;

  const result = runAutoBattle(f1, f2, state.masterData);
  renderBattleResult(result);
}

function handleStartBattle10() {
  if (!state.masterOk || !state.masterData) return;
  setActiveBattleButton(els.startBattle10Btn);
  const f1 = state.builds.find((b) => b.id === state.fighter1Id) || state.builds[0];
  const f2 = state.builds.find((b) => b.id === state.fighter2Id) || state.builds[1] || state.builds[0];
  if (!validatePairForBattle(f1, f2)) return;

  executeTenMatchSeries(f1, f2);
}

function pickRandomLegalPair(legalBuilds) {
  const idx1 = Math.floor(Math.random() * legalBuilds.length);
  let idx2 = Math.floor(Math.random() * legalBuilds.length);
  if (legalBuilds.length > 1 && idx2 === idx1) {
    idx2 = (idx1 + 1) % legalBuilds.length;
  }
  return [legalBuilds[idx1], legalBuilds[idx2]];
}

function handleRandomBattle() {
  if (!state.masterOk || !state.masterData || state.builds.length === 0) return;
  setActiveBattleButton(els.randomBattleBtn);
  const legalBuilds = state.builds.filter(
    (b) => validateBuildConstraints(b, state.masterData).ok
  );
  if (legalBuilds.length < 2) {
    showToast(`出撃可能な機体（予算${formatGold(BUDGET_LIMIT)}以内・レア制限以内）が2機以上必要です。`);
    updateBattleButtonsState();
    return;
  }

  const [b1, b2] = pickRandomLegalPair(legalBuilds);
  state.fighter1Id = b1.id;
  state.fighter2Id = b2.id;
  state.lastWinnerSide = null;
  syncBuildSelectors();
  handleStartBattle();
}

function handleRandomBattle10() {
  if (!state.masterOk || !state.masterData || state.builds.length === 0) return;
  setActiveBattleButton(els.randomBattle10Btn);
  const legalBuilds = state.builds.filter(
    (b) => validateBuildConstraints(b, state.masterData).ok
  );
  if (legalBuilds.length < 2) {
    showToast(`出撃可能な機体（予算${formatGold(BUDGET_LIMIT)}以内・レア制限以内）が2機以上必要です。`);
    updateBattleButtonsState();
    return;
  }

  const [b1, b2] = pickRandomLegalPair(legalBuilds);
  state.fighter1Id = b1.id;
  state.fighter2Id = b2.id;
  state.lastWinnerSide = null;
  syncBuildSelectors();
  executeTenMatchSeries(b1, b2, "ランダム選出：");
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
    updateBattleButtonsState();
  });

  els.fighter2Select?.addEventListener("change", (e) => {
    if (!state.masterOk) return;
    state.fighter2Id = e.target.value;
    state.lastWinnerSide = null;
    const f1 = state.builds.find((b) => b.id === state.fighter1Id);
    const f2 = state.builds.find((b) => b.id === state.fighter2Id);
    renderFighterCard(els.fighter1Card, f1, false);
    renderFighterCard(els.fighter2Card, f2, false);
    updateBattleButtonsState();
  });

  els.startBattleBtn?.addEventListener("click", handleStartBattle);
  els.startBattle10Btn?.addEventListener("click", handleStartBattle10);
  els.randomBattleBtn?.addEventListener("click", handleRandomBattle);
  els.randomBattle10Btn?.addEventListener("click", handleRandomBattle10);

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
