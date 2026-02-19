"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
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
        "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        active ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-900" : ""
      )}
      style={{ colorScheme: "light" }}
    >
      {children}
    </button>
  );
}

/**
 * ✅ FIX: Hooks NO pueden quedar “después” de un return condicional.
 * El efecto se declara siempre; adentro chequea `open`.
 */
function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{ colorScheme: "light" }}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-lg"
        onClick={stop}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}

function NumericInput({ id, label, value, onChange, placeholder, suffix, hint, warning, quickPills }) {
  return (
    <div className="space-y-1" style={{ colorScheme: "light" }}>
      <label htmlFor={id} className="block">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </label>

      <div className="flex items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          className={classNames(
            "w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-200",
            // ✅ blindado:
            "bg-white text-slate-900 placeholder:text-slate-400 border-slate-200",
            warning ? "border-slate-900" : ""
          )}
          style={{ colorScheme: "light", WebkitTextFillColor: "inherit" }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^[0-9]*[.,]?[0-9]*$/.test(v) || v === "") onChange(v);
          }}
          aria-label={label}
        />
        {suffix ? <span className="text-sm text-slate-600">{suffix}</span> : null}
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
        <div className="text-xs text-slate-700">
          <Badge>Revisa</Badge> <span className="ml-1">{warning}</span>
        </div>
      ) : null}
    </div>
  );
}

function Select({ id, label, value, onChange, options, hint }) {
  return (
    <div className="space-y-1" style={{ colorScheme: "light" }}>
      <label htmlFor={id} className="block">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </label>
      <select
        id={id}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
        style={{ colorScheme: "light" }}
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
  // ✅ Blindaje global: fuerza light scheme y elimina clase dark si existe
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.style.colorScheme = "light";
    body.style.colorScheme = "light";

    // Si Tailwind dark mode por class estuviera activo, lo quitamos
    html.classList.remove("dark");

    // Algunos navegadores cambian inputs, así que reforzamos
    html.setAttribute("data-force-light", "true");

    return () => {
      html.style.colorScheme = "";
      body.style.colorScheme = "";
      html.removeAttribute("data-force-light");
    };
  }, []);

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

  // ✅ Guardado en Supabase “una vez por resultado”
  const savedToSupabaseRef = useRef(false);

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

  // Sal añadida y bebidas energéticas
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

  // -------------------- Validación de mercado (MVP) --------------------
  const [mvqAwareness, setMvqAwareness] = useState(""); // "known" | "suspected" | "didntknow"
  const [mvqMonthly, setMvqMonthly] = useState(""); // "yes" | "maybe" | "no"
  const [mvqReco, setMvqReco] = useState(""); // "yes" | "maybe" | "no"
  const [mvqSaved, setMvqSaved] = useState(false);

  // Refs para scroll
  const topRef = useRef(null);

  // ✅ Función real para guardar (tabla: assessments; columnas: answers, score, risk_level)
  async function guardarEvaluacion({ answers, score, riskLevel, mvqAwareness, mvqMonthly, mvqReco }) {
    if (!supabase) return { ok: false, error: "supabase_not_configured" };

    const { data, error } = await supabase
      .from("assessments")
      .insert([
        {
          answers,
          score,
          risk_level: riskLevel,
          mvq_awareness: mvqAwareness,
          mvq_monthly: mvqMonthly,
          mvq_reco: mvqReco,
        },
      ])
      .select();

    if (error) return { ok: false, error };
    return { ok: true, data };
  }

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

    const contrib = [];
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

    // Cintura
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

    // Presión
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

    // Sal extra
    if (extraSalt === "often") {
      score += 4;
      risksMod.push("Añade sal extra frecuentemente");
      add("mod", "Añade sal extra frecuentemente", 4);
    } else if (extraSalt === "sometimes") {
      score += 2;
      add("mod", "Añade sal extra ocasionalmente", 2);
    }

    // Energéticas
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

    // Labs
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

    // Dx
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

    // Red flags
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
      alcohol: { drinksPerWeek: drinksW, binge: alcoholBinge, category: alcCat },
      bp: { sys: SYS, dia: DIA, hasBP },
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

  // Guardar historial
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

  // Guardar SOLO al llegar a resultado
  useEffect(() => {
    if (step !== 3) {
      savedForThisResultRef.current = false;
      savedToSupabaseRef.current = false;
      return;
    }
    if (savedForThisResultRef.current) return;
    savedForThisResultRef.current = true;

    // Local
    try {
      const payload = { date: new Date().toISOString(), score: computed.score, level: computed.level };
      localStorage.setItem("cm_last", JSON.stringify(payload));
      setLast(payload);

      setHistory((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        const next = [payload, ...prevArr].slice(0, 12);
        localStorage.setItem("cm_history", JSON.stringify(next));
        return next;
      });
    } catch {}

    // Supabase
    (async () => {
      if (savedToSupabaseRef.current) return;
      savedToSupabaseRef.current = true;

      const answers = {
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
      };

      const res = await guardarEvaluacion({
        answers,
        score: computed.score,
        riskLevel: computed.level,
        mvqAwareness,
        mvqMonthly,
        mvqReco,
      });

      if (res.ok && res.data?.[0]?.id) {
        localStorage.setItem("cm_last_assessment_id", res.data[0].id);
      }
    })();
  }, [
    step,
    computed.score,
    computed.level,
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
    mvqAwareness,
    mvqMonthly,
    mvqReco,
  ]);

  // Reset encuesta al entrar en Resultado
  useEffect(() => {
    if (step !== 3) return;
    setMvqSaved(false);
    setMvqAwareness("");
    setMvqMonthly("");
    setMvqReco("");
  }, [step]);

  const progressPct = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  const goStep = (i) => {
    setStep(clamp(i, 0, steps.length - 1));
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  // Drivers top 3
  const drivers = useMemo(() => {
    const top = [...(computed.contrib ?? [])].sort((a, b) => b.points - a.points).slice(0, 3);
    return top.map((x) => x.label);
  }, [computed.contrib]);

  const shareSummary = async () => {
    const d = new Date().toLocaleDateString();
    const text = [
      `Evaluación cardiometabólica (MVP) — ${d}`,
      `Score: ${computed.score}/100 · Nivel: ${computed.level}`,
      drivers?.length ? `Principales factores: ${drivers.join(" · ")}` : "",
      `*Orientación preventiva. No reemplaza evaluación clínica.`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: "Resumen cardiometabólico", text });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      alert("Resumen copiado ✅");
    } catch {
      alert("No se pudo copiar. Copia manualmente.");
    }
  };

  const saveMarketValidation = async () => {
    if (!mvqAwareness || !mvqMonthly || !mvqReco) {
      alert("Responde las 3 preguntas 🙂");
      return;
    }

    try {
      const payload = {
        date: new Date().toISOString(),
        score: computed.score,
        level: computed.level,
        awareness: mvqAwareness,
        monthly: mvqMonthly,
        recommendations: mvqReco,
      };
      const raw = localStorage.getItem("cm_market_validation");
      const prev = raw ? JSON.parse(raw) : [];
      const next = [payload, ...(Array.isArray(prev) ? prev : [])].slice(0, 200);
      localStorage.setItem("cm_market_validation", JSON.stringify(next));
    } catch {}

    try {
      const id = localStorage.getItem("cm_last_assessment_id");
      if (!supabase) throw new Error("supabase_not_configured");
      if (!id) throw new Error("missing_assessment_id");

      const { error } = await supabase
        .from("assessments")
        .update({
          mvq_awareness: mvqAwareness,
          mvq_monthly: mvqMonthly,
          mvq_reco: mvqReco,
        })
        .eq("id", id);

      if (error) throw error;

      setMvqSaved(true);
    } catch (e) {
      console.error("MVQ supabase error:", e);
      setMvqSaved(true);
    }
  };

  const StepNav = () => (
    <div className="flex items-center justify-between pt-6">
      <button
        type="button"
        onClick={() => goStep(step - 1)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        style={{ colorScheme: "light" }}
        disabled={step === 0}
      >
        Atrás
      </button>

      <button
        type="button"
        onClick={() => goStep(step + 1)}
        className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-95 transition disabled:opacity-50"
        style={{ colorScheme: "light" }}
        disabled={step === steps.length - 1}
      >
        Siguiente
      </button>
    </div>
  );

  return (
    <main
      ref={topRef}
      className="min-h-screen bg-[#f6f7fb] text-slate-900 p-3 sm:p-4 md:p-7"
      style={{ colorScheme: "light" }}
    >
      <div className="mx-auto w-full max-w-4xl space-y-4 sm:space-y-5">
        {/* Header */}
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ colorScheme: "light" }}>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Evaluación cardiometabólica (MVP)</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            En 2 minutos identifica tus principales puntos a mejorar.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={shareSummary}
              className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              style={{ colorScheme: "light" }}
              type="button"
            >
              Compartir resumen
            </button>

            <button
              onClick={() => setOpenHow(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              style={{ colorScheme: "light" }}
              type="button"
            >
              ¿Cómo se calcula?
            </button>

            <div className="ml-auto flex items-center gap-2">
              <Badge>Sin registro de datos</Badge>
              <Badge>Modo claro fijo</Badge>
            </div>
          </div>
        </header>

        {/* Wizard header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ colorScheme: "light" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-slate-900 sm:text-lg">
              Paso {step + 1} de {steps.length}: <span className="font-bold">{steps[step].title}</span>
            </div>
            <div className="text-base text-slate-600 sm:text-lg">{progressPct}%</div>
          </div>

          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {steps.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => goStep(i)}
                className={classNames(
                  "rounded-full border px-3 py-2 text-sm transition",
                  i === step
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
                style={{ colorScheme: "light" }}
              >
                {s.title}
              </button>
            ))}
          </div>
        </section>

        {/* Step 1 */}
        {step === 0 ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 space-y-4" style={{ colorScheme: "light" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Datos</h2>
              <Badge>Opcional = no afecta</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <NumericInput id="age" label="Edad" value={age} onChange={setAge} placeholder="Ej: 31" suffix="años" warning={computed.warnings?.age} />

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

              <NumericInput id="weight" label="Peso" value={weight} onChange={setWeight} placeholder="Ej: 66" suffix="kg" warning={computed.warnings?.weight} />

              <NumericInput
                id="height"
                label="Talla"
                value={height}
                onChange={setHeight}
                placeholder="Ej: 177 o 1.77"
                suffix="cm"
                hint="Si escribes 1.77 se interpreta como metros."
                warning={computed.warnings?.height}
              />

              <NumericInput id="waist" label="Cintura (opcional)" value={waist} onChange={setWaist} placeholder="Opcional" suffix="cm" warning={computed.warnings?.waist} />

              <NumericInput id="bpSys" label="PA sistólica (opcional)" value={bpSys} onChange={setBpSys} placeholder="Ej: 120" suffix="mmHg" warning={computed.warnings?.bpSys} />
              <NumericInput id="bpDia" label="PA diastólica (opcional)" value={bpDia} onChange={setBpDia} placeholder="Ej: 80" suffix="mmHg" warning={computed.warnings?.bpDia} />

              <NumericInput id="glucose" label="Glicemia (opcional)" value={glucose} onChange={setGlucose} placeholder="Ej: 92" suffix="mg/dL" warning={computed.warnings?.glucose} />
              <NumericInput id="hba1c" label="HbA1c (opcional)" value={hba1c} onChange={setHba1c} placeholder="Ej: 5.4" suffix="%" warning={computed.warnings?.hba1c} />
              <NumericInput id="chol" label="Colesterol total (opcional)" value={cholTotal} onChange={setCholTotal} placeholder="Ej: 180" suffix="mg/dL" warning={computed.warnings?.chol} />
            </div>

            <StepNav />
          </section>
        ) : null}

        {/* Step 2 */}
        {step === 1 ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 space-y-4" style={{ colorScheme: "light" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Hábitos</h2>
              <Badge>Usa chips</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <NumericInput id="breads" label="Pan al día" value={breadsPerDay} onChange={setBreadsPerDay} placeholder="Ej: 2" suffix="unid/día" />
              <NumericInput id="sugary" label="Bebidas azucaradas / dulces" value={sugaryDrinksPerWeek} onChange={setSugaryDrinksPerWeek} placeholder="Ej: 3" suffix="veces/sem" />
              <NumericInput id="protein" label="Proteína (aprox.)" value={proteinServingsPerDay} onChange={setProteinServingsPerDay} placeholder="Ej: 2" suffix="porciones/día" />

              <Select
                id="extraSalt"
                label="¿Añade sal extra al plato?"
                value={extraSalt}
                onChange={setExtraSalt}
                options={[
                  { value: "never", label: "Nunca" },
                  { value: "sometimes", label: "A veces" },
                  { value: "often", label: "Frecuentemente" },
                ]}
              />

              <NumericInput id="energy" label="Bebidas energéticas" value={energyDrinksPerWeek} onChange={setEnergyDrinksPerWeek} placeholder="Ej: 2" suffix="veces/sem" />

              <Select
                id="friedPeriod"
                label="Frituras: periodo"
                value={friedPeriod}
                onChange={setFriedPeriod}
                options={[
                  { value: "week", label: "Por semana" },
                  { value: "month", label: "Por mes" },
                ]}
              />
              <NumericInput
                id="friedCount"
                label="Frituras: cantidad"
                value={friedCount}
                onChange={setFriedCount}
                placeholder="Ej: 1"
                suffix={friedPeriod === "month" ? "veces/mes" : "veces/sem"}
              />

              <NumericInput id="sleep" label="Sueño" value={sleepHours} onChange={setSleepHours} placeholder="Ej: 7" suffix="horas/noche" />
              <NumericInput id="activity" label="Actividad física" value={activityMinutesWeek} onChange={setActivityMinutesWeek} placeholder="Ej: 150" suffix="min/sem" />

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

              <NumericInput
                id="alcoholDrinksPerWeek"
                label="Alcohol (tragos estándar)"
                value={alcoholDrinksPerWeek}
                onChange={setAlcoholDrinksPerWeek}
                placeholder="Ej: 2"
                suffix="tragos/sem"
                hint="1 cerveza 350cc · 1 copa vino 150cc · 1 destilado 45cc."
              />

              <Select
                id="alcoholBinge"
                label="¿Atracón (binge) en el último mes?"
                value={alcoholBinge}
                onChange={setAlcoholBinge}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Sí" },
                ]}
                hint="Atracón ≈ 4+ tragos (mujer) o 5+ (hombre) en una ocasión."
              />

              <div className="md:col-span-2 text-sm text-slate-700">
                Categoría alcohol estimada:{" "}
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

            <StepNav />
          </section>
        ) : null}

        {/* Step 3 */}
        {step === 2 ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 space-y-4" style={{ colorScheme: "light" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Salud</h2>
              <Badge>Personaliza</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select id="hasHTN" label="¿HTA diagnosticada?" value={hasHTN} onChange={setHasHTN} options={[{ value: "no", label: "No" }, { value: "yes", label: "Sí" }]} />
              <Select id="hasDM" label="¿Diabetes diagnosticada?" value={hasDM} onChange={setHasDM} options={[{ value: "no", label: "No" }, { value: "yes", label: "Sí" }]} />
              <Select id="hasDyslip" label="¿Dislipidemia?" value={hasDyslip} onChange={setHasDyslip} options={[{ value: "no", label: "No" }, { value: "yes", label: "Sí" }]} />
              <Select id="hasCVD" label="¿Enfermedad cardiovascular (infarto/ACV)?" value={hasCVD} onChange={setHasCVD} options={[{ value: "no", label: "No" }, { value: "yes", label: "Sí" }]} />

              <Select id="famPrematureCVD" label="Antecedente familiar CV temprano" value={famPrematureCVD} onChange={setFamPrematureCVD} options={[{ value: "no", label: "No / no sé" }, { value: "yes", label: "Sí" }]} />

              <Select
                id="thyroidDx"
                label="¿Hipo/Hipertiroidismo?"
                value={thyroidDx}
                onChange={setThyroidDx}
                options={[
                  { value: "none", label: "No" },
                  { value: "hypo", label: "Hipotiroidismo" },
                  { value: "hyper", label: "Hipertiroidismo" },
                ]}
              />

              <Select id="chestPain" label="Dolor/opresión en el pecho" value={chestPain} onChange={setChestPain} options={[{ value: "no", label: "No" }, { value: "yes", label: "Sí" }]} />
              <Select id="easyFatigue" label="¿Fatiga fácil?" value={easyFatigue} onChange={setEasyFatigue} options={[{ value: "no", label: "No" }, { value: "yes", label: "Sí" }]} />

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

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">Importante</div>
              <div className="mt-2 text-sm text-slate-700">
                Si tienes dolor de pecho intenso, falta de aire importante o síntomas nuevos, consulta <span className="font-semibold">URGENCIAS</span>.
              </div>
              <div className="mt-2 text-xs text-slate-500">*Orientación preventiva. No reemplaza evaluación clínica.</div>
            </div>

            <StepNav />
          </section>
        ) : null}

        {/* Step 4 */}
        {step === 3 ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 space-y-4" style={{ colorScheme: "light" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Resultado</h2>
              {last?.date ? (
                <span className="text-xs text-slate-600">
                  Último: {new Date(last.date).toLocaleDateString()} · {last.score}/100
                </span>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-600">Riesgo estimado</div>
                  <div className="mt-1 flex items-end gap-3">
                    <div className="text-3xl font-bold text-slate-900">{computed.score}/100</div>
                    <div className="text-sm text-slate-700">
                      Nivel: <span className="font-semibold">{computed.level}</span>
                    </div>
                  </div>
                  {drivers?.length ? (
                    <div className="mt-2 text-sm text-slate-700">
                      <span className="font-semibold">Lo que más influyó:</span> {drivers.join(" · ")}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={shareSummary}
                  className="rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm text-white hover:opacity-95"
                  style={{ colorScheme: "light" }}
                >
                  Compartir
                </button>
              </div>

              <div className="mt-3 h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${computed.score}%` }} />
              </div>

              {computed.redFlags?.length ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-semibold text-slate-900">Atención</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                    {computed.redFlags.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Validación de mercado */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">Ayúdanos a mejorar (1 minuto)</div>
              <p className="mt-1 text-sm text-slate-600">Tus respuestas son anónimas.</p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-900">¿Conocías tu riesgo antes?</div>
                  {[
                    ["known", "Sí, ya lo conocía"],
                    ["suspected", "Lo sospechaba, pero no estaba seguro(a)"],
                    ["didntknow", "No, no lo sabía"],
                  ].map(([val, lab]) => (
                    <label key={val} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        className="h-4 w-4"
                        style={{ colorScheme: "light", accentColor: "#0f172a" }}
                        type="radio"
                        name="mvqAwareness"
                        value={val}
                        checked={mvqAwareness === val}
                        onChange={(e) => setMvqAwareness(e.target.value)}
                      />
                      {lab}
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-900">¿Repetirías mensualmente?</div>
                  {[
                    ["yes", "Sí, definitivamente"],
                    ["maybe", "Tal vez"],
                    ["no", "No por ahora"],
                  ].map(([val, lab]) => (
                    <label key={val} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        className="h-4 w-4"
                        style={{ colorScheme: "light", accentColor: "#0f172a" }}
                        type="radio"
                        name="mvqMonthly"
                        value={val}
                        checked={mvqMonthly === val}
                        onChange={(e) => setMvqMonthly(e.target.value)}
                      />
                      {lab}
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-900">¿Quieres recomendaciones personalizadas?</div>
                  {[
                    ["yes", "Sí"],
                    ["maybe", "Tal vez"],
                    ["no", "No"],
                  ].map(([val, lab]) => (
                    <label key={val} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        className="h-4 w-4"
                        style={{ colorScheme: "light", accentColor: "#0f172a" }}
                        type="radio"
                        name="mvqReco"
                        value={val}
                        checked={mvqReco === val}
                        onChange={(e) => setMvqReco(e.target.value)}
                      />
                      {lab}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveMarketValidation}
                  disabled={mvqSaved}
                  className={classNames(
                    "rounded-xl border px-4 py-2 text-sm transition active:scale-[0.99]",
                    mvqSaved
                      ? "border-slate-200 bg-slate-100 text-slate-500"
                      : "border-slate-900 bg-slate-900 text-white hover:opacity-95"
                  )}
                  style={{ colorScheme: "light" }}
                >
                  {mvqSaved ? "Respuesta guardada ✅" : "Enviar respuestas"}
                </button>
                <span className="text-xs text-slate-600">{mvqSaved ? "¡Gracias!" : "Anónimo"}</span>
              </div>
            </div>

            <StepNav />
          </section>
        ) : null}

        {/* Modal */}
        <Modal open={openHow} title="¿Cómo se calcula este resultado?" onClose={() => setOpenHow(false)}>
          <p>
            Este MVP suma puntos por factores de riesgo (IMC alto, cintura alta, presión elevada, sal extra, baja actividad,
            tabaco, glicemia/HbA1c, etc.). A mayor puntaje, mayor prioridad de mejora y control.
          </p>
          <p className="text-slate-700">
            Importante: no es diagnóstico. Si hay síntomas importantes o enfermedad crónica, lo correcto es evaluación clínica.
          </p>
        </Modal>
      </div>
    </main>
  );
}