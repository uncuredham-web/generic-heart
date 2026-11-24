export const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoLKur7M97rGwULb2fnoi2y8B1wsS9hgowMFDYWX9lnIiuk2e3kC-wHOgDU8v9XX-Sec31XA9MCYX7/pub?gid=501531529&single=true&output=csv";
export const DEFAULT_COST_LIMIT = 100;

export const STAT_LABELS = {
  hp: "HP",
  atk: "攻撃力",
  def: "防御力",
  spd: "素早さ"
};

export const FALLBACK_CORES = [
  {
    id: "core_balanced",
    name: "アイアン・コア",
    role: "バランス型",
    cost: 25,
    baseStats: { hp: 140, atk: 28, def: 22, spd: 18 },
    description: "安定した耐久と攻撃力を備える標準コア。"
  },
  {
    id: "core_striker",
    name: "ブレイズ・コア",
    role: "速攻アタッカー",
    cost: 30,
    baseStats: { hp: 115, atk: 38, def: 15, spd: 28 },
    description: "高い攻撃力と素早さで先手を取りやすい攻撃特化コア。"
  },
  {
    id: "core_bastion",
    name: "バスティオン・コア",
    role: "重装タンク",
    cost: 30,
    baseStats: { hp: 185, atk: 22, def: 32, spd: 12 },
    description: "圧倒的なHPと防御力で相手の猛攻を受け止める重装コア。"
  }
];

export const FALLBACK_PARTS = {
  arm: [
    {
      id: "arm_boulder",
      slot: "arm",
      name: "パイルバンカー腕",
      cost: 20,
      mods: { atk: 14, spd: -2 },
      skillId: "power_smash",
      description: "重撃スキル「パワー・スマッシュ」を解放する破砕腕。"
    },
    {
      id: "arm_twin_claw",
      slot: "arm",
      name: "ツインブレード腕",
      cost: 22,
      mods: { atk: 10, spd: 6 },
      skillId: "rapid_slash",
      description: "素早さを高め、連続攻撃「ラピッド・スラッシュ」を解放。"
    },
    {
      id: "arm_aegis_shield",
      slot: "arm",
      name: "イージス・ガントレット",
      cost: 18,
      mods: { def: 12, hp: 20 },
      skillId: "guard_pulse",
      description: "防御力を強化し、防御・修復「ガード・パルス」を解放。"
    }
  ],
  leg: [
    {
      id: "leg_crawler",
      slot: "leg",
      name: "ヘビー・キャタピラ",
      cost: 20,
      mods: { hp: 35, def: 10, spd: -4 },
      description: "足回りを犠牲に重装甲と高耐久を得る履帯脚部。"
    },
    {
      id: "leg_hopper",
      slot: "leg",
      name: "スプリング・レッグ",
      cost: 18,
      mods: { spd: 12, atk: 4 },
      description: "跳躍機構により行動順を上げやすい軽量脚部。"
    },
    {
      id: "leg_strider",
      slot: "leg",
      name: "ストライダー脚部",
      cost: 20,
      mods: { hp: 20, def: 6, spd: 5 },
      description: "機動力と耐久力のバランスに優れた二足歩行脚部。"
    }
  ],
  chip: [
    {
      id: "chip_overclock",
      slot: "chip",
      name: "オーバークロック・チップ",
      cost: 15,
      mods: { atk: 8, spd: 5 },
      description: "演算限界を引き上げ、火力と行動速度を底上げする。"
    },
    {
      id: "chip_nano_repair",
      slot: "chip",
      name: "ナノリペア・チップ",
      cost: 16,
      mods: { hp: 25, def: 6 },
      description: "自己修復ルーチンを組み込み、継戦能力を高める。"
    },
    {
      id: "chip_precision",
      slot: "chip",
      name: "プレシジョン・チップ",
      cost: 14,
      mods: { atk: 6, def: 4, spd: 4 },
      description: "弱点照準と姿勢制御を最適化する万能チップ。"
    }
  ]
};

export const FALLBACK_PRESETS = [
  {
    id: "preset_iron_knight",
    name: "【基準機】アイアン・ナイト",
    coreId: "core_balanced",
    parts: { arm: "arm_boulder", leg: "leg_strider", chip: "chip_precision" },
    aiPolicy: "balanced"
  },
  {
    id: "preset_crimson_fang",
    name: "【速攻機】クリムゾン・ファング",
    coreId: "core_striker",
    parts: { arm: "arm_twin_claw", leg: "leg_hopper", chip: "chip_overclock" },
    aiPolicy: "aggressive"
  },
  {
    id: "preset_stone_wall",
    name: "【鉄壁機】ストーン・ウォール",
    coreId: "core_bastion",
    parts: { arm: "arm_aegis_shield", leg: "leg_crawler", chip: "chip_nano_repair" },
    aiPolicy: "defensive"
  }
];

function cloneData() {
  return {
    costLimit: DEFAULT_COST_LIMIT,
    cores: JSON.parse(JSON.stringify(FALLBACK_CORES)),
    parts: JSON.parse(JSON.stringify(FALLBACK_PARTS)),
    presets: JSON.parse(JSON.stringify(FALLBACK_PRESETS))
  };
}

function buildCsvUrl(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${Date.now()}`;
}

function parseCsvLine(line) {
  const cols = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

export async function loadGolemMasterData() {
  const base = cloneData();

  if (!SHEET_CSV_URL || !SHEET_CSV_URL.startsWith("http")) {
    return {
      data: base,
      source: "fallback",
      message: "ローカル定義データ（js/data/golemData.js）を使用中"
    };
  }

  try {
    const res = await fetch(buildCsvUrl(SHEET_CSV_URL));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) throw new Error("CSVデータ行が空です");

    const loadedCores = [];
    const loadedParts = { arm: [], leg: [], chip: [] };

    for (const line of lines.slice(1)) {
      const [type, id, name, slotOrRole, cost, hp, atk, def, spd, skillId, description] =
        parseCsvLine(line);
      if (!type || !id || !name) continue;

      if (type === "core") {
        loadedCores.push({
          id,
          name,
          role: slotOrRole || "カスタム",
          cost: Number(cost) || 20,
          baseStats: {
            hp: Number(hp) || 100,
            atk: Number(atk) || 20,
            def: Number(def) || 15,
            spd: Number(spd) || 15
          },
          description: description || ""
        });
      } else if (type === "part" && loadedParts[slotOrRole]) {
        const mods = {};
        if (Number(hp)) mods.hp = Number(hp);
        if (Number(atk)) mods.atk = Number(atk);
        if (Number(def)) mods.def = Number(def);
        if (Number(spd)) mods.spd = Number(spd);

        loadedParts[slotOrRole].push({
          id,
          slot: slotOrRole,
          name,
          cost: Number(cost) || 15,
          mods,
          skillId: skillId || undefined,
          description: description || ""
        });
      }
    }

    if (loadedCores.length > 0) base.cores = loadedCores;
    if (loadedParts.arm.length > 0) base.parts.arm = loadedParts.arm;
    if (loadedParts.leg.length > 0) base.parts.leg = loadedParts.leg;
    if (loadedParts.chip.length > 0) base.parts.chip = loadedParts.chip;

    return {
      data: base,
      source: "sheet",
      message: "スプレッドシートCSVから最新データを読み込みました"
    };
  } catch (err) {
    console.warn("スプレッドシート読み込み失敗のため予備データへフォールバック:", err);
    return {
      data: base,
      source: "fallback",
      message: `CSV取得失敗のため予備データを使用中（${err.message}）`
    };
  }
}
