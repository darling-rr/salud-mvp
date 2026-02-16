"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* -------------------- Helpers -------------------- */
const toNum = (s) => {
  if (s === null || s === undefined) return null;
  const t = String(s).trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const toHeightCm = (raw) => {
  const n = toNum(raw);
  if (n === null) return null;
  // Si ingresan 1.77 asumimos metros
  if (n > 0 && n < 3) return n * 100;
  return n;
};

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* -------------------- Alcohol helpers -------------------- */
// "Trago estándar" orientativo en Chile:
// - 1 cerveza lata ~350cc
// - 1 copa de vino ~150cc
// - 1 medida destilado ~45cc
const alcoholCategory = ({ drinksPerWeek, binge, sex }) => {
  const n = drinksPerWeek ?? 0;
  const isBinge = binge === "yes";

  const moderateLimit = sex === "F" ? 7 : 14;

  if (isBinge) return "high";
  if (n <= 1) return "low";
  if (n <= moderateLimit) return "moderate";
  return "high";
};

const alcoholLabel = (cat) => {
  if (cat === "low") return "Bajo";
  if (cat === "moderate") return "Moderado";
  return "Alto";
};

/* -------------------- UI Components -------------------- */
function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-gray-700 bg-white">
      {children}
    </span>
  );
}

function Pill({ children, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "rounded-full border px-3 py-1 text-xs transition active:scale-[0.99]",
        active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  const stop = (e) => e.stopPropagation();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-xl rounded-2xl bg-white border shadow-lg p-5" onClick={stop}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50"
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-700 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function NumericInput({ id, label, value, onChange, placeholder, suffix, hint, warning, quickPills }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}
      </label>

      <div className="flex items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          className={classNames(
            "w-full rounded-xl border px-3 py-2 outline-none focus:ring bg-white",
            warning ? "border-gray-900" : ""
          )}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^[0-9]*[.,]?[0-9]*$/.test(v) || v === "") onChange(v);
          }}
          aria-label={label}
        />
        {suffix ? <span className="text-sm text-gray-600">{suffix}</span> : null}
      </div>

      {quickPills?.length ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {quickPills.map((p) => (
            <Pill key={p.label} onClick={() => onChange(String(p.value))} active={String(p.value) === String(value)}>
              {p.label}
            </Pill>
          ))}
        </div>
      ) : null}

      {warning ? (
        <div className="text-xs text-gray-700">
          <Badge>Revisa</Badge> <span className="ml-1">{warning}</span>
        </div>
      ) : null}
    </div>
  );
}

function Select({ id, label, value, onChange, options, hint }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}
      </label>
      <select
        id={id}
        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* -------------------- Main App -------------------- */
export default function CardioMetabolicApp() {
  // Wizard
  const steps = [
    { key: "datos", title: "Datos" },
    { key: "habitos", title: "Hábitos" },
    { key: "salud", title: "Salud" },
    { key: "resultado", title: "Resultado" },
  ];
  const [step, setStep] = useState(0);

  // Modal
  const [openHow, setOpenHow] = useState(false);

  // Seguimiento simple (localStorage) — guardar SOLO al llegar a resultado
  const [last, setLast] = useState(null);
  const [history, setHistory] = useState([]);
  const savedForThisResultRef = useRef(false);

  // Demografía
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("F"); // F | M

  // Antropometría
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState(""); // cm o metros (auto)
  const [waist, setWaist] = useState(""); // cm (opcional)

  // Presión arterial (opcional)
  const [bpSys, setBpSys] = useState(""); // sistólica mmHg
  const [bpDia, setBpDia] = useState(""); // diastólica mmHg

  // Labs (opcionales)
  const [glucose, setGlucose] = useState(""); // mg/dL
  const [hba1c, setHba1c] = useState(""); // %
  const [cholTotal, setCholTotal] = useState(""); // mg/dL

  // Dieta/hábitos
  const [breadsPerDay, setBreadsPerDay] = useState(""); // unid/día
  const [sugaryDrinksPerWeek, setSugaryDrinksPerWeek] = useState(""); // veces/sem
  const [proteinServingsPerDay, setProteinServingsPerDay] = useState(""); // porciones/día

  // NUEVOS: sal añadida y bebidas energéticas
  const [extraSalt, setExtraSalt] = useState("never"); // never | sometimes | often
  const [energyDrinksPerWeek, setEnergyDrinksPerWeek] = useState(""); // veces/sem

  // Frituras
  const [friedPeriod, setFriedPeriod] = useState("week"); // week | month
  const [friedCount, setFriedCount] = useState(""); // veces/periodo

  const [sleepHours, setSleepHours] = useState("");
  const [activityMinutesWeek, setActivityMinutesWeek] = useState(""); // min/sem

  const [smoking, setSmoking] = useState("no"); // no | yes

  // Alcohol
  const [alcoholDrinksPerWeek, setAlcoholDrinksPerWeek] = useState(""); // número
  const [alcoholBinge, setAlcoholBinge] = useState("no"); // no | yes

  // Antecedentes personales
  const [hasHTN, setHasHTN] = useState("no");
  const [hasDM, setHasDM] = useState("no");
  const [hasDyslip, setHasDyslip] = useState("no");
  const [hasCVD, setHasCVD] = useState("no");

  // Familiar CV temprano
  const [famPrematureCVD, setFamPrematureCVD] = useState("no"); // no|yes

  // Tiroides
  const [thyroidDx, setThyroidDx] = useState("none"); // none | hypo | hyper

  // Síntomas / estrés
  const [chestPain, setChestPain] = useState("no"); // no|yes
  const [easyFatigue, setEasyFatigue] = useState("no"); // no|yes
  const [stressFreq, setStressFreq] = useState("sometimes"); // never|sometimes|often

  // Refs para scroll
  const topRef = useRef(null);
  const summaryRef = useRef(null);

  const computed = useMemo(() => {
    const A = toNum(age);
    const W = toNum(weight);
    const Hcm = toHeightCm(height);
    const WC = toNum(waist);

    const SYS = toNum(bpSys);
    const DIA = toNum(bpDia);

    const G = toNum(glucose);
    const A1c = toNum(hba1c);
    const CT = toNum(cholTotal);

    const breads = toNum(breadsPerDay);
    const sugary = toNum(sugaryDrinksPerWeek);
    const protein = toNum(proteinServingsPerDay);

    const energy = toNum(energyDrinksPerWeek);

    const sleep = toNum(sleepHours);
    const act = toNum(activityMinutesWeek);

    const friedN = toNum(friedCount);

    // Normaliza frituras a /semana
    let friedPerWeek = null;
    if (friedN !== null) friedPerWeek = friedPeriod === "month" ? friedN / 4 : friedN;

    // BMI
    let bmi = null;
    if (W !== null && Hcm !== null && Hcm > 0) {
      const hm = Hcm / 100;
      bmi = W / (hm * hm);
    }

    let score = 0;

    const risksMod = [];
    const risksNoMod = [];
    const dx = [];
    const redFlags = [];

    const contrib = []; // {type,label,points}
    const add = (type, label, points) => {
      if (!points) return;
      contrib.push({ type, label, points });
    };

    // --- NO MODIFICABLES ---
    if (A !== null) {
      if (A >= 55) {
        score += 10;
        add("nomod", "Edad (≥55 años)", 10);
      } else if (A >= 45) {
        score += 7;
        add("nomod", "Edad (45–54 años)", 7);
      } else if (A >= 35) {
        score += 4;
        add("nomod", "Edad (35–44 años)", 4);
      }

      if (A >= 45) risksNoMod.push("Edad (≥45 años)");
    }

    if (famPrematureCVD === "yes") {
      score += 6;
      risksNoMod.push("Antecedente familiar cardiovascular temprano");
      add("nomod", "Antecedente familiar cardiovascular temprano", 6);
    }

    // --- MODIFICABLES / MEDICIONES ---
    if (bmi !== null) {
      if (bmi >= 35) {
        score += 16;
        risksMod.push("IMC muy alto (obesidad severa)");
        add("mod", "IMC muy alto (obesidad severa)", 16);
      } else if (bmi >= 30) {
        score += 12;
        risksMod.push("IMC alto (obesidad)");
        add("mod", "IMC alto (obesidad)", 12);
      } else if (bmi >= 25) {
        score += 7;
        risksMod.push("IMC elevado (sobrepeso)");
        add("mod", "IMC elevado (sobrepeso)", 7);
      }
    }

    // Cintura (opcional)
    if (WC !== null) {
      const high = sex === "M" ? 102 : 88;
      const mid = sex === "M" ? 94 : 80;
      if (WC >= high) {
        score += 14;
        risksMod.push("Circunferencia de cintura alta");
        add("mod", "Circunferencia de cintura alta", 14);
      } else if (WC >= mid) {
        score += 8;
        risksMod.push("Circunferencia de cintura en rango de alerta");
        add("mod", "Circunferencia de cintura en rango de alerta", 8);
      }
    }

    // Presión arterial (opcional)
    const hasBP = SYS !== null && DIA !== null;
    if (hasBP) {
      if (SYS >= 180 || DIA >= 120) {
        redFlags.push(
          "Presión arterial muy alta (≥180/120): si se acompaña de dolor de pecho, falta de aire, visión borrosa, debilidad, confusión o cefalea intensa → URGENCIAS."
        );
      }

      if (SYS >= 140 || DIA >= 90) {
        score += 14;
        risksMod.push("Presión arterial alta (confirmar con medición repetida)");
        add("mod", "Presión arterial alta (confirmar)", 14);
      } else if (SYS >= 130 || DIA >= 85) {
        score += 8;
        risksMod.push("Presión arterial en rango de alerta");
        add("mod", "Presión arterial en rango de alerta", 8);
      }
    }

    // --- NUEVO: SAL AÑADIDA ---
    if (extraSalt === "often") {
      score += 4;
      risksMod.push("Añade sal extra frecuentemente");
      add("mod", "Añade sal extra frecuentemente", 4);
    } else if (extraSalt === "sometimes") {
      score += 2;
      add("mod", "Añade sal extra ocasionalmente", 2);
    }

    // --- NUEVO: BEBIDAS ENERGÉTICAS ---
    if (energy !== null) {
      if (energy >= 5) {
        score += 5;
        risksMod.push("Consumo alto de bebidas energéticas");
        add("mod", "Consumo alto de bebidas energéticas", 5);
      } else if (energy >= 2) {
        score += 2;
        add("mod", "Consumo moderado de bebidas energéticas", 2);
      }
    }

    // Labs (opcionales)
    if (G !== null) {
      if (G >= 126) {
        score += 16;
        risksMod.push("Glicemia elevada (confirmar)");
        add("mod", "Glicemia elevada (confirmar)", 16);
      } else if (G >= 100) {
        score += 10;
        risksMod.push("Glicemia en rango de prediabetes (confirmar)");
        add("mod", "Glicemia en rango de prediabetes (confirmar)", 10);
      }
    }

    if (A1c !== null) {
      if (A1c >= 6.5) {
        score += 16;
        risksMod.push("HbA1c elevada (confirmar)");
        add("mod", "HbA1c elevada (confirmar)", 16);
      } else if (A1c >= 5.7) {
        score += 10;
        risksMod.push("HbA1c en rango de prediabetes (confirmar)");
        add("mod", "HbA1c en rango de prediabetes (confirmar)", 10);
      }
    }

    if (CT !== null) {
      if (CT >= 240) {
        score += 10;
        risksMod.push("Colesterol total alto");
        add("mod", "Colesterol total alto", 10);
      } else if (CT >= 200) {
        score += 6;
        risksMod.push("Colesterol total en rango límite");
        add("mod", "Colesterol total en rango límite", 6);
      }
    }

    // Actividad
    if (act !== null) {
      if (act < 60) {
        score += 10;
        risksMod.push("Actividad física muy baja");
        add("mod", "Actividad física muy baja", 10);
      } else if (act < 150) {
        score += 6;
        risksMod.push("Actividad física bajo lo recomendado");
        add("mod", "Actividad física bajo lo recomendado", 6);
      }
    }

    // Sueño
    if (sleep !== null) {
      if (sleep < 6) {
        score += 6;
        risksMod.push("Sueño insuficiente");
        add("mod", "Sueño insuficiente", 6);
      } else if (sleep > 9) {
        score += 2;
        risksMod.push("Sueño prolongado (revisar calidad/causas)");
        add("mod", "Sueño prolongado (revisar calidad/causas)", 2);
      }
    }

    // Tabaco
    if (smoking === "yes") {
      score += 14;
      risksMod.push("Tabaquismo");
      add("mod", "Tabaquismo", 14);
    }

    // Alcohol
    const drinksW = toNum(alcoholDrinksPerWeek);
    const alcCat = alcoholCategory({ drinksPerWeek: drinksW ?? 0, binge: alcoholBinge, sex });

    if (alcCat === "moderate") {
      score += 2;
      risksMod.push("Alcohol moderado");
      add("mod", "Alcohol moderado", 2);
    } else if (alcCat === "high") {
      score += 6;
      risksMod.push("Alcohol alto o atracones");
      add("mod", "Alcohol alto o atracones", 6);
    }

    // Dieta
    if (breads !== null) {
      if (breads >= 5) {
        score += 8;
        risksMod.push("Consumo de pan alto");
        add("mod", "Consumo de pan alto", 8);
      } else if (breads >= 3) {
        score += 4;
        risksMod.push("Consumo de pan moderado-alto");
        add("mod", "Consumo de pan moderado-alto", 4);
      }
    }

    if (friedPerWeek !== null) {
      if (friedPerWeek >= 4) {
        score += 8;
        risksMod.push("Consumo de frituras frecuente");
        add("mod", "Consumo de frituras frecuente", 8);
      } else if (friedPerWeek >= 2) {
        score += 4;
        risksMod.push("Consumo de frituras moderado");
        add("mod", "Consumo de frituras moderado", 4);
      } else if (friedPerWeek > 0) {
        score += 1;
        add("mod", "Consumo de frituras ocasional", 1);
      }
    }

    if (sugary !== null) {
      if (sugary >= 7) {
        score += 8;
        risksMod.push("Azúcares/bebidas azucaradas muy frecuentes");
        add("mod", "Azúcares/bebidas azucaradas muy frecuentes", 8);
      } else if (sugary >= 3) {
        score += 4;
        risksMod.push("Azúcares/bebidas azucaradas frecuentes");
        add("mod", "Azúcares/bebidas azucaradas frecuentes", 4);
      }
    }

    if (protein !== null && protein < 1) {
      score += 4;
      risksMod.push("Proteína baja (priorizar en cada comida)");
      add("mod", "Proteína baja (priorizar en cada comida)", 4);
    }

    // Estrés
    if (stressFreq === "often") {
      score += 4;
      risksMod.push("Estrés frecuente (impacta sueño, presión y hábitos)");
      add("mod", "Estrés frecuente", 4);
    } else if (stressFreq === "sometimes") {
      score += 1;
      add("mod", "Estrés (a veces)", 1);
    }

    // --- DIAGNÓSTICOS / CONDICIONES ---
    if (hasHTN === "yes") {
      score += 10;
      dx.push("Hipertensión diagnosticada");
      add("dx", "Hipertensión diagnosticada", 10);
    }
    if (hasDM === "yes") {
      score += 14;
      dx.push("Diabetes diagnosticada");
      add("dx", "Diabetes diagnosticada", 14);
    }
    if (hasDyslip === "yes") {
      score += 8;
      dx.push("Dislipidemia diagnosticada");
      add("dx", "Dislipidemia diagnosticada", 8);
    }
    if (thyroidDx === "hypo") {
      score += 2;
      dx.push("Hipotiroidismo (puede influir en peso/lípidos/energía)");
      add("dx", "Hipotiroidismo", 2);
    }
    if (thyroidDx === "hyper") {
      score += 2;
      dx.push("Hipertiroidismo (puede influir en ritmo/ansiedad/peso)");
      add("dx", "Hipertiroidismo", 2);
    }
    if (hasCVD === "yes") {
      score += 18;
      dx.push("Antecedente de enfermedad cardiovascular");
      add("dx", "Antecedente de enfermedad cardiovascular", 18);
      redFlags.push("Antecedente cardiovascular: requiere control médico regular y plan personalizado.");
    }

    // --- BANDERAS ROJAS ---
    if (chestPain === "yes") {
      redFlags.push(
        "Dolor/opresión en el pecho: si es nuevo, intenso, al esfuerzo o con falta de aire/sudor/náuseas → consulta URGENTE."
      );
    }
    if (easyFatigue === "yes") {
      redFlags.push("Fatiga fácil: si es nueva o progresiva, conviene evaluación clínica.");
    }

    score = clamp(Math.round(score), 0, 100);

    let level = "Bajo";
    if (score >= 55) level = "Alto";
    else if (score >= 30) level = "Moderado";

    // Validaciones suaves
    const warnings = {};
    if (A !== null && (A < 12 || A > 110)) warnings.age = "Edad fuera de rango típico (12–110).";
    if (Hcm !== null && (Hcm < 120 || Hcm > 220)) warnings.height = "Talla fuera de rango típico (120–220 cm).";
    if (W !== null && (W < 30 || W > 250)) warnings.weight = "Peso fuera de rango típico (30–250 kg).";
    if (WC !== null && (WC < 40 || WC > 160)) warnings.waist = "Cintura fuera de rango típico (40–160 cm).";
    if (SYS !== null && (SYS < 70 || SYS > 250)) warnings.bpSys = "Sistólica fuera de rango típico (70–250 mmHg).";
    if (DIA !== null && (DIA < 40 || DIA > 150)) warnings.bpDia = "Diastólica fuera de rango típico (40–150 mmHg).";
    if (G !== null && (G < 40 || G > 600)) warnings.glucose = "Glicemia fuera de rango típico (40–600 mg/dL).";
    if (A1c !== null && (A1c < 3 || A1c > 20)) warnings.hba1c = "HbA1c fuera de rango típico (3–20%).";
    if (CT !== null && (CT < 80 || CT > 500)) warnings.chol = "Colesterol total fuera de rango típico (80–500 mg/dL).";
    if (energy !== null && (energy < 0 || energy > 50)) warnings.energy = "Energéticas fuera de rango típico (0–50/sem).";

    return {
      A,
      bmi,
      score,
      level,
      risksMod,
      risksNoMod,
      dx,
      redFlags,
      warnings,
      contrib,
      alcohol: {
        drinksPerWeek: drinksW,
        binge: alcoholBinge,
        category: alcCat,
      },
      bp: {
        sys: SYS,
        dia: DIA,
        hasBP,
      },
      missing: {
        waist: WC === null,
        bp: !hasBP,
        glucose: G === null,
        hba1c: A1c === null,
        cholTotal: CT === null,
      },
    };
  }, [
    age,
    sex,
    weight,
    height,
    waist,
    bpSys,
    bpDia,
    glucose,
    hba1c,
    cholTotal,
    breadsPerDay,
    sugaryDrinksPerWeek,
    proteinServingsPerDay,
    extraSalt,
    energyDrinksPerWeek,
    friedPeriod,
    friedCount,
    sleepHours,
    activityMinutesWeek,
    smoking,
    alcoholDrinksPerWeek,
    alcoholBinge,
    hasHTN,
    hasDM,
    hasDyslip,
    hasCVD,
    famPrematureCVD,
    thyroidDx,
    chestPain,
    easyFatigue,
    stressFreq,
  ]);

  // Acciones prioritarias + microtips
  const actionsWithTips = useMemo(() => {
    const has = (txt) => computed.risksMod.some((r) => r.toLowerCase().includes(txt.toLowerCase()));
    const out = [];

    if (has("presión arterial")) {
      out.push({
        title: "Bajar/Controlar presión arterial",
        tips: [
          "Si puedes: 2–3 mediciones en días distintos (reposo 5 min)",
          "Reduce sal y ultraprocesados; más potasio (fruta/verdura/legumbres)",
          "Actividad: caminar + fuerza 2x/sem; limita alcohol",
        ],
      });
    }
    if (has("sal extra")) {
      out.push({
        title: "Reducir sal añadida",
        tips: ["No agregues sal al plato", "Usa limón/ajo/merken/hierbas para sabor", "Evita caldos/cubitos y snacks salados"],
      });
    }
    if (has("energéticas")) {
      out.push({
        title: "Reducir bebidas energéticas",
        tips: ["Cambia por agua/infusión", "Evita energéticas tarde (mejora sueño)", "Si necesitas: café 1–2 al día (sin azúcar)"],
      });
    }
    if (has("imc")) {
      out.push({
        title: "Bajar 5–10% del peso (si aplica)",
        tips: ["Prioriza proteína en cada comida", "Aumenta fibra (verduras/legumbres)", "Camina diario + fuerza 2x/sem"],
      });
    }
    if (has("actividad física")) {
      out.push({
        title: "Subir actividad física",
        tips: ["Meta: 150 min/sem", "Empieza con 10–20 min y sube", "Fuerza 2 días/sem (sentadillas, push-ups, remo)"],
      });
    }
    if (has("pan")) {
      out.push({
        title: "Reducir pan/harinas y subir comida real",
        tips: ["Cambia 1 pan por fruta/yaourt natural", "Incluye legumbres 2–3x/sem", "Más verduras en almuerzo/cena"],
      });
    }
    if (has("azúcares") || has("bebidas")) {
      out.push({
        title: "Bajar bebidas azucaradas/dulces",
        tips: ["Agua/infusiones sin azúcar", "Si antojo: fruta + proteína", "Reduce de a 1 por semana"],
      });
    }
    if (has("frituras")) {
      out.push({
        title: "Bajar frituras",
        tips: ["Horno/plancha/airfryer", "Aceite medido (1 cdita)", "Planifica 1 “fritura” por semana máx."],
      });
    }
    if (has("sueño")) {
      out.push({
        title: "Mejorar sueño",
        tips: ["Rutina fija (hora de dormir)", "Pantallas fuera 60 min antes", "Cafeína solo hasta mediodía"],
      });
    }
    if (has("estrés")) {
      out.push({
        title: "Manejo del estrés",
        tips: ["Respiración 2–3 min (4-6)", "Pausas cortas + caminata", "Pide apoyo si te supera"],
      });
    }
    if (has("tabaquismo")) {
      out.push({
        title: "Plan para dejar tabaco",
        tips: ["Define fecha/plan", "Apoyo CESFAM", "Reemplaza rutinas (chicle/agua/caminar)"],
      });
    }
    if (has("alcohol")) {
      out.push({
        title: "Reducir alcohol/atracones",
        tips: ["Meta: 0–1 trago en el día", "Evita atracones (binge)", "Alterna con agua y planifica el “sí”"],
      });
    }

    if (out.length === 0) {
      out.push({
        title: "Mantener hábitos saludables",
        tips: ["Verduras/legumbres/proteína", "150 min/sem + fuerza 2 días", "Dormir 7–8 h y pausas de estrés"],
      });
    }

    return out.slice(0, 3);
  }, [computed.risksMod]);

  const [openTipIndex, setOpenTipIndex] = useState(null);

  // Drivers: top 3 por puntos
  const drivers = useMemo(() => {
    const top = [...(computed.contrib ?? [])].sort((a, b) => b.points - a.points).slice(0, 3);
    return top.map((x) => x.label);
  }, [computed.contrib]);

  // Controles CESFAM
  const suggestedControls = useMemo(() => {
    const A = computed.A;
    if (A === null) return [];

    const items = [];

    if (A >= 65) {
      items.push({
        key: "EMPAM",
        title: "EMPAM (Adulto Mayor)",
        detail: "Desde 65 años: control preventivo integral en APS.",
        ask: "Qué pedir: “EMPAM” en SOME/Admisión del CESFAM.",
      });
    } else {
      items.push({
        key: "EMP",
        title: "EMP (Examen de Medicina Preventiva)",
        detail: "Control preventivo para pesquisa y consejerías en APS.",
        ask: "Qué pedir: “EMP” en SOME/Admisión del CESFAM.",
      });
    }

    if (sex === "F" && A >= 25 && A <= 64) {
      items.push({
        key: "PAP",
        title: "PAP (cáncer cervicouterino)",
        detail: "Mujeres 25–64: tamizaje con PAP cada 3 años (según historial y programa).",
        ask: "Qué pedir: “toma de PAP” y confirmar tu fecha de último control.",
      });
    }

    if (sex === "F" && A >= 50 && A <= 69) {
      items.push({
        key: "MAMO",
        title: "Mamografía (tamizaje cáncer de mama)",
        detail: "Mujeres 50–69: mamografía como tamizaje (según programa local/criterio clínico).",
        ask: "Qué pedir: “mamografía de tamizaje” y revisar agenda/derivación.",
      });
    }

    if (sex === "M" && A >= 50 && A <= 70) {
      items.push({
        key: "PROS",
        title: "Próstata (PSA: decisión informada)",
        detail:
          "Hombres 50–70: conversación y eventual PSA según preferencia/riesgo. Si familiar 1er grado, puede considerarse desde 40.",
        ask: "Qué pedir: “conversación PSA / control preventivo” en APS.",
      });
    }

    const bpHigh = computed.bp?.hasBP && (computed.bp.sys >= 140 || computed.bp.dia >= 90);
    const bpAlert = computed.bp?.hasBP && !bpHigh && (computed.bp.sys >= 130 || computed.bp.dia >= 85);

    if (hasHTN === "yes" || bpHigh || bpAlert) {
      items.push({
        key: "HTA",
        title: "Control de presión arterial (APS)",
        detail:
          hasHTN === "yes"
            ? "Seguimiento periódico, medición de PA y adherencia a tratamiento según APS."
            : "Confirmar mediciones (ideal 2–3 en días distintos) y definir necesidad de control/plan.",
        ask: "Qué pedir: “control de presión arterial / cardiovascular” (box enfermería o médico según CESFAM).",
      });
    }

    if (hasDM === "yes") {
      items.push({
        key: "DM",
        title: "Control Diabetes",
        detail: "Controles regulares (HbA1c según indicación, pie diabético, etc.) en APS.",
        ask: "Qué pedir: “control DM2”, “HbA1c” y “examen de pie” según calendario.",
      });
    }
    if (hasDyslip === "yes") {
      items.push({
        key: "LIP",
        title: "Control de lípidos",
        detail: "Seguimiento de perfil lipídico y tratamiento según indicación.",
        ask: "Qué pedir: “perfil lipídico” y revisión de tratamiento/objetivos.",
      });
    }
    if (thyroidDx === "hypo") {
      items.push({
        key: "THY_HYPO",
        title: "Control tiroideo (hipotiroidismo)",
        detail: "TSH y, si corresponde, T4 libre según indicación. Adherencia a tratamiento.",
        ask: "Qué pedir: “control tiroideo” + revisión de dosis/TSH.",
      });
    }
    if (thyroidDx === "hyper") {
      items.push({
        key: "THY_HYPER",
        title: "Control tiroideo (hipertiroidismo)",
        detail: "TSH y T4 libre según indicación. Si palpitaciones/temblores/baja de peso: consulta pronto.",
        ask: "Qué pedir: “control tiroideo” y comentar síntomas (palpitaciones/temblor).",
      });
    }
    if (hasCVD === "yes") {
      items.push({
        key: "CVD",
        title: "Seguimiento cardiovascular",
        detail: "Antecedente cardiovascular: control médico regular y plan personalizado.",
        ask: "Qué pedir: “control cardiología/medicina” + revisión de fármacos y metas.",
      });
    }

    if (computed.level !== "Bajo") {
      items.push({
        key: "CM",
        title: "Control cardiometabólico (APS)",
        detail:
          "Evaluación de PA, glicemia/HbA1c y lípidos según criterio clínico y disponibilidad (especialmente si hay valores alterados o síntomas).",
        ask: "Qué pedir: “control cardiometabólico / cardiovascular” y exámenes según criterio.",
      });
    }

    return items;
  }, [computed.A, computed.level, computed.bp, sex, hasHTN, hasDM, hasDyslip, thyroidDx, hasCVD]);

  const referencesText = useMemo(() => {
    const keys = new Set(suggestedControls.map((x) => x.key));
    const refs = [];
    if (keys.has("EMP") || keys.has("EMPAM")) refs.push("EMP/EMPAM en APS");
    if (keys.has("PAP")) refs.push("PAP 25–64: cada 3 años (programa MINSAL)");
    if (keys.has("MAMO")) refs.push("Mamografía 50–69: tamizaje (programa MINSAL)");
    if (keys.has("PROS")) refs.push("Próstata 50–70: decisión informada (programa/criterio)");
    return refs.length ? `Referencias (orientativas): ${refs.join(" · ")}.` : "";
  }, [suggestedControls]);

  // “Completar datos faltantes”
  const missingList = useMemo(() => {
    const m = computed.missing;
    const out = [];
    if (m.waist) out.push({ label: "Cintura", goStep: 0 });
    if (m.bp) out.push({ label: "Presión arterial", goStep: 0 });
    if (m.glucose) out.push({ label: "Glicemia", goStep: 0 });
    if (m.hba1c) out.push({ label: "HbA1c", goStep: 0 });
    if (m.cholTotal) out.push({ label: "Colesterol total", goStep: 0 });
    return out;
  }, [computed.missing]);

  // Cargar historial
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cm_last");
      if (raw) setLast(JSON.parse(raw));
    } catch {}
    try {
      const rawH = localStorage.getItem("cm_history");
      if (rawH) setHistory(JSON.parse(rawH));
    } catch {}
  }, []);

  // Guardar SOLO al llegar a “Resultado”
  useEffect(() => {
    if (step !== 3) {
      savedForThisResultRef.current = false;
      return;
    }
    if (savedForThisResultRef.current) return;
    savedForThisResultRef.current = true;

    try {
      const payload = {
        date: new Date().toISOString(),
        score: computed.score,
        level: computed.level,
      };

      localStorage.setItem("cm_last", JSON.stringify(payload));
      setLast(payload);

      setHistory((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        const next = [payload, ...prevArr].slice(0, 12);
        try {
          localStorage.setItem("cm_history", JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch {}
  }, [step, computed.score, computed.level]);

  // Progreso wizard
  const progressPct = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  const goStep = (i) => {
    setStep(clamp(i, 0, steps.length - 1));
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  // Resumen
  const buildSummaryText = () => {
    const d = new Date().toLocaleDateString();
    const lines = [
      `Evaluación cardiometabólica (MVP) — ${d}`,
      `Score: ${computed.score}/100 · Nivel: ${computed.level}`,
    ];
    if (drivers?.length) lines.push(`Principales factores detectados: ${drivers.join(" · ")}`);

    if (computed.bp?.hasBP) lines.push(`Presión arterial: ${computed.bp.sys}/${computed.bp.dia} mmHg`);
    else lines.push(`Presión arterial: no informada`);

    lines.push(`Sal añadida: ${extraSalt === "never" ? "No" : extraSalt === "sometimes" ? "A veces" : "Frecuentemente"}`);

    const e = toNum(energyDrinksPerWeek);
    lines.push(`Energéticas: ${e === null ? "no informado" : `${e} veces/sem`}`);

    const alcTxt = `Alcohol: ${alcoholLabel(computed.alcohol?.category)} (${computed.alcohol?.drinksPerWeek ?? 0} tragos/sem, atracón: ${
      computed.alcohol?.binge === "yes" ? "sí" : "no"
    })`;
    lines.push(alcTxt);

    if (actionsWithTips?.length) lines.push(`Acciones prioritarias: ${actionsWithTips.map((a) => a.title).join(" · ")}`);
    if (computed.redFlags?.length) lines.push(`Banderas rojas: ${computed.redFlags.join(" · ")}`);
    if (suggestedControls?.length) lines.push(`Controles sugeridos: ${suggestedControls.map((c) => c.title).join(" · ")}`);
    lines.push(`*Orientación preventiva. No reemplaza evaluación clínica.`);
    return lines.join("\n");
  };

  const shareSummary = async () => {
    const text = buildSummaryText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Resumen cardiometabólico", text });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      alert("Resumen copiado al portapapeles ✅");
    } catch {
      alert("No se pudo copiar. Puedes seleccionar y copiar el resumen manualmente.");
    }
  };

  const printPDF = () => {
    const text = buildSummaryText().replace(/\n/g, "<br/>");
    const html = `
      <html>
        <head>
          <title>Resumen cardiometabólico</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; }
            .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
            .h1 { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
            .muted { color: #374151; font-size: 12px; }
            .p { font-size: 13px; line-height: 1.5; color: #111827; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="h1">Resumen cardiometabólico</div>
            <div class="p">${text}</div>
            <div class="muted" style="margin-top:12px;">
              *Orientación preventiva. Si hay síntomas importantes o enfermedad crónica, consulta.
            </div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // Estilo nivel
  const levelChip = useMemo(() => {
    const txt = computed.level === "Bajo" ? "Prevención" : computed.level === "Moderado" ? "A mejorar" : "Prioridad";
    return txt;
  }, [computed.level]);

  // Footer navegación (abajo)
  const StepNav = () => (
    <div className="flex items-center justify-between pt-6">
      <button
        type="button"
        onClick={() => goStep(step - 1)}
        className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 transition disabled:opacity-50"
        disabled={step === 0}
      >
        Atrás
      </button>

      <button
        type="button"
        onClick={() => goStep(step + 1)}
        className="rounded-xl border px-4 py-2 text-sm bg-gray-900 text-white hover:opacity-95 transition disabled:opacity-50"
        disabled={step === steps.length - 1}
      >
        Siguiente
      </button>
    </div>
  );

  return (
    <main ref={topRef} className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* HERO */}
        <header className="rounded-2xl bg-white p-5 shadow-sm border">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Evaluación cardiometabólica (MVP)</h1>
              <p className="mt-1 text-sm text-gray-600">
                En 2 minutos identifica tus principales puntos a mejorar y qué controles pedir en APS.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>Sin registro de datos</Badge>
                <Badge>Calculado en tu navegador</Badge>
                <button
                  type="button"
                  onClick={() => setOpenHow(true)}
                  className="rounded-full border px-3 py-1 text-xs bg-white hover:bg-gray-50 transition"
                >
                  ¿Cómo se calcula?
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={shareSummary}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 transition active:scale-[0.99]"
              >
                Compartir resumen
              </button>
              <button
                type="button"
                onClick={printPDF}
                className="rounded-xl border px-4 py-2 text-sm bg-gray-900 text-white hover:opacity-95 transition active:scale-[0.99]"
              >
                Guardar PDF
              </button>
            </div>
          </div>
        </header>

        {/* Wizard header (solo tabs + barra, SIN botones arriba) */}
        <section className="rounded-2xl bg-white p-5 shadow-sm border">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">
              Paso {step + 1} de {steps.length}: <span className="font-semibold">{steps[step].title}</span>
            </div>
            <div className="text-xs text-gray-600">{progressPct}%</div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {steps.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => goStep(i)}
                className={classNames(
                  "rounded-full border px-3 py-1 text-xs transition",
                  i === step ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"
                )}
              >
                {s.title}
              </button>
            ))}
          </div>
        </section>

        {/* STEP 1: Datos */}
        {step === 0 ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Datos</h2>
              <Badge>Opcional = no afecta si está vacío</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <NumericInput
                id="age"
                label="Edad"
                value={age}
                onChange={setAge}
                placeholder="Ej: 31"
                suffix="años"
                warning={computed.warnings?.age}
              />

              <Select
                id="sex"
                label="Sexo"
                value={sex}
                onChange={setSex}
                options={[
                  { value: "F", label: "Femenino" },
                  { value: "M", label: "Masculino" },
                ]}
              />

              <NumericInput
                id="weight"
                label="Peso"
                value={weight}
                onChange={setWeight}
                placeholder="Ej: 66"
                suffix="kg"
                warning={computed.warnings?.weight}
              />

              <NumericInput
                id="height"
                label="Talla"
                value={height}
                onChange={setHeight}
                placeholder="Ej: 177 o 1.77"
                suffix="cm"
                hint="Puedes escribir 1.77 y se interpretará como metros."
                warning={computed.warnings?.height}
              />

              <NumericInput
                id="waist"
                label="Circunferencia de cintura (opcional)"
                value={waist}
                onChange={setWaist}
                placeholder="Si no sabes, déjalo en blanco"
                suffix="cm"
                hint="Aumenta precisión del resultado."
                warning={computed.warnings?.waist}
              />

              {/* Presión arterial (opcional) */}
              <div className="space-y-2 md:col-span-2">
                <div className="text-sm font-medium">Presión arterial (opcional)</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <NumericInput
                    id="bpSys"
                    label="Sistólica"
                    value={bpSys}
                    onChange={setBpSys}
                    placeholder="Ej: 120"
                    suffix="mmHg"
                    hint="Ideal: medir en reposo (5 min), sentado/a."
                    warning={computed.warnings?.bpSys}
                    quickPills={[
                      { label: "110", value: 110 },
                      { label: "120", value: 120 },
                      { label: "130", value: 130 },
                      { label: "140", value: 140 },
                    ]}
                  />
                  <NumericInput
                    id="bpDia"
                    label="Diastólica"
                    value={bpDia}
                    onChange={setBpDia}
                    placeholder="Ej: 80"
                    suffix="mmHg"
                    hint="Si no la sabes, puedes dejarlo en blanco (no afecta)."
                    warning={computed.warnings?.bpDia}
                    quickPills={[
                      { label: "70", value: 70 },
                      { label: "80", value: 80 },
                      { label: "85", value: 85 },
                      { label: "90", value: 90 },
                    ]}
                  />
                </div>

                {computed.bp?.hasBP ? (
                  <div className="text-xs text-gray-600">
                    Ingresado:{" "}
                    <span className="font-semibold">
                      {computed.bp.sys}/{computed.bp.dia} mmHg
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600">Si no la conoces, déjalo en blanco. El score funciona igual.</div>
                )}
              </div>

              <NumericInput
                id="glucose"
                label="Glicemia (opcional)"
                value={glucose}
                onChange={setGlucose}
                placeholder="Ej: 92"
                suffix="mg/dL"
                warning={computed.warnings?.glucose}
              />

              <NumericInput
                id="hba1c"
                label="HbA1c (opcional)"
                value={hba1c}
                onChange={setHba1c}
                placeholder="Ej: 5.4"
                suffix="%"
                warning={computed.warnings?.hba1c}
              />

              <NumericInput
                id="chol"
                label="Colesterol total (opcional)"
                value={cholTotal}
                onChange={setCholTotal}
                placeholder="Ej: 180"
                suffix="mg/dL"
                warning={computed.warnings?.chol}
              />
            </div>

            {missingList.length ? (
              <div className="rounded-xl border p-4">
                <div className="font-semibold">Para afinar el resultado (opcional)</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missingList.map((m) => (
                    <Pill key={m.label} onClick={() => goStep(m.goStep)}>
                      Agregar: {m.label}
                    </Pill>
                  ))}
                </div>

                {computed.missing?.waist ? (
                  <div className="mt-2 text-xs text-gray-600">
                    Tip cintura: mide a nivel del ombligo, al final de una espiración, sin apretar la cinta.
                  </div>
                ) : null}

                <div className="mt-2 text-xs text-gray-600">
                  Si no los tienes, puedes avanzar igual. El puntaje funciona sin estos datos.
                </div>
              </div>
            ) : null}

            <StepNav />
          </section>
        ) : null}

        {/* STEP 2: Hábitos */}
        {step === 1 ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hábitos</h2>
              <Badge>Rápido: usa los “chips”</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <NumericInput
                id="breads"
                label="Pan al día"
                value={breadsPerDay}
                onChange={setBreadsPerDay}
                placeholder="Ej: 2"
                suffix="unid/día"
                quickPills={[
                  { label: "0", value: 0 },
                  { label: "2", value: 2 },
                  { label: "4", value: 4 },
                  { label: "6", value: 6 },
                ]}
              />

              <NumericInput
                id="sugary"
                label="Bebidas azucaradas / dulces"
                value={sugaryDrinksPerWeek}
                onChange={setSugaryDrinksPerWeek}
                placeholder="Ej: 3"
                suffix="veces/sem"
                quickPills={[
                  { label: "0", value: 0 },
                  { label: "2", value: 2 },
                  { label: "4", value: 4 },
                  { label: "7", value: 7 },
                ]}
              />

              <NumericInput
                id="protein"
                label="Proteína (aprox.)"
                value={proteinServingsPerDay}
                onChange={setProteinServingsPerDay}
                placeholder="Ej: 2"
                suffix="porciones/día"
                hint="Ejemplo: 1 porción = 1 huevo + 1 lámina jamón / 1 lata jurel / 1 taza legumbres."
                quickPills={[
                  { label: "0.5", value: 0.5 },
                  { label: "1", value: 1 },
                  { label: "2", value: 2 },
                  { label: "3", value: 3 },
                ]}
              />

              {/* NUEVO: sal añadida */}
              <Select
                id="extraSalt"
                label="¿Añades sal extra a la comida?"
                value={extraSalt}
                onChange={setExtraSalt}
                options={[
                  { value: "never", label: "Nunca" },
                  { value: "sometimes", label: "A veces" },
                  { value: "often", label: "Frecuentemente" },
                ]}
                hint="Ej: agregar sal al plato ya servido."
              />

              {/* NUEVO: energéticas */}
              <NumericInput
                id="energy"
                label="Bebidas energéticas"
                value={energyDrinksPerWeek}
                onChange={setEnergyDrinksPerWeek}
                placeholder="Ej: 2"
                suffix="veces/sem"
                warning={computed.warnings?.energy}
                quickPills={[
                  { label: "0", value: 0 },
                  { label: "1", value: 1 },
                  { label: "3", value: 3 },
                  { label: "5", value: 5 },
                ]}
              />

              <div className="space-y-2">
                <div className="text-sm font-medium">Frituras</div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    id="friedPeriod"
                    label="Periodo"
                    value={friedPeriod}
                    onChange={setFriedPeriod}
                    options={[
                      { value: "week", label: "Por semana" },
                      { value: "month", label: "Por mes" },
                    ]}
                  />
                  <NumericInput
                    id="friedCount"
                    label="Cantidad"
                    value={friedCount}
                    onChange={setFriedCount}
                    placeholder="Ej: 1"
                    suffix={friedPeriod === "month" ? "veces/mes" : "veces/sem"}
                    hint="Si lo dejas en blanco, no afecta."
                    quickPills={[
                      { label: "0", value: 0 },
                      { label: "1", value: 1 },
                      { label: "2", value: 2 },
                      { label: "4", value: 4 },
                    ]}
                  />
                </div>
              </div>

              <NumericInput
                id="sleep"
                label="Sueño"
                value={sleepHours}
                onChange={setSleepHours}
                placeholder="Ej: 7"
                suffix="horas/noche"
                quickPills={[
                  { label: "5h", value: 5 },
                  { label: "7h", value: 7 },
                  { label: "8h", value: 8 },
                  { label: "9h", value: 9 },
                ]}
              />

              <NumericInput
                id="activity"
                label="Actividad física"
                value={activityMinutesWeek}
                onChange={setActivityMinutesWeek}
                placeholder="Ej: 150"
                suffix="min/sem"
                quickPills={[
                  { label: "0", value: 0 },
                  { label: "60", value: 60 },
                  { label: "150", value: 150 },
                  { label: "300", value: 300 },
                ]}
              />

              <Select
                id="smoking"
                label="Tabaco"
                value={smoking}
                onChange={setSmoking}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
              />

              {/* Alcohol */}
              <div className="space-y-3">
                <NumericInput
                  id="alcoholDrinksPerWeek"
                  label="Alcohol (tragos estándar)"
                  value={alcoholDrinksPerWeek}
                  onChange={setAlcoholDrinksPerWeek}
                  placeholder="Ej: 2"
                  suffix="tragos/sem"
                  hint="1 trago estándar ≈ 1 cerveza lata (350cc) · 1 copa vino (150cc) · 1 medida destilado (45cc)."
                  quickPills={[
                    { label: "0", value: 0 },
                    { label: "2", value: 2 },
                    { label: "5", value: 5 },
                    { label: "10", value: 10 },
                    { label: "15", value: 15 },
                  ]}
                />

                <Select
                  id="alcoholBinge"
                  label="¿Atracón (binge) en el último mes?"
                  value={alcoholBinge}
                  onChange={setAlcoholBinge}
                  hint="Atracón ≈ 4+ tragos (mujer) o 5+ (hombre) en una ocasión."
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Sí" },
                  ]}
                />

                <div className="text-xs text-gray-600">
                  Categoría estimada:{" "}
                  <span className="font-semibold">
                    {alcoholLabel(
                      alcoholCategory({
                        drinksPerWeek: toNum(alcoholDrinksPerWeek) ?? 0,
                        binge: alcoholBinge,
                        sex,
                      })
                    )}
                  </span>
                </div>
              </div>
            </div>

            <StepNav />
          </section>
        ) : null}

        {/* STEP 3: Salud */}
        {step === 2 ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Salud, antecedentes y estrés</h2>
              <Badge>Esto ayuda a personalizar</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                id="hasHTN"
                label="¿HTA diagnosticada?"
                value={hasHTN}
                onChange={setHasHTN}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
              />
              <Select
                id="hasDM"
                label="¿Diabetes diagnosticada?"
                value={hasDM}
                onChange={setHasDM}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
              />
              <Select
                id="hasDyslip"
                label="¿Dislipidemia diagnosticada?"
                value={hasDyslip}
                onChange={setHasDyslip}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
              />
              <Select
                id="hasCVD"
                label="¿Enfermedad cardiovascular (infarto/ACV)?"
                value={hasCVD}
                onChange={setHasCVD}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
              />

              <Select
                id="famPrematureCVD"
                label="Antecedente familiar CV temprano"
                value={famPrematureCVD}
                onChange={setFamPrematureCVD}
                options={[
                  { value: "no", label: "No / no sé" },
                  { value: "yes", label: "Sí" },
                ]}
              />

              <Select
                id="thyroidDx"
                label="¿Hipo/Hipertiroidismo diagnosticado?"
                value={thyroidDx}
                onChange={setThyroidDx}
                options={[
                  { value: "none", label: "No" },
                  { value: "hypo", label: "Hipotiroidismo" },
                  { value: "hyper", label: "Hipertiroidismo" },
                ]}
              />

              <Select
                id="chestPain"
                label="Dolor/opresión en el pecho"
                value={chestPain}
                onChange={setChestPain}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
              />
              <Select
                id="easyFatigue"
                label="¿Fatiga fácil (más de lo habitual)?"
                value={easyFatigue}
                onChange={setEasyFatigue}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
              />
              <Select
                id="stressFreq"
                label="Estrés (últimas 2 semanas)"
                value={stressFreq}
                onChange={setStressFreq}
                options={[
                  { value: "never", label: "Rara vez" },
                  { value: "sometimes", label: "A veces" },
                  { value: "often", label: "Frecuente" },
                ]}
              />
            </div>

            <div className="rounded-xl border p-4">
              <div className="font-semibold">Importante</div>
              <div className="mt-2 text-sm text-gray-700">
                Si tienes <span className="font-semibold">dolor de pecho</span>, falta de aire importante, desmayo,
                debilidad súbita o síntomas nuevos intensos, <span className="font-semibold">consulta URGENCIAS</span>.
              </div>
              <div className="mt-2 text-xs text-gray-600">
                *Orientación preventiva. No reemplaza evaluación clínica ni controles de enfermedades crónicas.
              </div>
            </div>

            <StepNav />
          </section>
        ) : null}

        {/* STEP 4: Resultado */}
        {step === 3 ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resultado</h2>
              <div className="flex items-center gap-2">
                <Badge>{levelChip}</Badge>
                {last?.date ? (
                  <span className="text-xs text-gray-600">
                    Último: {new Date(last.date).toLocaleDateString()} · {last.score}/100
                  </span>
                ) : null}
              </div>
            </div>

            {/* Score con barra */}
            <div className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-600">Riesgo estimado</div>
                  <div className="mt-1 flex items-end gap-3">
                    <div className="text-3xl font-bold">{computed.score}/100</div>
                    <div className="text-sm">
                      Nivel: <span className="font-semibold">{computed.level}</span>
                    </div>
                  </div>

                  {computed.bp?.hasBP ? (
                    <div className="mt-2 text-xs text-gray-600">
                      PA informada:{" "}
                      <span className="font-semibold">
                        {computed.bp.sys}/{computed.bp.dia} mmHg
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-600">PA: no informada</div>
                  )}

                  <div className="mt-2 text-xs text-gray-600">
                    Sal añadida:{" "}
                    <span className="font-semibold">
                      {extraSalt === "never" ? "No" : extraSalt === "sometimes" ? "A veces" : "Frecuente"}
                    </span>
                    {" · "}
                    Energéticas:{" "}
                    <span className="font-semibold">
                      {toNum(energyDrinksPerWeek) === null ? "no informado" : `${toNum(energyDrinksPerWeek)} /sem`}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    Alcohol estimado:{" "}
                    <span className="font-semibold">
                      {alcoholLabel(computed.alcohol?.category)} ({computed.alcohol?.drinksPerWeek ?? 0} tragos/sem, atracón:{" "}
                      {computed.alcohol?.binge === "yes" ? "sí" : "no"})
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={shareSummary}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 transition"
                  >
                    Compartir
                  </button>
                  <button
                    type="button"
                    onClick={printPDF}
                    className="rounded-xl border px-3 py-2 text-sm bg-gray-900 text-white hover:opacity-95 transition"
                  >
                    PDF
                  </button>
                </div>
              </div>

              <div className="mt-3 h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${computed.score}%` }} />
              </div>

              {drivers?.length ? (
                <div className="mt-3 text-sm">
                  <div className="font-semibold">Lo que más influyó (según lo ingresado)</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {drivers.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Mini historial (últimas 3) */}
              {Array.isArray(history) && history.length ? (
                <div className="mt-4 text-sm">
                  <div className="font-semibold">Tus últimas mediciones</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {history.slice(0, 3).map((h, i) => (
                      <li key={i}>
                        {new Date(h.date).toLocaleDateString()} — {h.score}/100 ({h.level})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Acciones */}
            <div className="rounded-xl border p-4">
              <div className="font-semibold">Tus 3 acciones prioritarias</div>
              <div className="mt-3 space-y-2">
                {actionsWithTips.map((a, i) => (
                  <div key={i} className="rounded-xl border p-3 bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{a.title}</div>
                      <button
                        type="button"
                        onClick={() => setOpenTipIndex(openTipIndex === i ? null : i)}
                        className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50 transition"
                      >
                        {openTipIndex === i ? "Ocultar" : "Ver cómo hacerlo"}
                      </button>
                    </div>
                    {openTipIndex === i ? (
                      <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                        {a.tips.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Banderas rojas */}
            {computed.redFlags?.length ? (
              <div className="rounded-xl border p-4">
                <div className="font-semibold text-gray-900">
                  <Badge>Atención</Badge> <span className="ml-2">Banderas rojas / cuándo consultar</span>
                </div>
                <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {computed.redFlags.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Listas + controles */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4 space-y-4">
                <div>
                  <div className="font-semibold">Factores modificables a mejorar</div>
                  {computed.risksMod?.length ? (
                    <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {computed.risksMod.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">No aparecen factores modificables con los datos ingresados.</p>
                  )}
                </div>

                <div>
                  <div className="font-semibold">Condiciones diagnosticadas</div>
                  {computed.dx?.length ? (
                    <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {computed.dx.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">No reporta diagnósticos.</p>
                  )}
                </div>

                {computed.risksNoMod?.length ? (
                  <div>
                    <div className="font-semibold">Riesgos no modificables</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {computed.risksNoMod.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border p-4" ref={summaryRef}>
                <div className="font-semibold">Controles sugeridos (CESFAM)</div>
                <ul className="mt-3 list-disc pl-5 text-sm space-y-3">
                  {suggestedControls.map((c) => (
                    <li key={c.key}>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-gray-600">{c.detail}</div>
                      {c.ask ? <div className="text-gray-700 mt-1">✅ {c.ask}</div> : null}
                    </li>
                  ))}
                </ul>

                {referencesText ? <div className="mt-3 text-xs text-gray-500">{referencesText}</div> : null}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={shareSummary}
                    className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 transition"
                  >
                    Copiar/Compartir resumen
                  </button>
                  <button
                    type="button"
                    onClick={printPDF}
                    className="rounded-xl border px-4 py-2 text-sm bg-gray-900 text-white hover:opacity-95 transition"
                  >
                    Guardar PDF
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              *La frecuencia exacta de algunos tamizajes puede variar por programa local, disponibilidad y criterio clínico en tu CESFAM.
            </p>

            <StepNav />
          </section>
        ) : null}

        {/* Modal: ¿Cómo se calcula? */}
        <Modal open={openHow} title="¿Cómo se calcula este resultado?" onClose={() => setOpenHow(false)}>
          <p>
            Este MVP suma puntos por <span className="font-semibold">factores de riesgo</span> (por ejemplo IMC alto, cintura alta,
            presión arterial elevada, sal añadida, baja actividad, tabaco, glicemia/HbA1c elevadas, etc.). A mayor puntaje,
            mayor prioridad de mejora y control.
          </p>
          <p>
            <span className="font-semibold">Opcionales</span> (cintura, presión arterial y exámenes): si no los ingresas, no se penaliza;
            solo se vuelve menos preciso.
          </p>
          <p>
            <span className="font-semibold">Importante:</span> no es un diagnóstico. Si tienes enfermedad crónica o síntomas relevantes,
            lo correcto es evaluación clínica.
          </p>
        </Modal>
      </div>
    </main>
  );
}
