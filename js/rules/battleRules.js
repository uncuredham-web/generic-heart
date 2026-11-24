export const DUAL_WIELD_ACC_PENALTY = -10;

export function isDualArmPart(part) {
  if (!part) return false;
  const text = `${part.slot || ""} ${part.cat || ""} ${part.name || ""} ${part.note || ""}`;
  return text.includes("両腕");
}

export function isDualWeaponPart(part) {
  if (!part) return false;
  const text = `${part.slot || ""} ${part.cat || ""} ${part.name || ""} ${part.note || ""}`;
  return text.includes("両手") || text.includes("両腕");
}

export function isDualLegPart(part) {
  if (!part) return false;
  const text = `${part.slot || ""} ${part.cat || ""} ${part.name || ""} ${part.note || ""}`;
  return (
    text.includes("両脚") ||
    text.includes("両脚占有") ||
    text.includes("ユニット") ||
    text.includes("多脚")
  );
}

export function isIntegratedWeaponPart(part) {
  if (!part) return false;
  const text = `${part.slot || ""} ${part.cat || ""} ${part.name || ""} ${part.note || ""}`;
  return text.includes("武器一体") || text.includes("一体型") || text.includes("武器内蔵");
}

function getWeaponPower(part) {
  if (!part) return 0;
  return Number(part.power ?? part.atk ?? part.attack ?? 0) || 0;
}

function getWeaponCost(part) {
  if (!part) return 0;
  return Number(part.useCost ?? part.mpCost ?? part.cost ?? 0) || 0;
}

function getWeaponRange(part) {
  if (!part) return 1;
  const r = Number(part.range ?? part.reach ?? 1);
  return Number.isFinite(r) && r > 0 ? r : 1;
}

function getWeaponAcc(part) {
  if (!part) return 0;
  return Number(part.acc ?? part.accuracy ?? 0) || 0;
}

export function calcFighterStats(build, masterData) {
  const byId = masterData?.byId || {};
  const core = byId[build.core] || { name: "未選択", hp: 250, maxMp: 100, mpRegen: 15, baseCost: 0 };
  const head = byId[build.head] || { name: "未選択", baseCost: 0, acc: 0 };
  const rArm = byId[build.rightArm] || { name: "未選択", baseCost: 0, acc: 0 };
  const lArm = byId[build.leftArm] || { name: "未選択", baseCost: 0, acc: 0 };
  const rLeg = byId[build.rightLeg] || { name: "未選択", move: 1, baseCost: 0, slot: "片脚" };
  const lLeg = byId[build.leftLeg] || { name: "未選択", move: 1, baseCost: 0, slot: "片脚" };
  const rWeap = byId[build.rightWeapon] || null;
  const lWeap = byId[build.leftWeapon] || null;

  const isDualLeg = isDualLegPart(rLeg) || isDualLegPart(lLeg);
  const isDualArm = isDualArmPart(rArm) || isDualArmPart(lArm);
  const isDualWeapon = Boolean(
    (rWeap && isDualWeaponPart(rWeap)) || (lWeap && isDualWeaponPart(lWeap))
  );

  const activeParts = [core, head, rArm];
  if (!isDualArm && build.leftArm) activeParts.push(lArm);
  activeParts.push(rLeg);
  if (!isDualLeg && build.leftLeg) activeParts.push(lLeg);
  if (rWeap) activeParts.push(rWeap);
  if (!isDualWeapon && lWeap) activeParts.push(lWeap);

  const baseCost = activeParts.reduce((sum, p) => sum + (Number(p.baseCost) || 0), 0);
  const mpRegen = (Number(core.mpRegen) || 0) - baseCost;
  const move = isDualLeg ? (Number(rLeg.move) || 1) : (Number(rLeg.move) || 1) + (Number(lLeg.move) || 1);
  const accBonus = [head, rArm, lArm, rWeap, lWeap]
    .filter(Boolean)
    .reduce((sum, p) => sum + getWeaponAcc(p), 0);

  const handWeapons = [];
  if (rWeap && getWeaponPower(rWeap) > 0) {
    handWeapons.push({
      ...rWeap,
      power: getWeaponPower(rWeap),
      useCost: getWeaponCost(rWeap),
      range: getWeaponRange(rWeap),
      acc: getWeaponAcc(rWeap),
      hand: isDualWeapon ? "両手" : "右手"
    });
  }
  if (!isDualWeapon && lWeap && getWeaponPower(lWeap) > 0) {
    handWeapons.push({
      ...lWeap,
      power: getWeaponPower(lWeap),
      useCost: getWeaponCost(lWeap),
      range: getWeaponRange(lWeap),
      acc: getWeaponAcc(lWeap),
      hand: "左手"
    });
  }

  const builtinWeapons = [];
  [core, head, rArm, lArm].forEach((p, idx) => {
    if (getWeaponPower(p) > 0) {
      builtinWeapons.push({
        ...p,
        power: getWeaponPower(p),
        useCost: getWeaponCost(p),
        range: getWeaponRange(p),
        acc: getWeaponAcc(p),
        hand: `内蔵${idx + 1}`
      });
    }
  });

  const isDualWield = !isDualWeapon && handWeapons.length >= 2;

  return {
    name: build.name || "名称未設定ゴーレム",
    tactic: build.tactic || "バランスよく戦え",
    hp: Number(core.hp) || 250,
    maxHp: Number(core.hp) || 250,
    mp: Number(core.maxMp) || 100,
    maxMp: Number(core.maxMp) || 100,
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
        ? `${rWeap ? rWeap.name : lWeap.name}（両手占有）`
        : (lWeap ? lWeap.name : "なし")
    }
  };
}

function selectAttackQueue(fighter, distance) {
  const allHand = (fighter.handWeapons || []).filter((w) => getWeaponPower(w) > 0);
  const inRangeHand = allHand.filter((w) => distance <= getWeaponRange(w));
  const poolHand = inRangeHand.length > 0 ? inRangeHand : allHand;

  if (poolHand.length > 0) {
    const affordable = poolHand.filter((w) => getWeaponCost(w) <= fighter.mp);
    if (affordable.length > 0) {
      if (fighter.tactic === "省エネ・粘り強く戦え") {
        return [[...affordable].sort((a, b) => getWeaponCost(a) - getWeaponCost(b))[0]];
      }
      return affordable;
    }
    return [];
  }

  const allBuiltin = (fighter.builtinWeapons || []).filter((w) => getWeaponPower(w) > 0);
  const inRangeBuiltin = allBuiltin.filter((w) => distance <= getWeaponRange(w));
  const poolBuiltin = (inRangeBuiltin.length > 0 ? inRangeBuiltin : allBuiltin).filter(
    (w) => getWeaponCost(w) <= fighter.mp
  );
  if (poolBuiltin.length > 0) {
    return [[...poolBuiltin].sort((a, b) => getWeaponPower(b) - getWeaponPower(a))[0]];
  }

  return [];
}

function executeSingleAttack(actor, defender, weapon, logs) {
  const cost = getWeaponCost(weapon);
  actor.mp = Math.max(0, actor.mp - cost);

  const dualWieldMod = actor.isDualWield ? DUAL_WIELD_ACC_PENALTY : 0;
  const hitChance = Math.max(
    25,
    Math.min(98, 80 + (actor.accBonus || 0) + getWeaponAcc(weapon) + dualWieldMod)
  );
  const roll = Math.random() * 100;
  const handPrefix = weapon.hand && !String(weapon.hand).startsWith("内蔵") ? `[${weapon.hand}] ` : "";

  if (roll > hitChance) {
    logs.push(`・${actor.name} の${handPrefix}「${weapon.name}」は外れた！（消費MP:${cost} / 残MP:${actor.mp}）`);
    return;
  }

  const dmg = Math.max(1, getWeaponPower(weapon));
  defender.hp = Math.max(0, defender.hp - dmg);
  logs.push(
    `・${actor.name} が${handPrefix}「${weapon.name}」で攻撃！ ${defender.name} に ${dmg} ダメージ（消費MP:${cost} / 残MP:${actor.mp} / 相手耐久:${defender.hp}）`
  );

  if (defender.hp <= 0) {
    logs.push(`・${defender.name} の耐久が 0 になった！`);
  }
}

export function runAutoBattle(build1, build2, masterData) {
  const f1 = calcFighterStats(build1, masterData);
  const f2 = calcFighterStats(build2, masterData);
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
        if (getWeaponCost(weapon) > actor.mp) {
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