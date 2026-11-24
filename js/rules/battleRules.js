export const BATTLE_RULES = {
  maxTurns: 30,
  minDamage: 1,
  baseCritChance: 0.08,
  spdCritBonusPerPoint: 0.003,
  maxCritChance: 0.35,
  critMultiplier: 1.5,
  varianceMin: 0.92,
  varianceMax: 1.08
};

export const SKILLS = {
  power_smash: {
    id: "power_smash",
    name: "パワー・スマッシュ",
    cooldown: 3,
    powerMultiplier: 1.65,
    description: "防御力を貫きやすい重撃（威力1.65倍 / CT3）"
  },
  rapid_slash: {
    id: "rapid_slash",
    name: "ラピッド・スラッシュ",
    cooldown: 2,
    powerMultiplier: 1.35,
    bonusCrit: 0.12,
    description: "会心率が上がりやすい高速連撃（威力1.35倍・会心+12% / CT2）"
  },
  guard_pulse: {
    id: "guard_pulse",
    name: "ガード・パルス",
    cooldown: 3,
    healRatio: 0.14,
    tempDefMultiplier: 1.35,
    description: "最大HPの14%を修復し、1ターンの間防御力を1.35倍にする（CT3）"
  }
};

export const AI_POLICIES = {
  balanced: {
    id: "balanced",
    label: "バランス型AI",
    description: "スキルが使えるときは積極的に使用し、HPが減ったら回復スキルを優先。"
  },
  aggressive: {
    id: "aggressive",
    label: "猛攻型AI",
    description: "攻撃系スキルを最優先で叩き込み、短期決着を狙う。"
  },
  defensive: {
    id: "defensive",
    label: "堅守型AI",
    description: "HPが65%以下なら防御・回復スキルを優先して粘り強く戦う。"
  }
};

export function calculateGolemBuild(build, masterData) {
  const core =
    masterData.cores.find((c) => c.id === build.coreId) || masterData.cores[0];

  const selectedParts = ["arm", "leg", "chip"]
    .map((slot) => {
      const partId = build.parts?.[slot];
      const list = masterData.parts[slot] || [];
      return list.find((p) => p.id === partId) || list[0] || null;
    })
    .filter(Boolean);

  const stats = {
    hp: core.baseStats.hp,
    atk: core.baseStats.atk,
    def: core.baseStats.def,
    spd: core.baseStats.spd
  };

  let totalCost = core.cost;
  const unlockedSkills = [];

  for (const part of selectedParts) {
    totalCost += part.cost;
    for (const [statKey, delta] of Object.entries(part.mods || {})) {
      if (typeof stats[statKey] === "number") {
        stats[statKey] += delta;
      }
    }
    if (part.skillId && SKILLS[part.skillId]) {
      unlockedSkills.push(SKILLS[part.skillId]);
    }
  }

  stats.hp = Math.max(50, Math.round(stats.hp));
  stats.atk = Math.max(5, Math.round(stats.atk));
  stats.def = Math.max(0, Math.round(stats.def));
  stats.spd = Math.max(1, Math.round(stats.spd));

  return {
    id: build.id || `golem_${Date.now()}`,
    name: (build.name || "名称未設定ゴーレム").trim(),
    aiPolicy: AI_POLICIES[build.aiPolicy] ? build.aiPolicy : "balanced",
    core,
    parts: selectedParts,
    skills: unlockedSkills,
    stats,
    totalCost,
    costLimit: masterData.costLimit ?? 100,
    isOverCost: totalCost > (masterData.costLimit ?? 100)
  };
}

function createFighterState(golem, sideLabel) {
  const cooldowns = {};
  for (const skill of golem.skills) cooldowns[skill.id] = 0;
  return {
    sideLabel,
    name: golem.name,
    aiPolicy: golem.aiPolicy,
    maxHp: golem.stats.hp,
    hp: golem.stats.hp,
    atk: golem.stats.atk,
    def: golem.stats.def,
    spd: golem.stats.spd,
    skills: golem.skills,
    cooldowns,
    tempDefMultiplier: 1.0
  };
}

function chooseAction(actor) {
  const readySkills = actor.skills.filter((s) => (actor.cooldowns[s.id] || 0) <= 0);
  const hpRatio = actor.hp / actor.maxHp;

  const healSkill = readySkills.find((s) => Boolean(s.healRatio));
  const attackSkill = readySkills.find((s) => Boolean(s.powerMultiplier));

  if (actor.aiPolicy === "defensive") {
    if (healSkill && hpRatio <= 0.65) return { type: "skill", skill: healSkill };
    if (attackSkill) return { type: "skill", skill: attackSkill };
  } else if (actor.aiPolicy === "aggressive") {
    if (attackSkill) return { type: "skill", skill: attackSkill };
    if (healSkill && hpRatio <= 0.35) return { type: "skill", skill: healSkill };
  } else {
    if (healSkill && hpRatio <= 0.45) return { type: "skill", skill: healSkill };
    if (attackSkill) return { type: "skill", skill: attackSkill };
  }

  return { type: "basic_attack" };
}

function computeDamage(attacker, defender, multiplier = 1.0, bonusCrit = 0) {
  const effectiveDef = defender.def * defender.tempDefMultiplier;
  const raw = Math.max(
    BATTLE_RULES.minDamage,
    attacker.atk * multiplier - effectiveDef * 0.45
  );

  const critChance = Math.min(
    BATTLE_RULES.maxCritChance,
    Math.max(
      0,
      BATTLE_RULES.baseCritChance +
        attacker.spd * BATTLE_RULES.spdCritBonusPerPoint +
        bonusCrit
    )
  );

  const isCrit = Math.random() < critChance;
  const critFactor = isCrit ? BATTLE_RULES.critMultiplier : 1.0;
  const variance =
    BATTLE_RULES.varianceMin +
    Math.random() * (BATTLE_RULES.varianceMax - BATTLE_RULES.varianceMin);

  const damage = Math.max(BATTLE_RULES.minDamage, Math.round(raw * critFactor * variance));
  return { damage, isCrit };
}

function tickCooldownsAndBuffs(fighter) {
  fighter.tempDefMultiplier = 1.0;
  for (const skillId of Object.keys(fighter.cooldowns)) {
    if (fighter.cooldowns[skillId] > 0) fighter.cooldowns[skillId] -= 1;
  }
}

export function simulateBattle(golemA, golemB) {
  const fighterA = createFighterState(golemA, "A軍");
  const fighterB = createFighterState(golemB, "B軍");
  const logs = [];

  logs.push({
    turn: 0,
    kind: "info",
    text: `バトル開始！ [${fighterA.sideLabel}] ${fighterA.name} (HP:${fighterA.maxHp}) vs [${fighterB.sideLabel}] ${fighterB.name} (HP:${fighterB.maxHp})`
  });

  let winner = null;

  for (let turn = 1; turn <= BATTLE_RULES.maxTurns; turn++) {
    tickCooldownsAndBuffs(fighterA);
    tickCooldownsAndBuffs(fighterB);

    const order =
      fighterA.spd > fighterB.spd
        ? [fighterA, fighterB]
        : fighterB.spd > fighterA.spd
        ? [fighterB, fighterA]
        : Math.random() < 0.5
        ? [fighterA, fighterB]
        : [fighterB, fighterA];

    for (const actor of order) {
      if (actor.hp <= 0) continue;
      const defender = actor === fighterA ? fighterB : fighterA;
      if (defender.hp <= 0) continue;

      const action = chooseAction(actor);

      if (action.type === "skill") {
        const skill = action.skill;
        actor.cooldowns[skill.id] = skill.cooldown;

        if (skill.healRatio) {
          const healAmount = Math.max(1, Math.round(actor.maxHp * skill.healRatio));
          actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
          if (skill.tempDefMultiplier) actor.tempDefMultiplier = skill.tempDefMultiplier;
          logs.push({
            turn,
            kind: "skill",
            text: `${actor.name} の【${skill.name}】！ HPが ${healAmount} 回復（残HP:${actor.hp}/${actor.maxHp}）、防御態勢に入った。`
          });
        } else {
          const mult = skill.powerMultiplier || 1.2;
          const { damage, isCrit } = computeDamage(actor, defender, mult, skill.bonusCrit || 0);
          defender.hp = Math.max(0, defender.hp - damage);
          logs.push({
            turn,
            kind: isCrit ? "crit" : "skill",
            text: `${actor.name} のスキル【${skill.name}】！ ${defender.name} に ${damage} ダメージ${isCrit ? "（会心！）" : ""}（残HP:${defender.hp}/${defender.maxHp}）`
          });
        }
      } else {
        const { damage, isCrit } = computeDamage(actor, defender, 1.0, 0);
        defender.hp = Math.max(0, defender.hp - damage);
        logs.push({
          turn,
          kind: isCrit ? "crit" : "attack",
          text: `${actor.name} の通常攻撃！ ${defender.name} に ${damage} ダメージ${isCrit ? "（会心！）" : ""}（残HP:${defender.hp}/${defender.maxHp}）`
        });
      }

      if (defender.hp <= 0) {
        winner = actor;
        break;
      }
    }

    if (winner) break;
  }

  if (!winner) {
    if (fighterA.hp > fighterB.hp) winner = fighterA;
    else if (fighterB.hp > fighterA.hp) winner = fighterB;
    else winner = null;

    logs.push({
      turn: BATTLE_RULES.maxTurns,
      kind: "info",
      text: `${BATTLE_RULES.maxTurns}ターン終了（判定タイムアップ）。`
    });
  }

  return {
    winnerName: winner ? winner.name : "引き分け",
    winnerSide: winner ? winner.sideLabel : "DRAW",
    finalHp: { a: fighterA.hp, b: fighterB.hp },
    logs
  };
}
