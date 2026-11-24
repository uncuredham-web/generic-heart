import {
  loadGolemMasterData,
  TACTIC_OPTIONS,
  DEFAULT_TACTIC,
  PRESET_BUILDS
} from "./data/golemData.js";
import { loadSavedBuilds, saveCustomBuild, deleteCustomBuild, showToast } from "./ui/storage.js";

export const RARITY_LIMITS = {
  legendMax: 1,
  rareMax: 2
};

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

function getAvailablePresets() {
  const sheetPresets = Array.isArray(state.masterData?.presets) && state.masterData.presets.length > 0
    ? state.masterData.presets
    : [];
  const basePresets = Array.isArray(PRESET_BUILDS) && PRESET_BUILDS.length > 0
    ? PRESET_BUILDS
    : FALLBACK_BUILDS;

  const source = sheetPresets.length > 0 ? sheetPresets : basePresets;
  return source.map((p) => ({
    ...p,
    golemName: p.golemName || p.name || "名称未設定ゴーレム",
    tactic: normalizeTactic(p.tactic)
  }));
}

const state = {
  masterData: null,
  masterOk: false,
  draft: {
    id: null,
    name: "",
    core: "",
    head: "",
    rightArm: "",
    leftArm: "",
    rightWeapon: "",
    leftWeapon: "",
    rightLeg: "",
    leftLeg: "",
    tactic: normalizeTactic(DEFAULT_TACTIC)
  }
};

const els = {
  dataStatus: document.getElementById("data-status"),
  masterError: document.getElementById("master-error"),
  reloadDataBtn: document.getElementById("reload-data-btn"),
  golemName: document.getElementById("golem-name"),
  tacticSelect: document.getElementById("tactic-select"),
  presetSelect: document.getElementById("preset-select"),
  applyPresetBtn: document.getElementById("apply-preset-btn"),
  coreList: document.getElementById("core-list"),
  headList: document.getElementById("head-list"),
  rightArmList: document.getElementById("right-arm-list"),
  rightWeaponBlock: document.getElementById("right-weapon-block"),
  rightWeaponHint: document.getElementById("right-weapon-hint"),
  rightWeaponList: document.getElementById("right-weapon-list"),
  leftArmSection: document.getElementById("left-arm-section"),
  leftArmHint: document.getElementById("left-arm-hint"),
  leftArmInner: document.getElementById("left-arm-inner"),
  leftArmList: document.getElementById("left-arm-list"),
  leftWeaponBlock: document.getElementById("left-weapon-block"),
  leftWeaponHint: document.getElementById("left-weapon-hint"),
  leftWeaponList: document.getElementById("left-weapon-list"),
  rightLegList: document.getElementById("right-leg-list"),
  leftLegSection: document.getElementById("left-leg-section"),
  leftLegHint: document.getElementById("left-leg-hint"),
  leftLegList: document.getElementById("left-leg-list"),
  previewCard: document.getElementById("preview-card"),
  rarityWarning: document.getElementById("rarity-warning"),
  saveBuildBtn: document.getElementById("save-build-btn"),
  saveAsNewBtn: document.getElementById("save-as-new-btn"),
  exportJsonBtn: document.getElementById("export-json-btn"),
  importJsonBtn: document.getElementById("import-json-btn"),
  importJsonTextarea: document.getElementById("import-json-textarea"),
  importJsonInput: document.getElementById("import-json-input"),
  savedList: document.getElementById("saved-list")
};

function getRarityClass(rarity) {
  const r = String(rarity || "").trim();
  if (r === "アンコモン") return "rarity-uncommon";
  if (r === "レア") return "rarity-rare";
  if (r === "レジェンド") return "rarity-legend";
  return "rarity-common";
}

function isDualArmPart(part) {
  if (!part) return false;
  const text = `${part.slot || ""} ${part.cat || ""} ${part.name || ""} ${part.note || ""}`;
  return text.includes("両腕");
}

function isDualWeaponPart(part) {
  if (!part) return false;
  const text = `${part.slot || ""} ${part.cat || ""} ${part.name || ""} ${part.note || ""}`;
  return text.includes("両手") || text.includes("両腕");
}

function isDualLegPart(part) {
  if (!part) return false;
  const text = `${part.slot || ""} ${part.cat || ""} ${part.name || ""} ${part.note || ""}`;
  return (
    text.includes("両脚") ||
    text.includes("両脚占有") ||
    text.includes("ユニット") ||
    text.includes("多脚") ||
    text.includes("ホバー")
  );
}

function isIntegratedWeaponPart(part) {
  if (!part) return false;
  const text = `${part.slot || ""} ${part.cat || ""} ${part.name || ""} ${part.note || ""}`;
  return text.includes("武器一体") || text.includes("一体型") || text.includes("武器内蔵");
}

/**
 * ビルド内のレジェンド／レア個数を集計し、制限違反をチェックする
 * 両腕・両脚・両手占有パーツはパーツ単位で1カウントとする
 */
export function validateBuildRarityLimits(build = {}, masterData = state.masterData) {
  const byId = masterData?.byId || {};
  const violations = [];
  let legendCount = 0;
  let rareCount = 0;

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

  const countedMultiSlotKeys = new Set();

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
      const dedupKey = `${entry.id}:${part.slot || part.cat || ""}`;
      if (countedMultiSlotKeys.has(dedupKey)) {
        continue;
      }
      countedMultiSlotKeys.add(dedupKey);
    }

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

  return {
    ok: violations.length === 0,
    legendCount,
    rareCount,
    violations
  };
}

function showRarityViolationAlert(violations = []) {
  const message = violations.join(" / ") || "レアリティ制限に違反しています。";
  showToast(message);

  let warnEl = els.rarityWarning;
  if (!warnEl && els.previewCard) {
    warnEl = document.getElementById("dynamic-rarity-warning");
    if (!warnEl) {
      warnEl = document.createElement("div");
      warnEl.id = "dynamic-rarity-warning";
      warnEl.className = "error-box";
      els.previewCard.insertAdjacentElement("beforebegin", warnEl);
    }
  }
  if (warnEl) {
    warnEl.style.display = "block";
    warnEl.style.borderColor = "#f87171";
    warnEl.style.backgroundColor = "rgba(239, 68, 68, 0.12)";
    warnEl.style.color = "#fecaca";
    warnEl.style.padding = "10px 12px";
    warnEl.style.borderRadius = "8px";
    warnEl.style.marginBottom = "10px";
    warnEl.textContent = `ビルド制限違反：${message}`;
  }
}

function clearRarityViolationAlert() {
  if (els.rarityWarning) {
    els.rarityWarning.style.display = "none";
    els.rarityWarning.textContent = "";
  }
  const dyn = document.getElementById("dynamic-rarity-warning");
  if (dyn) {
    dyn.style.display = "none";
    dyn.textContent = "";
  }
}

function normalizeDraftConstraints() {
  if (!state.masterData) return;
  const { byId, parts } = state.masterData;
  const legs = parts.filter((p) => p.cat === "脚部");
  const singleLegs = legs.filter((p) => !isDualLegPart(p));
  const fallbackSingleLeg = singleLegs[0]?.id || "";

  state.draft.tactic = normalizeTactic(state.draft.tactic);

  const rArm = byId[state.draft.rightArm];
  const lArm = byId[state.draft.leftArm];
  if (isDualArmPart(rArm)) {
    state.draft.leftArm = rArm.id;
  } else if (isDualArmPart(lArm)) {
    state.draft.rightArm = lArm.id;
  }

  const rArmNow = byId[state.draft.rightArm];
  const lArmNow = byId[state.draft.leftArm];
  if (isIntegratedWeaponPart(rArmNow)) {
    state.draft.rightWeapon = "";
  }
  if (isIntegratedWeaponPart(lArmNow)) {
    state.draft.leftWeapon = "";
  }

  const rWeap = byId[state.draft.rightWeapon];
  const lWeap = byId[state.draft.leftWeapon];
  if (isDualWeaponPart(rWeap)) {
    state.draft.leftWeapon = rWeap.id;
  } else if (isDualWeaponPart(lWeap)) {
    state.draft.rightWeapon = lWeap.id;
    state.draft.leftWeapon = lWeap.id;
  }

  const rLeg = byId[state.draft.rightLeg];
  const lLeg = byId[state.draft.leftLeg];
  if (isDualLegPart(rLeg)) {
    state.draft.leftLeg = rLeg.id;
  } else if (isDualLegPart(lLeg)) {
    state.draft.leftLeg = isDualLegPart(rLeg) ? rLeg.id : fallbackSingleLeg || state.draft.rightLeg;
  }
}

function setControlsLocked(locked) {
  if (els.golemName) els.golemName.disabled = locked;
  if (els.tacticSelect) els.tacticSelect.disabled = locked;
  if (els.presetSelect) els.presetSelect.disabled = locked;
  if (els.applyPresetBtn) els.applyPresetBtn.disabled = locked;
  if (els.saveBuildBtn) els.saveBuildBtn.disabled = locked;
  if (els.saveAsNewBtn) els.saveAsNewBtn.disabled = locked;
  if (els.exportJsonBtn) els.exportJsonBtn.disabled = locked;
  if (els.importJsonBtn) els.importJsonBtn.disabled = locked;
  if (els.importJsonTextarea) els.importJsonTextarea.disabled = locked;
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

function clearBlankBuilder() {
  [
    els.coreList,
    els.headList,
    els.rightArmList,
    els.rightWeaponList,
    els.leftArmList,
    els.leftWeaponList,
    els.rightLegList,
    els.leftLegList
  ].forEach((el) => {
    if (el) el.innerHTML = "";
  });
  if (els.presetSelect) els.presetSelect.innerHTML = "";
  if (els.previewCard) els.previewCard.innerHTML = "";
  if (els.savedList) els.savedList.innerHTML = "";
  clearRarityViolationAlert();
  setControlsLocked(true);
}

function formatPartSpec(p) {
  const bits = [];
  if (p.hp > 0) bits.push(`耐久${p.hp}`);
  if (p.maxMp > 0) bits.push(`最大魔力${p.maxMp}/回復+${p.mpRegen}`);
  if (p.power > 0) bits.push(`威力${p.power}/射程${p.range}`);
  if (p.useCost > 0) bits.push(`消費${p.useCost}`);
  if (p.baseCost > 0) bits.push(`基礎消費-${p.baseCost}`);
  if (p.move > 0) bits.push(`移動${p.move}`);
  if (p.evade > 0) bits.push(`回避+${p.evade}%`);
  if (p.acc !== 0) bits.push(`命中${p.acc > 0 ? "+" : ""}${p.acc}%`);
  return bits.join(" / ");
}

function renderList(container, items, selectedId, onPick, disabled = false) {
  if (!container) return;
  container.innerHTML = items
    .map((p) => {
      const sel = p.id === selectedId ? "is-selected" : "";
      const rarityLabel = p.rarity || "コモン";
      const rarityClass = getRarityClass(rarityLabel);
      return `
        <div class="part-card ${sel}" data-part-id="${p.id}" data-rarity="${escapeHtml(rarityLabel)}" aria-disabled="${disabled ? "true" : "false"}">
          <div class="part-card-header">
            <span>${escapeHtml(p.name)}</span>
            <div class="part-badges">
              <span class="rarity-badge ${rarityClass}">${escapeHtml(rarityLabel)}</span>
              <span class="part-cost">${escapeHtml(p.cat)}</span>
            </div>
          </div>
          <p class="part-desc">${escapeHtml(p.note || "")}</p>
          <div class="part-mods">${escapeHtml(formatPartSpec(p))}</div>
        </div>
      `;
    })
    .join("");

  if (disabled) return;

  container.querySelectorAll("[data-part-id]").forEach((card) => {
    card.addEventListener("click", () => {
      onPick(card.dataset.partId);
      normalizeDraftConstraints();
      renderAll();
    });
  });
}

function setBlockState(blockEl, hintEl, isDisabled, hintText = "") {
  if (blockEl) {
    blockEl.classList.toggle("is-disabled-block", Boolean(isDisabled));
  }
  if (hintEl) {
    if (isDisabled && hintText) {
      hintEl.textContent = hintText;
      hintEl.style.display = "block";
    } else {
      hintEl.textContent = "";
      hintEl.style.display = "none";
    }
  }
}

function renderPreview() {
  const { byId } = state.masterData;
  const core = byId[state.draft.core];
  const head = byId[state.draft.head];
  const rArm = byId[state.draft.rightArm];
  const lArm = byId[state.draft.leftArm];
  const rLeg = byId[state.draft.rightLeg];
  const lLeg = byId[state.draft.leftLeg];
  const rWeap = byId[state.draft.rightWeapon] || null;
  const lWeap = byId[state.draft.leftWeapon] || null;
  if (!core || !head || !rArm || !lArm || !rLeg || !lLeg) return;

  const isDualLeg = isDualLegPart(rLeg) || isDualLegPart(lLeg);
  const active = [core, head, rArm];
  if (!isDualArmPart(rArm) && lArm) active.push(lArm);
  active.push(rLeg);
  if (!isDualLeg && lLeg) active.push(lLeg);
  if (rWeap) active.push(rWeap);
  if (!isDualWeaponPart(rWeap) && lWeap && (!rWeap || lWeap.id !== rWeap.id)) {
    active.push(lWeap);
  }

  const baseCost = active.reduce((s, p) => s + (p.baseCost || 0), 0);
  const netMp = (core.mpRegen || 0) - baseCost;
  const move = isDualLeg ? (rLeg.move || 0) : (rLeg.move || 0) + (lLeg.move || 0);
  const tacticLabel = normalizeTactic(state.draft.tactic);
  const limitCheck = validateBuildRarityLimits(state.draft, state.masterData);

  if (!limitCheck.ok) {
    showRarityViolationAlert(limitCheck.violations);
  } else {
    clearRarityViolationAlert();
  }

  const legSummaryHtml = isDualLeg
    ? `<p class="muted" style="margin:0 0 4px;"><strong>脚部:</strong> ${escapeHtml(rLeg.name)}（両脚占有）</p>`
    : `<p class="muted" style="margin:0 0 4px;"><strong>右脚:</strong> ${escapeHtml(rLeg.name)}</p>
       <p class="muted" style="margin:0 0 4px;"><strong>左脚:</strong> ${escapeHtml(lLeg.name)}</p>`;

  els.previewCard.innerHTML = `
    <div class="preview-header">
      <h3 class="preview-name">${escapeHtml(state.draft.name || "名称未設定ゴーレム")}</h3>
      <span class="tag">${escapeHtml(tacticLabel)}</span>
    </div>
    <p class="muted" style="margin:0 0 8px;">
      レアリティ制限：レジェンド ${limitCheck.legendCount}/${RARITY_LIMITS.legendMax} ・ レア ${limitCheck.rareCount}/${RARITY_LIMITS.rareMax}
      ${limitCheck.ok ? "" : `<br><span style="color:#f87171;font-weight:700;">（制限超過：保存/出力不可）</span>`}
    </p>
    <div class="preview-equip-list" style="margin-bottom:10px; line-height:1.5;">
      <p class="muted" style="margin:0 0 4px;"><strong>胴体:</strong> ${escapeHtml(core.name)}</p>
      <p class="muted" style="margin:0 0 4px;"><strong>頭部:</strong> ${escapeHtml(head.name)}</p>
      <p class="muted" style="margin:0 0 4px;"><strong>右腕:</strong> ${escapeHtml(rArm.name)}</p>
      <p class="muted" style="margin:0 0 4px;"><strong>左腕:</strong> ${escapeHtml(lArm.name)}</p>
      ${legSummaryHtml}
      <p class="muted" style="margin:0 0 4px;"><strong>右手:</strong> ${escapeHtml(rWeap ? rWeap.name : "なし")}</p>
      <p class="muted" style="margin:0;"><strong>左手:</strong> ${escapeHtml(lWeap ? lWeap.name : "なし")}</p>
    </div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-label">胴体耐久</div><div class="stat-value">${core.hp}</div></div>
      <div class="stat-box"><div class="stat-label">最大魔力</div><div class="stat-value">${core.maxMp}</div></div>
      <div class="stat-box"><div class="stat-label">毎ターン魔力収支</div><div class="stat-value">${netMp >= 0 ? `+${netMp}` : netMp}</div></div>
      <div class="stat-box"><div class="stat-label">移動力</div><div class="stat-value">${move}</div></div>
    </div>
  `;

  if (state.masterOk) {
    const canSaveOrExport = limitCheck.ok;
    els.saveBuildBtn.disabled = !canSaveOrExport;
    els.saveAsNewBtn.disabled = !canSaveOrExport;
    els.exportJsonBtn.disabled = !canSaveOrExport;
  }
}

function renderSavedBuilds() {
  const saved = loadSavedBuilds();
  if (saved.length === 0) {
    els.savedList.innerHTML = `<p class="muted">保存済み機体はありません。</p>`;
    return;
  }
  els.savedList.innerHTML = saved
    .map((b) => {
      const tacticText = normalizeTactic(b.tactic);
      const check = state.masterData ? validateBuildRarityLimits(b, state.masterData) : { ok: true };
      const badgeHtml = check.ok
        ? ""
        : ` <span class="rarity-badge rarity-legend" style="margin-left:6px;">制限違反</span>`;
      return `
        <div class="saved-item">
          <div>
            <div class="saved-item-title">${escapeHtml(b.name || "名称未設定ゴーレム")}${badgeHtml}</div>
            <div class="muted">${escapeHtml(tacticText)}</div>
          </div>
          <div class="saved-item-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-load-id="${b.id}" ${state.masterOk ? "" : "disabled"}>読込</button>
            <button type="button" class="btn btn-danger btn-sm" data-del-id="${b.id}" ${state.masterOk ? "" : "disabled"}>削除</button>
          </div>
        </div>
      `;
    })
    .join("");

  if (!state.masterOk) return;

  els.savedList.querySelectorAll("[data-load-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = loadSavedBuilds().find((x) => x.id === btn.dataset.loadId);
      if (!target) return;
      state.draft = {
        ...target,
        tactic: normalizeTactic(target.tactic)
      };
      if (els.golemName) els.golemName.value = state.draft.name || "";
      normalizeDraftConstraints();
      renderAll();
      showToast("読み込みました");
    });
  });

  els.savedList.querySelectorAll("[data-del-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteCustomBuild(btn.dataset.delId);
      if (state.draft.id === btn.dataset.delId) state.draft.id = null;
      renderSavedBuilds();
      showToast("削除しました");
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function applyPresetById(presetId) {
  const presets = getAvailablePresets();
  const p = presets.find((x) => x.id === presetId);
  if (!p || !state.masterData) return;
  const { byId } = state.masterData;
  const nextName = p.golemName || p.name || "名称未設定ゴーレム";

  state.draft = {
    id: null,
    name: nextName,
    core: byId[p.core] ? p.core : state.draft.core,
    head: byId[p.head] ? p.head : state.draft.head,
    rightArm: byId[p.rightArm] ? p.rightArm : state.draft.rightArm,
    leftArm: byId[p.leftArm] ? p.leftArm : state.draft.leftArm,
    rightWeapon: p.rightWeapon && byId[p.rightWeapon] ? p.rightWeapon : "",
    leftWeapon: p.leftWeapon && byId[p.leftWeapon] ? p.leftWeapon : "",
    rightLeg: byId[p.rightLeg] ? p.rightLeg : state.draft.rightLeg,
    leftLeg: byId[p.leftLeg] ? p.leftLeg : state.draft.leftLeg,
    tactic: normalizeTactic(p.tactic)
  };
  if (els.golemName) els.golemName.value = state.draft.name;
  normalizeDraftConstraints();
  renderAll();
  showToast(`プリセット「${p.name}」を反映しました`);
}

function extractBuildFromImportedJson(rawObj) {
  if (!rawObj || typeof rawObj !== "object") {
    throw new Error("JSONの形式が不正です。");
  }
  const srcParts = rawObj.parts && typeof rawObj.parts === "object" ? rawObj.parts : rawObj;

  return {
    id: null,
    name: String(rawObj.name || rawObj.golemName || "取込ゴーレム").trim() || "取込ゴーレム",
    core: srcParts.core ? String(srcParts.core).trim() : "",
    head: srcParts.head ? String(srcParts.head).trim() : "",
    rightArm: srcParts.rightArm ? String(srcParts.rightArm).trim() : "",
    leftArm: srcParts.leftArm ? String(srcParts.leftArm).trim() : "",
    rightWeapon: srcParts.rightWeapon ? String(srcParts.rightWeapon).trim() : "",
    leftWeapon: srcParts.leftWeapon ? String(srcParts.leftWeapon).trim() : "",
    rightLeg: srcParts.rightLeg ? String(srcParts.rightLeg).trim() : "",
    leftLeg: srcParts.leftLeg ? String(srcParts.leftLeg).trim() : "",
    tactic: normalizeTactic(rawObj.tactic)
  };
}

export function importBuildFromJsonText(jsonText) {
  if (!state.masterOk || !state.masterData) {
    showToast("パーツマスター読込後にJSONを取り込んでください。");
    return false;
  }

  let parsed;
  try {
    parsed = JSON.parse(String(jsonText || ""));
  } catch {
    showRarityViolationAlert(["JSONの構文が正しくありません。"]);
    return false;
  }

  let candidate;
  try {
    candidate = extractBuildFromImportedJson(parsed);
  } catch (err) {
    showRarityViolationAlert([err.message]);
    return false;
  }

  const requiredSlots = [
    { key: "core", label: "胴体" },
    { key: "head", label: "頭部" },
    { key: "rightArm", label: "右腕" },
    { key: "rightLeg", label: "右脚" }
  ];
  for (const req of requiredSlots) {
    if (!candidate[req.key]) {
      showRarityViolationAlert([`必須スロット（${req.label}）が指定されていません。`]);
      return false;
    }
  }

  const limitCheck = validateBuildRarityLimits(candidate, state.masterData);
  if (!limitCheck.ok) {
    showRarityViolationAlert(limitCheck.violations);
    return false;
  }

  state.draft = candidate;
  if (els.golemName) els.golemName.value = state.draft.name;
  normalizeDraftConstraints();
  clearRarityViolationAlert();
  renderAll();
  showToast(`JSON「${state.draft.name}」を取り込みました`);
  return true;
}

function renderAll() {
  if (!state.masterOk || !state.masterData) {
    clearBlankBuilder();
    return;
  }

  setControlsLocked(false);

  const parts = state.masterData.parts;
  const byId = state.masterData.byId;
  const cores = parts.filter((p) => p.cat === "胴体");
  const heads = parts.filter((p) => p.cat === "頭部");
  const arms = parts.filter((p) => p.cat === "腕部");
  const legs = parts.filter((p) => p.cat === "脚部");
  const singleLegs = legs.filter((p) => !isDualLegPart(p));
  const equips = parts.filter((p) => ["物理武器", "魔力武器", "シールド"].includes(p.cat));
  const leftEquips = equips.filter((p) => !isDualWeaponPart(p));

  if (!state.draft.core && cores[0]) state.draft.core = cores[0].id;
  if (!state.draft.head && heads[0]) state.draft.head = heads[0].id;
  if (!state.draft.rightArm && arms[0]) state.draft.rightArm = arms[0].id;
  if (!state.draft.leftArm && arms[0]) state.draft.leftArm = arms[0].id;
  if (!state.draft.rightLeg && legs[0]) state.draft.rightLeg = legs[0].id;
  if (!state.draft.leftLeg && (singleLegs[0] || legs[0])) {
    state.draft.leftLeg = (singleLegs[0] || legs[0]).id;
  }

  normalizeDraftConstraints();

  const presets = getAvailablePresets();
  if (els.presetSelect) {
    const prev = els.presetSelect.value;
    els.presetSelect.innerHTML = presets
      .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
      .join("");
    if (prev && presets.some((p) => p.id === prev)) {
      els.presetSelect.value = prev;
    } else if (presets[0]) {
      els.presetSelect.value = presets[0].id;
    }
  }
  if (els.applyPresetBtn) els.applyPresetBtn.disabled = false;

  if (els.tacticSelect) {
    els.tacticSelect.innerHTML = TACTICS
      .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
      .join("");
    els.tacticSelect.value = normalizeTactic(state.draft.tactic);
  }

  renderList(els.coreList, cores, state.draft.core, (id) => {
    state.draft.core = id;
  });

  renderList(els.headList, heads, state.draft.head, (id) => {
    state.draft.head = id;
  });

  const rArmObj = byId[state.draft.rightArm];
  const lArmObj = byId[state.draft.leftArm];
  const rWeapObj = byId[state.draft.rightWeapon];
  const lWeapObj = byId[state.draft.leftWeapon];
  const rLegObj = byId[state.draft.rightLeg];

  const dualArmActive = isDualArmPart(rArmObj) || isDualArmPart(lArmObj);
  const dualWeaponActive = isDualWeaponPart(rWeapObj) || isDualWeaponPart(lWeapObj);

  const leftArmPartDisabled = dualArmActive;
  const leftWeaponDisabled =
    dualArmActive || dualWeaponActive || isIntegratedWeaponPart(lArmObj);
  const rightWeaponDisabled = isIntegratedWeaponPart(rArmObj);
  const leftLegDisabled = isDualLegPart(rLegObj);

  renderList(els.rightArmList, arms, state.draft.rightArm, (id) => {
    const picked = byId[id];
    state.draft.rightArm = id;
    if (isDualArmPart(picked)) {
      state.draft.leftArm = id;
    }
  });

  setBlockState(
    els.rightWeaponBlock,
    els.rightWeaponHint,
    rightWeaponDisabled,
    "武器一体型パーツ選択中のため、武器は選択できません。"
  );
  renderList(
    els.rightWeaponList,
    equips,
    state.draft.rightWeapon,
    (id) => {
      const picked = byId[id];
      const current = byId[state.draft.rightWeapon];
      if (state.draft.rightWeapon === id) {
        state.draft.rightWeapon = "";
        if (isDualWeaponPart(current)) {
          state.draft.leftWeapon = "";
        }
        return;
      }
      state.draft.rightWeapon = id;
      if (isDualWeaponPart(picked)) {
        state.draft.leftWeapon = id;
      } else if (isDualWeaponPart(current)) {
        state.draft.leftWeapon = "";
      }
    },
    rightWeaponDisabled
  );

  setBlockState(
    els.leftArmInner,
    els.leftArmHint,
    leftArmPartDisabled,
    dualArmActive ? "両腕占有パーツ選択中のため、左腕は右腕と同じパーツに固定されています。" : ""
  );

  renderList(
    els.leftArmList,
    arms,
    state.draft.leftArm,
    (id) => {
      const picked = byId[id];
      if (isDualArmPart(picked)) {
        state.draft.rightArm = id;
        state.draft.leftArm = id;
      } else {
        state.draft.leftArm = id;
      }
    },
    leftArmPartDisabled
  );

  let leftWeapHintText = "";
  if (dualWeaponActive) {
    leftWeapHintText = "両腕占有武器選択中のため、左腕武器は選択できません。";
  } else if (dualArmActive) {
    leftWeapHintText = "両腕占有パーツ選択中のため、左腕武器は選択できません。";
  } else if (isIntegratedWeaponPart(lArmObj)) {
    leftWeapHintText = "武器一体型パーツ選択中のため、武器は選択できません。";
  }

  setBlockState(
    els.leftWeaponBlock,
    els.leftWeaponHint,
    leftWeaponDisabled,
    leftWeapHintText
  );
  renderList(
    els.leftWeaponList,
    leftEquips,
    state.draft.leftWeapon,
    (id) => {
      state.draft.leftWeapon = state.draft.leftWeapon === id ? "" : id;
    },
    leftWeaponDisabled
  );

  renderList(els.rightLegList, legs, state.draft.rightLeg, (id) => {
    const picked = byId[id];
    state.draft.rightLeg = id;
    if (isDualLegPart(picked)) {
      state.draft.leftLeg = id;
    } else if (isDualLegPart(byId[state.draft.leftLeg]) || state.draft.leftLeg === rLegObj?.id) {
      state.draft.leftLeg = id;
    }
  });

  setBlockState(
    els.leftLegList,
    els.leftLegHint,
    leftLegDisabled,
    "両脚占有パーツ選択中のため、左脚は右脚と同じパーツに固定されています。"
  );
  renderList(
    els.leftLegList,
    singleLegs,
    state.draft.leftLeg,
    (id) => {
      state.draft.leftLeg = id;
    },
    leftLegDisabled
  );

  renderPreview();
  renderSavedBuilds();
}

async function applyMasterLoadResult(res) {
  state.masterData = res.data;
  state.masterOk = Boolean(res.ok);
  renderStatus(res);
  renderAll();
}

function bindEvents() {
  els.golemName?.addEventListener("input", (e) => {
    if (!state.masterOk) return;
    state.draft.name = e.target.value;
    renderPreview();
  });

  els.tacticSelect?.addEventListener("change", (e) => {
    if (!state.masterOk) return;
    state.draft.tactic = normalizeTactic(e.target.value);
    renderPreview();
  });

  els.applyPresetBtn?.addEventListener("click", () => {
    if (!state.masterOk || !els.presetSelect) return;
    applyPresetById(els.presetSelect.value);
  });

  els.saveBuildBtn?.addEventListener("click", () => {
    if (!state.masterOk) return;
    const normalizedDraft = {
      ...state.draft,
      name: (state.draft.name || "").trim() || "名称未設定ゴーレム",
      tactic: normalizeTactic(state.draft.tactic)
    };
    const check = validateBuildRarityLimits(normalizedDraft, state.masterData);
    if (!check.ok) {
      showRarityViolationAlert(check.violations);
      return;
    }
    const saved = saveCustomBuild(normalizedDraft);
    state.draft.id = saved.id;
    state.draft.tactic = normalizeTactic(saved.tactic);
    clearRarityViolationAlert();
    renderSavedBuilds();
    showToast(`「${saved.name}」を保存しました`);
  });

  els.saveAsNewBtn?.addEventListener("click", () => {
    if (!state.masterOk) return;
    const baseName = (state.draft.name || "").trim() || "名称未設定ゴーレム";
    const candidate = {
      ...state.draft,
      id: `custom_${Date.now()}`,
      name: `${baseName} コピー`,
      tactic: normalizeTactic(state.draft.tactic)
    };
    const check = validateBuildRarityLimits(candidate, state.masterData);
    if (!check.ok) {
      showRarityViolationAlert(check.violations);
      return;
    }
    const saved = saveCustomBuild(candidate);
    state.draft.id = saved.id;
    state.draft.name = saved.name;
    state.draft.tactic = normalizeTactic(saved.tactic);
    if (els.golemName) els.golemName.value = saved.name;
    clearRarityViolationAlert();
    renderSavedBuilds();
    showToast(`「${saved.name}」として保存しました`);
  });

  els.exportJsonBtn?.addEventListener("click", () => {
    if (!state.masterOk) return;
    const tacticValue = normalizeTactic(state.draft.tactic);
    const payload = {
      version: "1.1",
      name: (state.draft.name || "").trim() || "名称未設定ゴーレム",
      parts: {
        core: state.draft.core,
        head: state.draft.head,
        rightArm: state.draft.rightArm,
        leftArm: state.draft.leftArm,
        rightWeapon: state.draft.rightWeapon || null,
        leftWeapon: state.draft.leftWeapon || null,
        rightLeg: state.draft.rightLeg,
        leftLeg: state.draft.leftLeg
      },
      tactic: tacticValue
    };
    const check = validateBuildRarityLimits(payload.parts, state.masterData);
    if (!check.ok) {
      showRarityViolationAlert(check.violations);
      return;
    }
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).then(
      () => showToast("ビルドJSONをコピーしました"),
      () => showToast("JSONを生成しました")
    );
  });

  els.importJsonBtn?.addEventListener("click", async () => {
    if (!state.masterOk) return;
    const textareaValue = els.importJsonTextarea?.value?.trim();
    if (textareaValue) {
      importBuildFromJsonText(textareaValue);
      return;
    }
    if (els.importJsonInput) {
      els.importJsonInput.click();
      return;
    }
    if (navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        importBuildFromJsonText(text);
      } catch {
        showToast("クリップボードからJSONを読み取れませんでした。");
      }
    }
  });

  els.importJsonInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importBuildFromJsonText(String(reader.result || ""));
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  els.reloadDataBtn?.addEventListener("click", async () => {
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
  setControlsLocked(true);
  bindEvents();
  const res = await loadGolemMasterData();
  await applyMasterLoadResult(res);
}

init();