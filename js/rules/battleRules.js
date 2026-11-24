export const BATTLE_CONFIG = {
  baseHitRate: 70,
  baseEvadeRate: 10,
  minHitRate: 5,
  maxHitRate: 95,
  minEvadeRate: 0,
  maxEvadeRate: 60,

  // 攻撃に専念（精密攻撃）：移動0・命中低下（個別調整用）・回避低下・狙った部位に確定ヒット
  precisionAccMod: -15,
  precisionEvadeMod: -10,

  // 攻撃に専念（通常攻撃）：移動0・命中上昇・回避低下・ランダム部位
  normalAccMod: 10,
  normalEvadeMod: -5,

  // 移動に専念：移動力+1・攻撃なし・回避上昇
  moveOnlyExtraMove: 1,
  moveOnlyEvadeMod: 15,

  // 移動しながら攻撃：移動力だけ移動・命中低下（個別調整用）・回避据え置き・ランダム部位
  moveAttackAccMod: -10,
  moveAttackEvadeMod: 0,

  // 二刀流補正（両手に有効な武器ありで2回攻撃可能、命中1段階DOWN相当）
  dualWieldAccMod: -10,

  // 部位破壊ペナルティ・特殊効果
  brokenHeadAccMod: -15,
  floatEvadeMod: 15,
  seraphimPowerMultiplier: 1.2,
  aegisMagicMultiplier: 0.5,

  // 戦闘初期値・上限
  initialDistance: 3,
  minDistance: 1,
  maxTurns: 30
};

export const DUAL_WIELD_ACC_PENALTY = BATTLE_CONFIG.dualWieldAccMod;

export const TACTICS = {
  PRECISION_SNIPE: "精密狙撃で仕留めろ",
  SURE_PUSH: "確実に当てて押し切れ",
  CONTROL_RANGE: "間合いを制して翻弄せよ",
  SURVIVE_SMART: "しぶとく生き残れ",
  ALL_OUT_SWEEP: "全力で薙ぎ払え"
};

function normalizeTactic(tactic) {
  const legacyMap = {
    "ガンガン近づけ": TACTICS.SURE_PUSH,
    "バランスよく戦え": TACTICS.SURE_PUSH,
    "距離をとって戦え": TACTICS.CONTROL_RANGE,
    "省エネ・粘り強く戦え": TACTICS.SURVIVE_SMART
  };
  return legacyMap[tactic] || tactic || TACTICS.SURE_PUSH;
}

function partText(part) {
  if (!part) return "";
  return `${part.slot || ""} ${part.cat || ""} ${part.name || ""} ${part.note || ""}`;
}

export function isDualArmPart(part) {
  return partText(part).includes("両腕");
}

export function isDualWeaponPart(part) {
  const t = partText(part);
  return t.includes("両手") || t.includes("両腕");
}

export function isDualLegPart(part) {
  const t = partText(part);
  return (
    t.includes("両脚") ||
    t.includes("両脚占有") ||
    t.includes("ユニット") ||
    t.includes("多脚")
  );
}

export function isIntegratedWeaponPart(part) {
  const t = partText(part);
  return t.includes("武器一体") || t.includes("一体型") || t.includes("武器内蔵");
}

function isShieldPart(part) {
  if (!part) return false;
  const t = partText(part);
  return String(part.cat || "").includes("盾") || t.includes("シールド");
}

function isMagicWeapon(part) {
  if (!part) return false;
  const t = partText(part);
  return String(part.cat || "").includes("魔力") || t.includes("魔力") || (Number(part.useCost) || 0) > 0;
}

function hasMoveAttackPenetration(fighter) {
  return fighter.partsList.some((p) => partText(p).includes("移動攻撃の命中低下無効"));
}

function hasFloatBonus(fighter) {
  return fighter.partsList.some((p) => partText(p).includes("回避率UP"));
}

function hasSeraphimBonus(fighter) {
  return fighter.partsList.some((p) => partText(p).includes("威力+20%"));
}

function getWeaponPower(part) {
  if (!part) return 0;
  return Number(part.power ?? part.atk ?? part.attack ?? 0) || 0;
}

function getWeaponCost(part) {
  if (!part) return 0;
  return Number(part.useCost ?? part.mpCost ?? part.cost ?? 0) || 0;
}

function parseRange(rangeVal) {
  if (rangeVal === null || rangeVal === undefined || rangeVal === "" || rangeVal === "-") {
    return { min: 1, max: 1 };
  }
  if (typeof rangeVal === "number" && Number.isFinite(rangeVal)) {
    const v = Math.max(1, Math.floor(rangeVal));
    return { min: 1, max: v };
  }
  const str = String(rangeVal).trim();
  const rangeMatch = str.match(/(\d+)\s*[~\-〜～]\s*(\d+)/);
  if (rangeMatch) {
    const min = Math.max(1, Number(rangeMatch[1]));
    const max = Math.max(min, Number(rangeMatch[2]));
    return { min, max };
  }
  const singleMatch = str.match(/(\d+)/);
  if (singleMatch) {
    const max = Math.max(1, Number(singleMatch[1]));
    return { min: 1, max };
  }
  return { min: 1, max: 1 };
}

function isInRange(weapon, distance) {
  const { min, max } = parseRange(weapon.range);
  return distance >= min && distance <= max;
}

function getWeaponAcc(part) {
  if (!part) return 0;
  return Number(part.acc ?? part.accuracy ?? 0) || 0;
}

function createPartState(part, fallbackName, fallbackHp, baseMove = 0, partKey = "") {
  const hp = Math.max(1, Number(part?.hp) || fallbackHp);
  return {
    key: partKey,
    id: part?.id || null,
    name: part?.name || fallbackName,
    cat: part?.cat || "",
    slot: part?.slot || "",
    note: part?.note || "",
    hp,
    maxHp: hp,
    move: Number(part?.move) || baseMove,
    acc: Number(part?.acc) || 0,
    broken: false
  };
}

export function calcTotalPartsHp(fighter) {
  const partKeys = ["core", "head", "rightArm", "leftArm", "rightLeg", "leftLeg"];
  const seenLinked = new Set();
  let currentTotal = 0;
  let maxTotal = 0;

  for (const key of partKeys) {
    const p = fighter.parts?.[key];
    if (!p) continue;
    if (p.linkedTo) {
      if (seenLinked.has(p.linkedTo)) continue;
      seenLinked.add(p.linkedTo);
    }
    currentTotal += Math.max(0, Number(p.hp) || 0);
    maxTotal += Math.max(0, Number(p.maxHp) || 0);
  }

  for (const s of fighter.shields || []) {
    currentTotal += Math.max(0, Number(s.hp) || 0);
    maxTotal += Math.max(0, Number(s.maxHp) || 0);
  }

  return { currentTotal, maxTotal };
}

export function calcFighterStats(build = {}, masterData = {}) {
  const byId = masterData?.byId || {};
  const corePart = byId[build.core] || { name: "クレイコア", hp: 300, maxMp: 100, mpRegen: 15, baseCost: 5 };
  const headPart = byId[build.head] || { name: "ストーンヘッド", hp: 100, baseCost: 1, acc: 0 };
  const rArmPart = byId[build.rightArm] || { name: "ウッドアーム", hp: 90, baseCost: 1, acc: 0 };
  const lArmPart = byId[build.leftArm] || { name: "ウッドアーム", hp: 90, baseCost: 1, acc: 0 };
  const rLegPart = byId[build.rightLeg] || { name: "ストーンレッグ", hp: 110, baseCost: 2, move: 1 };
  const lLegPart = byId[build.leftLeg] || { name: "ストーンレッグ", hp: 110, baseCost: 2, move: 1 };
  const rWeapPart = build.rightWeapon ? (byId[build.rightWeapon] || null) : null;
  const lWeapPart = build.leftWeapon ? (byId[build.leftWeapon] || null) : null;

  const isDualLeg = isDualLegPart(rLegPart) || isDualLegPart(lLegPart);
  const isDualArm = isDualArmPart(rArmPart) || isDualArmPart(lArmPart);
  const isDualWeapon = Boolean(
    (rWeapPart && isDualWeaponPart(rWeapPart)) || (lWeapPart && isDualWeaponPart(lWeapPart))
  );

  const activeParts = [corePart, headPart, rArmPart];
  if (!isDualArm && build.leftArm && lArmPart) activeParts.push(lArmPart);
  activeParts.push(rLegPart);
  if (!isDualLeg && build.leftLeg && lLegPart) activeParts.push(lLegPart);
  if (rWeapPart) activeParts.push(rWeapPart);
  if (!isDualWeapon && lWeapPart) activeParts.push(lWeapPart);

  const baseCost = activeParts.reduce((sum, p) => sum + (Number(p?.baseCost) || 0), 0);
  const mpRegen = (Number(corePart.mpRegen) || 0) - baseCost;

  const parts = {
    core: createPartState(corePart, "核", 300, 0, "core"),
    head: createPartState(headPart, "頭部", 100, 0, "head"),
    rightArm: createPartState(rArmPart, "右腕", 90, 0, "rightArm"),
    leftArm: isDualArm
      ? { ...createPartState(rArmPart, "左腕（両腕占有）", 90, 0, "leftArm"), linkedTo: "rightArm" }
      : createPartState(lArmPart, "左腕", 90, 0, "leftArm"),
    rightLeg: createPartState(rLegPart, "右脚", 110, 1, "rightLeg"),
    leftLeg: isDualLeg
      ? { ...createPartState(rLegPart, "左脚（両脚占有）", 110, 0, "leftLeg"), linkedTo: "rightLeg" }
      : createPartState(lLegPart, "左脚", 110, 1, "leftLeg")
  };

  const shields = [];
  if (rWeapPart && isShieldPart(rWeapPart)) {
    shields.push({
      ...rWeapPart,
      hand: isDualWeapon ? "両手" : "右手",
      hp: Math.max(1, Number(rWeapPart.hp) || 120),
      maxHp: Math.max(1, Number(rWeapPart.hp) || 120),
      broken: false
    });
  }
  if (!isDualWeapon && lWeapPart && isShieldPart(lWeapPart)) {
    shields.push({
      ...lWeapPart,
      hand: "左手",
      hp: Math.max(1, Number(lWeapPart.hp) || 120),
      maxHp: Math.max(1, Number(lWeapPart.hp) || 120),
      broken: false
    });
  }

  const handWeapons = [];
  const rArmIntegrated = isIntegratedWeaponPart(rArmPart);
  const lArmIntegrated = !isDualArm && isIntegratedWeaponPart(lArmPart);

  if (rWeapPart && !rArmIntegrated && !isShieldPart(rWeapPart) && getWeaponPower(rWeapPart) > 0) {
    handWeapons.push({
      ...rWeapPart,
      power: getWeaponPower(rWeapPart),
      useCost: getWeaponCost(rWeapPart),
      range: rWeapPart.range ?? "1~2",
      acc: getWeaponAcc(rWeapPart),
      hand: isDualWeapon ? "両手" : "右手",
      sourceArm: isDualWeapon ? "bothArms" : "rightArm",
      isMagic: isMagicWeapon(rWeapPart)
    });
  }
  if (!isDualWeapon && lWeapPart && !lArmIntegrated && !isShieldPart(lWeapPart) && getWeaponPower(lWeapPart) > 0) {
    handWeapons.push({
      ...lWeapPart,
      power: getWeaponPower(lWeapPart),
      useCost: getWeaponCost(lWeapPart),
      range: lWeapPart.range ?? "1~2",
      acc: getWeaponAcc(lWeapPart),
      hand: "左手",
      sourceArm: "leftArm",
      isMagic: isMagicWeapon(lWeapPart)
    });
  }

  const builtinWeapons = [];
  const candidates = [
    { part: headPart, sourceArm: null, label: "頭部内蔵" },
    { part: rArmPart, sourceArm: isDualArm ? "bothArms" : "rightArm", label: "右腕一体" },
    ...(isDualArm ? [] : [{ part: lArmPart, sourceArm: "leftArm", label: "左腕一体" }])
  ];
  candidates.forEach(({ part, sourceArm, label }) => {
    if (part && getWeaponPower(part) > 0) {
      builtinWeapons.push({
        ...part,
        power: getWeaponPower(part),
        useCost: getWeaponCost(part),
        range: part.range ?? "1",
        acc: getWeaponAcc(part),
        hand: label,
        sourceArm,
        isMagic: isMagicWeapon(part)
      });
    }
  });

  const isDualWield = !isDualWeapon && handWeapons.length >= 2;
  const tactic = normalizeTactic(build.tactic);
  const maxHp = parts.core.maxHp;
  const maxMp = Math.max(0, Number(corePart.maxMp) || 100);

  const fighter = {
    name: build.name || "名称未設定ゴーレム",
    tactic,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    mpRegen,
    parts,
    shields,
    handWeapons,
    builtinWeapons,
    isDualLeg,
    isDualArm,
    isDualWeapon,
    isDualWield,
    surrendered: false,
    partsList: activeParts.filter(Boolean),
    equipmentSummary: {
      core: corePart.name || "なし",
      head: headPart.name || "なし",
      rightArm: rArmPart.name || "なし",
      leftArm: isDualArm ? `${rArmPart.name}（両腕占有）` : (lArmPart.name || "なし"),
      leg: isDualLeg
        ? `${rLegPart.name}（両脚占有）`
        : `${rLegPart.name || "なし"} / ${lLegPart.name || "なし"}`,
      rightWeapon: rWeapPart ? rWeapPart.name : "なし",
      leftWeapon: isDualWeapon
        ? `${rWeapPart ? rWeapPart.name : lWeapPart?.name || "なし"}（両手占有）`
        : (lWeapPart ? lWeapPart.name : "なし")
    }
  };

  fighter.move = calcCurrentMove(fighter);
  fighter.accBonus = calcCurrentAccBonus(fighter);
  return fighter;
}

export function calcCurrentMove(fighter) {
  const rLeg = fighter.parts.rightLeg;
  const lLeg = fighter.parts.leftLeg;
  const rMove = rLeg && !rLeg.broken ? Math.max(0, Number(rLeg.move) || 0) : 0;

  if (fighter.isDualLeg) {
    return rMove;
  }

  const lMove = lLeg && !lLeg.broken ? Math.max(0, Number(lLeg.move) || 0) : 0;
  return rMove + lMove;
}

export function canUseMoveActions(fighter) {
  const rLeg = fighter.parts.rightLeg;
  const lLeg = fighter.parts.leftLeg;
  if (fighter.isDualLeg) {
    return Boolean(rLeg && !rLeg.broken);
  }
  const rAlive = Boolean(rLeg && !rLeg.broken);
  const lAlive = Boolean(lLeg && !lLeg.broken);
  return rAlive || lAlive;
}

export function canUsePrecisionAttack(fighter) {
  return Boolean(fighter.parts.head && !fighter.parts.head.broken);
}

function isWeaponUsableByParts(fighter, weapon) {
  if (!weapon) return false;
  const rArmBroken = Boolean(fighter.parts.rightArm?.broken);
  const lArmBroken = Boolean(fighter.parts.leftArm?.broken);

  if (weapon.sourceArm === "bothArms") {
    return !rArmBroken && !lArmBroken;
  }
  if (weapon.sourceArm === "rightArm") {
    return !rArmBroken;
  }
  if (weapon.sourceArm === "leftArm") {
    return !lArmBroken;
  }
  return true;
}

export function calcCurrentAccBonus(fighter) {
  let bonus = 0;
  if (fighter.parts.head && !fighter.parts.head.broken) {
    bonus += getWeaponAcc(fighter.parts.head);
  } else {
    bonus += BATTLE_CONFIG.brokenHeadAccMod;
  }
  if (fighter.parts.rightArm && !fighter.parts.rightArm.broken) {
    bonus += getWeaponAcc(fighter.parts.rightArm);
  }
  if (!fighter.isDualArm && fighter.parts.leftArm && !fighter.parts.leftArm.broken) {
    bonus += getWeaponAcc(fighter.parts.leftArm);
  }
  if (fighter.isDualLeg) {
    if (fighter.parts.rightLeg && !fighter.parts.rightLeg.broken) {
      bonus += getWeaponAcc(fighter.parts.rightLeg);
    }
  } else {
    if (fighter.parts.rightLeg && !fighter.parts.rightLeg.broken) {
      bonus += getWeaponAcc(fighter.parts.rightLeg);
    }
    if (fighter.parts.leftLeg && !fighter.parts.leftLeg.broken) {
      bonus += getWeaponAcc(fighter.parts.leftLeg);
    }
  }
  return bonus;
}

function getAvailableWeapons(fighter, mpLimit = fighter.mp) {
  const usableHand = (fighter.handWeapons || []).filter(
    (w) => getWeaponPower(w) > 0 && isWeaponUsableByParts(fighter, w)
  );
  if (usableHand.length > 0) {
    return usableHand.filter((w) => getWeaponCost(w) <= mpLimit);
  }
  const usableBuiltin = (fighter.builtinWeapons || []).filter(
    (w) => getWeaponPower(w) > 0 && isWeaponUsableByParts(fighter, w)
  );
  return usableBuiltin.filter((w) => getWeaponCost(w) <= mpLimit);
}

// 案1：現時点で使える武器がなく、かつ毎ターンMP回復が0以下（回復待ちで使えるようになる見込みがない）なら降伏対象
function shouldSurrenderNow(fighter) {
  const hasUsableNow = getAvailableWeapons(fighter, fighter.mp).length > 0;
  if (hasUsableNow) return false;
  return Number(fighter.mpRegen || 0) <= 0;
}

function pickWeaponsForAction(fighter, distanceAfterMove, actionType, tactic) {
  if (actionType === "c") return [];

  const available = getAvailableWeapons(fighter, fighter.mp);
  if (available.length === 0) return [];

  const inRange = available.filter((w) => isInRange(w, distanceAfterMove));
  if (inRange.length === 0) return [];

  if (tactic === TACTICS.SURVIVE_SMART) {
    const cheapest = [...inRange].sort((a, b) => getWeaponCost(a) - getWeaponCost(b))[0];
    return [cheapest];
  }

  return inRange;
}

function pickTargetPart(defender, actionType, preferredTargetKey = null) {
  const parts = defender.parts;
  const destructibleKeys = ["head", "rightArm", "leftArm", "rightLeg", "leftLeg", "core"];
  const aliveKeys = destructibleKeys.filter((k) => parts[k] && !parts[k].broken);

  if (aliveKeys.length === 0) return null;

  if (actionType === "a" && preferredTargetKey) {
    const target = parts[preferredTargetKey];
    if (target && !target.broken) return target;
    if (preferredTargetKey === "leftArm" && parts.rightArm && !parts.rightArm.broken) {
      return parts.rightArm;
    }
    if (preferredTargetKey === "leftLeg" && parts.rightLeg && !parts.rightLeg.broken) {
      return parts.rightLeg;
    }
  }

  const weights = {
    core: 35,
    rightArm: 16,
    leftArm: 16,
    rightLeg: 13,
    leftLeg: 13,
    head: 12
  };
  const pool = aliveKeys.map((key) => ({ key, weight: weights[key] || 10 }));
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * totalWeight;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return parts[item.key];
  }
  return parts[pool[pool.length - 1].key];
}

function choosePreferredTargetPart(defender) {
  const candidates = ["rightArm", "leftArm", "rightLeg", "leftLeg", "head", "core"];
  for (const key of candidates) {
    const p = defender.parts[key];
    if (p && !p.broken) return key;
  }
  return "core";
}

function decideTurnAction(actor, defender, currentDistance) {
  actor.move = calcCurrentMove(actor);
  actor.accBonus = calcCurrentAccBonus(actor);

  const canMove = canUseMoveActions(actor);
  const canPrecision = canUsePrecisionAttack(actor);
  const baseMove = actor.move;
  const movePlusOne = baseMove + BATTLE_CONFIG.moveOnlyExtraMove;

  const afterAdvanceDist = Math.max(BATTLE_CONFIG.minDistance, currentDistance - baseMove);
  const afterRetreatDist = currentDistance + baseMove;
  const afterMoveOnlyAdvanceDist = Math.max(BATTLE_CONFIG.minDistance, currentDistance - movePlusOne);

  const usableWeapons = getAvailableWeapons(actor, actor.mp);
  const hasAnyInRangeNow = usableWeapons.some((w) => isInRange(w, currentDistance));
  const hasAnyInRangeAfterAdvance = usableWeapons.some((w) => isInRange(w, afterAdvanceDist));
  const hasAnyInRangeAfterRetreat = usableWeapons.some((w) => isInRange(w, afterRetreatDist));

  const targetKey = choosePreferredTargetPart(defender);

  const makePlan = (actionType, moveDelta, label) => ({
    actor,
    actionType,
    moveDelta,
    label,
    targetKey: actionType === "a" ? targetKey : null
  });

  const tryPrecision = () =>
    canPrecision && hasAnyInRangeNow
      ? makePlan("a", 0, "攻撃に専念（精密攻撃）")
      : null;

  const tryNormal = () =>
    hasAnyInRangeNow
      ? makePlan("b", 0, "攻撃に専念（通常攻撃）")
      : null;

  const tryMoveAttack = (preferredDir = "advance") => {
    if (!canMove || baseMove <= 0 || usableWeapons.length === 0) return null;
    if (preferredDir === "retreat") {
      if (hasAnyInRangeAfterRetreat) {
        return makePlan("d", baseMove, "移動しながら攻撃（後退）");
      }
      if (!hasAnyInRangeNow && hasAnyInRangeAfterAdvance) {
        return makePlan("d", afterAdvanceDist - currentDistance, "移動しながら攻撃（接近）");
      }
      return null;
    }
    if (!hasAnyInRangeNow && hasAnyInRangeAfterAdvance) {
      return makePlan("d", afterAdvanceDist - currentDistance, "移動しながら攻撃（接近）");
    }
    if (!hasAnyInRangeNow && hasAnyInRangeAfterRetreat) {
      return makePlan("d", baseMove, "移動しながら攻撃（後退）");
    }
    return null;
  };

  const tryMoveOnly = (preferredDir = "advance") => {
    if (!canMove || movePlusOne <= 0) return null;
    if (preferredDir === "retreat") {
      if (hasAnyInRangeNow) return null;
      return makePlan("c", movePlusOne, "移動に専念（後退）");
    }
    if (!hasAnyInRangeNow && currentDistance > BATTLE_CONFIG.minDistance) {
      const delta = afterMoveOnlyAdvanceDist - currentDistance;
      return makePlan("c", delta, "移動に専念（接近）");
    }
    if (!hasAnyInRangeNow) {
      return makePlan("c", movePlusOne, "移動に専念（距離調整）");
    }
    return null;
  };

  const stayPut = () => makePlan("b", 0, "攻撃に専念（通常攻撃・待機）");

  switch (actor.tactic) {
    case TACTICS.PRECISION_SNIPE:
      return (
        tryPrecision() ||
        tryNormal() ||
        tryMoveAttack("advance") ||
        tryMoveOnly("advance") ||
        stayPut()
      );

    case TACTICS.SURE_PUSH:
      return (
        tryNormal() ||
        tryMoveAttack("advance") ||
        tryPrecision() ||
        tryMoveOnly("advance") ||
        stayPut()
      );

    case TACTICS.CONTROL_RANGE:
      return (
        tryMoveAttack("retreat") ||
        tryNormal() ||
        tryMoveOnly("retreat") ||
        tryMoveAttack("advance") ||
        tryMoveOnly("advance") ||
        stayPut()
      );

    case TACTICS.SURVIVE_SMART:
      return (
        tryNormal() ||
        tryPrecision() ||
        tryMoveAttack("advance") ||
        tryMoveOnly("advance") ||
        stayPut()
      );

    case TACTICS.ALL_OUT_SWEEP:
      return (
        tryNormal() ||
        tryMoveAttack("advance") ||
        tryPrecision() ||
        tryMoveOnly("advance") ||
        stayPut()
      );

    default:
      return tryNormal() || tryMoveAttack("advance") || tryMoveOnly("advance") || stayPut();
  }
}

function calcHitChance(actor, defender, weapon, plan) {
  let accMod = 0;
  let evaMod = 0;

  if (plan.actionType === "a") {
    accMod += BATTLE_CONFIG.precisionAccMod;
    evaMod += BATTLE_CONFIG.precisionEvadeMod;
  } else if (plan.actionType === "b") {
    accMod += BATTLE_CONFIG.normalAccMod;
    evaMod += BATTLE_CONFIG.normalEvadeMod;
  } else if (plan.actionType === "d") {
    const ignoreMovePen = plan.moveDelta !== 0 && hasMoveAttackPenetration(actor);
    if (!ignoreMovePen) {
      accMod += BATTLE_CONFIG.moveAttackAccMod;
    }
    evaMod += BATTLE_CONFIG.moveAttackEvadeMod;
  }

  const dualMod = actor.isDualWield ? BATTLE_CONFIG.dualWieldAccMod : 0;
  const rawHit =
    BATTLE_CONFIG.baseHitRate +
    (actor.accBonus || 0) +
    getWeaponAcc(weapon) +
    accMod +
    dualMod;

  const defenderEvade = Math.max(
    BATTLE_CONFIG.minEvadeRate,
    Math.min(
      BATTLE_CONFIG.maxEvadeRate,
      BATTLE_CONFIG.baseEvadeRate + (hasFloatBonus(defender) ? BATTLE_CONFIG.floatEvadeMod : 0) + evaMod
    )
  );

  const hitChance = Math.round(rawHit - defenderEvade);
  return Math.max(BATTLE_CONFIG.minHitRate, Math.min(BATTLE_CONFIG.maxHitRate, hitChance));
}

function applyDamageToPart(defender, targetPart, rawDamage, isMagic, logs) {
  let dmg = Math.max(1, Math.round(rawDamage));

  if (isMagic && defender.shields?.some((s) => !s.broken && partText(s).includes("半減"))) {
    dmg = Math.max(1, Math.floor(dmg * BATTLE_CONFIG.aegisMagicMultiplier));
  }

  const armKey = targetPart.key;
  if (armKey === "rightArm" || armKey === "leftArm") {
    const activeShield = (defender.shields || []).find(
      (s) => !s.broken && (s.hand === (armKey === "rightArm" ? "右手" : "左手") || s.hand === "両手")
    );
    if (activeShield) {
      activeShield.hp = Math.max(0, activeShield.hp - dmg);
      logs.push(
        `・シールド「${activeShield.name}」が ${dmg} ダメージを肩代わり\n（盾耐久:${activeShield.hp}/${activeShield.maxHp}）`
      );
      if (activeShield.hp <= 0) {
        activeShield.broken = true;
        logs.push(`・シールド「${activeShield.name}」が破壊された`);
      }
      return;
    }
  }

  targetPart.hp = Math.max(0, targetPart.hp - dmg);

  if (targetPart.key === "core") {
    defender.hp = targetPart.hp;
  }

  logs.push(
    `・${defender.name} の「${targetPart.name}」に ${dmg} ダメージ\n（部位耐久:${targetPart.hp}/${targetPart.maxHp} / 核耐久:${defender.hp}/${defender.maxHp}）`
  );

  if (targetPart.hp <= 0 && !targetPart.broken) {
    targetPart.broken = true;
    logs.push(`・【部位破壊】${defender.name} の「${targetPart.name}」が破壊された`);

    if (targetPart.key === "head") {
      defender.accBonus = calcCurrentAccBonus(defender);
      logs.push(`  → 頭部破壊：命中率低下（${BATTLE_CONFIG.brokenHeadAccMod}%）・精密攻撃不可`);
    } else if (targetPart.key === "rightArm" || targetPart.key === "leftArm") {
      logs.push(`  → ${targetPart.name} 破壊：該当腕の武器攻撃不可`);
    } else if (targetPart.key === "rightLeg" || targetPart.key === "leftLeg") {
      defender.move = calcCurrentMove(defender);
      logs.push(`  → ${targetPart.name} 破壊：移動力が ${defender.move} に低下`);
      if (!canUseMoveActions(defender)) {
        logs.push(`  → 両脚破壊：「移動に専念」「移動しながら攻撃」が選択不可`);
      }
    } else if (targetPart.key === "core") {
      defender.hp = 0;
      logs.push(`  → 【核破壊】${defender.name} の核が破壊された（同ターン攻撃判定は継続）`);
    }
  }
}

function executePlanAttacks(plan, defender, distanceAfterMove, logs) {
  const { actor, actionType } = plan;

  if (actionType === "c") {
    logs.push(`・${actor.name} は移動に専念したため攻撃なし`);
    return;
  }

  const weapons = pickWeaponsForAction(actor, distanceAfterMove, actionType, actor.tactic);
  if (weapons.length === 0) {
    const hadWeapons = getAvailableWeapons(actor, actor.mp).length > 0;
    if (hadWeapons) {
      logs.push(
        `・${actor.name} は移動の結果、射程外となり攻撃できず\n（現在距離:${distanceAfterMove} / 残MP:${actor.mp}）`
      );
    } else {
      logs.push(
        `・${actor.name} は攻撃可能な武器がないか魔力不足のため攻撃できず\n（残MP:${actor.mp} / 毎ターンMP回復:${actor.mpRegen}）`
      );
    }
    return;
  }

  for (const weapon of weapons) {
    const cost = getWeaponCost(weapon);
    if (cost > actor.mp) {
      logs.push(`・${actor.name} は魔力不足で「${weapon.name}」の追撃を見送り\n（残MP:${actor.mp}）`);
      break;
    }

    actor.mp = Math.max(0, actor.mp - cost);
    const hitChance = calcHitChance(actor, defender, weapon, plan);
    const roll = Math.random() * 100;
    const handPrefix = weapon.hand ? `[${weapon.hand}] ` : "";
    const dualTag = actor.isDualWield ? "・二刀流補正" : "";

    if (roll > hitChance) {
      logs.push(
        `・${actor.name} の${handPrefix}「${weapon.name}」は外れた\n（命中:${hitChance}%${dualTag} / 消費MP:${cost} / 残MP:${actor.mp}）`
      );
      continue;
    }

    let basePower = getWeaponPower(weapon);
    if (hasSeraphimBonus(actor)) {
      basePower = basePower * BATTLE_CONFIG.seraphimPowerMultiplier;
    }

    const targetPart = pickTargetPart(defender, actionType, plan.targetKey);
    if (!targetPart) {
      logs.push(`・${actor.name} の${handPrefix}「${weapon.name}」が命中したが対象部位なし`);
      continue;
    }

    logs.push(
      `・${actor.name} が${handPrefix}「${weapon.name}」で攻撃命中（狙い/着弾：${targetPart.name}）\n（命中:${hitChance}%${dualTag} / 消費MP:${cost} / 残MP:${actor.mp}）`
    );
    applyDamageToPart(defender, targetPart, basePower, Boolean(weapon.isMagic), logs);
  }
}

export function runAutoBattle(build1, build2, masterData) {
  const f1 = calcFighterStats(build1, masterData);
  const f2 = calcFighterStats(build2, masterData);
  let distance = BATTLE_CONFIG.initialDistance;
  const logs = [];

  const initParts1 = calcTotalPartsHp(f1);
  const initParts2 = calcTotalPartsHp(f2);

  logs.push(
    `[T1] ${f1.name} vs ${f2.name}\n（${f1.name} 核:${f1.hp}/${f1.maxHp}・全部位:${initParts1.currentTotal}/${initParts1.maxTotal}・MP:${f1.mp}/${f1.maxMp}\n / ${f2.name} 核:${f2.hp}/${f2.maxHp}・全部位:${initParts2.currentTotal}/${initParts2.maxTotal}・MP:${f2.mp}/${f2.maxMp} / 初期距離:${distance}）`
  );

  let surrender1 = false;
  let surrender2 = false;

  for (let turn = 1; turn <= BATTLE_CONFIG.maxTurns; turn += 1) {
    if (f1.hp <= 0 || f2.hp <= 0) break;

    if (turn > 1) {
      logs.push(`--- ターン ${turn}（開始時距離:${distance}）---`);
    }

    for (const f of [f1, f2]) {
      f.mp = Math.max(0, Math.min(f.maxMp, f.mp + f.mpRegen));
    }

    // 案1：現在使える攻撃手段がなく、かつ毎ターンMP回復が0以下なら降伏
    const noAttack1 = shouldSurrenderNow(f1);
    const noAttack2 = shouldSurrenderNow(f2);
    if (noAttack1 || noAttack2) {
      if (noAttack1) {
        f1.surrendered = true;
        surrender1 = true;
        logs.push(
          `・【降伏】${f1.name} は攻撃手段がなく、魔力回復も見込めないため降伏した\n（残MP:${f1.mp} / 毎ターンMP回復:${f1.mpRegen}）`
        );
      }
      if (noAttack2) {
        f2.surrendered = true;
        surrender2 = true;
        logs.push(
          `・【降伏】${f2.name} は攻撃手段がなく、魔力回復も見込めないため降伏した\n（残MP:${f2.mp} / 毎ターンMP回復:${f2.mpRegen}）`
        );
      }
      break;
    }

    const plan1 = decideTurnAction(f1, f2, distance);
    const plan2 = decideTurnAction(f2, f1, distance);
    logs.push(
      `・行動選択\n（${f1.name}：${plan1.label}\n / ${f2.name}：${plan2.label}）`
    );

    const totalMoveDelta = plan1.moveDelta + plan2.moveDelta;
    if (totalMoveDelta !== 0) {
      distance = Math.max(BATTLE_CONFIG.minDistance, distance + totalMoveDelta);
    }
    logs.push(
      `・移動完了\n（現在距離:${distance}\n / ${f1.name} MP:${f1.mp}・核:${f1.hp}\n / ${f2.name} MP:${f2.mp}・核:${f2.hp}）`
    );

    executePlanAttacks(plan1, f2, distance, logs);
    executePlanAttacks(plan2, f1, distance, logs);

    if (f1.hp <= 0 || f2.hp <= 0) {
      break;
    }
  }

  let winnerName = null;
  let winnerSide = null; // "fighter1" | "fighter2" | null
  let isDrawByKo = false;
  let decisionReason = "";

  if (f1.hp <= 0 && f2.hp <= 0) {
    winnerName = null;
    winnerSide = null;
    isDrawByKo = true;
    decisionReason = "相打ち（双方が同ターンに核耐久0以下）";
  } else if (f1.hp > 0 && f2.hp <= 0) {
    winnerName = f1.name;
    winnerSide = "fighter1";
    decisionReason = `${f2.name} の核耐久が0に到達`;
  } else if (f2.hp > 0 && f1.hp <= 0) {
    winnerName = f2.name;
    winnerSide = "fighter2";
    decisionReason = `${f1.name} の核耐久が0に到達`;
  } else if (surrender1 && surrender2) {
    winnerName = null;
    winnerSide = null;
    decisionReason = "双方が攻撃手段を失い降伏（引き分け）";
  } else if (surrender1) {
    winnerName = f2.name;
    winnerSide = "fighter2";
    decisionReason = `${f1.name} が攻撃手段を失い降伏`;
  } else if (surrender2) {
    winnerName = f1.name;
    winnerSide = "fighter1";
    decisionReason = `${f2.name} が攻撃手段を失い降伏`;
  } else {
    const total1 = calcTotalPartsHp(f1);
    const total2 = calcTotalPartsHp(f2);
    const ratio1 = total1.maxTotal > 0 ? total1.currentTotal / total1.maxTotal : 0;
    const ratio2 = total2.maxTotal > 0 ? total2.currentTotal / total2.maxTotal : 0;

    if (total1.currentTotal !== total2.currentTotal) {
      if (total1.currentTotal > total2.currentTotal) {
        winnerName = f1.name;
        winnerSide = "fighter1";
      } else {
        winnerName = f2.name;
        winnerSide = "fighter2";
      }
      decisionReason = `規定${BATTLE_CONFIG.maxTurns}ターン終了・全部位耐久合計（${f1.name}:${total1.currentTotal}/${total1.maxTotal} vs ${f2.name}:${total2.currentTotal}/${total2.maxTotal}）`;
    } else if (Math.abs(ratio1 - ratio2) >= 0.0001) {
      if (ratio1 > ratio2) {
        winnerName = f1.name;
        winnerSide = "fighter1";
      } else {
        winnerName = f2.name;
        winnerSide = "fighter2";
      }
      decisionReason = `規定${BATTLE_CONFIG.maxTurns}ターン終了・全部位耐久割合（${f1.name}:${Math.round(ratio1 * 100)}% vs ${f2.name}:${Math.round(ratio2 * 100)}%）`;
    } else {
      winnerName = null;
      winnerSide = null;
      decisionReason = `規定${BATTLE_CONFIG.maxTurns}ターン終了・全部位耐久同値（${total1.currentTotal} vs ${total2.currentTotal}）`;
    }
  }

  if (winnerName) {
    logs.push(`決着：${winnerName} の勝利！\n（${decisionReason}）`);
  } else if (isDrawByKo) {
    logs.push(`決着：相打ち（引き分け）！\n（${decisionReason}）`);
  } else {
    logs.push(`決着：引き分け\n（${decisionReason}）`);
  }

  return { winnerName, winnerSide, decisionReason, logs };
}