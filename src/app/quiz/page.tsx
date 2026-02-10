"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Risk = "green" | "yellow" | "red";



function computeRisk(a: {
  age: number;
  sex: "female" | "male";
  smoke: boolean;
  alcohol: boolean;
  activityDays: number;
  sleepHours: number;
  chestPainNow: boolean;

  // NUEVO (metabólico / hábitos)
  breadPerDay: number;
  friedPerWeek: number;
  sugaryDrinksPerWeek: number;

  weightKg: number;
  heightCm: number;
  waistCm: number;

  glucose: number;
  a1c: number;
  totalChol: number;
}) {
  const redFlags: string[] = [];
  const tips: string[] = [];
  let score = 0;
  // ===== Metabólico: IMC y cintura =====
  const heightM = a.heightCm > 0 ? a.heightCm / 100 : 0;
  const bmi = heightM > 0 ? a.weightKg / (heightM * heightM) : null;

  const bmiCategory =
    bmi === null
      ? "Sin datos"
      : bmi < 18.5
        ? "Bajo peso"
        : bmi < 25
          ? "Normal"
          : bmi < 30
            ? "Sobrepeso"
            : "Obesidad";

  // Cintura (criterios simples y prácticos)
  // Riesgo aumentado: H >=94 / M >=80; Alto: H >=102 / M >=88 (referencia común internacional)
  const waistRisk =
    a.waistCm <= 0
      ? "Sin datos"
      : a.sex === "male"
        ? a.waistCm >= 102
          ? "Alto"
          : a.waistCm >= 94
            ? "Aumentado"
            : "Normal"
        : a.waistCm >= 88
          ? "Alto"
          : a.waistCm >= 80
            ? "Aumentado"
            : "Normal";

  // Puntaje por IMC
  if (bmi !== null) {
    if (bmi >= 30) score += 3;
    else if (bmi >= 25) score += 2;
  }

  // Puntaje por cintura
  if (waistRisk === "Alto") score += 3;
  else if (waistRisk === "Aumentado") score += 2;

  // ===== Hábitos "chilenos" =====
  // Pan/día
  if (a.breadPerDay >= 4) score += 2;
  else if (a.breadPerDay >= 2) score += 1;

  // Frituras/semana
  if (a.friedPerWeek >= 4) score += 2;
  else if (a.friedPerWeek >= 2) score += 1;

  // Bebidas/azucarados/semana
  if (a.sugaryDrinksPerWeek >= 4) score += 2;
  else if (a.sugaryDrinksPerWeek >= 2) score += 1;

  // Banderas rojas
  if (a.chestPainNow) redFlags.push("Dolor en el pecho actualmente");

  // Puntaje simple
  if (a.age >= 45) score += 2;
  else if (a.age >= 35) score += 1;

  if (a.smoke) score += 2;
  if (a.alcohol) score += 1;

  if (a.activityDays <= 1) score += 2;
  else if (a.activityDays <= 3) score += 1;

  if (a.sleepHours < 6) score += 2;
  else if (a.sleepHours < 7) score += 1;

  // Nivel de riesgo
  let risk: Risk = "green";
  if (redFlags.length > 0) risk = "red";
  else if (score >= 6) risk = "red";
  else if (score >= 3) risk = "yellow";

  // Recomendaciones personalizadas
  if (redFlags.length > 0) {
    tips.push("Signos de alarma: si es actual, severo o te preocupa, busca atención presencial hoy.");
  }

  if (a.smoke) {
    tips.push("Tabaco: define una meta realista para reducir/dejar y busca apoyo (CESFAM o programa de cesación).");
  }

  if (a.alcohol) {
    tips.push("Alcohol: reduce frecuencia y cantidad. Ideal: mantener días sin alcohol y evitarlo como manejo del estrés.");
  }

  if (a.activityDays <= 1) {
    tips.push("Actividad física: parte con 10–20 min caminata 5 días/semana. Meta: 150 min/semana.");
  } else if (a.activityDays <= 3) {
    tips.push("Actividad física: buen inicio. Sube a 4–5 días/semana y añade 2 sesiones de fuerza.");
  }

  if (a.sleepHours < 6) {
    tips.push("Sueño: fija horario. Evita pantallas 60 min antes y reduce cafeína después de las 14:00.");
  } else if (a.sleepHours < 7) {
    tips.push("Sueño: intenta llegar a 7–8 horas ajustando en bloques de 15–30 min.");
  }

  return { score, risk, redFlags, tips, bmi, bmiCategory, waistRisk };
}

function getScreeningReminders(age: number, sex: "female" | "male") {
  const reminders: string[] = [];

  // MUJER: PAP 25-64 cada 3 años (MINSAL)
  if (sex === "female" && age >= 25 && age <= 64) {
    reminders.push("PAP: recomendado entre 25–64 años (habitualmente cada 3 años si está normal).");
  }

  // MUJER: Mamografía 50-69 (guías MINSAL; puede variar por programa/riesgo)
  if (sex === "female" && age >= 50 && age <= 69) {
    reminders.push("Mamografía: revisar tamizaje entre 50–69 años (frecuencia puede variar según programa/riesgo).");
  }

  // HOMBRE: PSA 50-70 (recomendación condicional: conversar pros/cons)
  if (sex === "male" && age >= 50 && age <= 70) {
    reminders.push("Antígeno prostático (PSA): considerar entre 50–70 años conversando pros y contras con un profesional.");
  }

  // Ambos: Control cardiometabólico (orientación general)
  if (age >= 18) {
    reminders.push("Chequeo cardiometabólico: presión arterial, glicemia y lípidos según antecedentes y control preventivo.");
  }

  return reminders;



  if (sex === "female" && age >= 25 && age <= 64) {
    reminders.push("PAP: recomendado entre 25–64 años (habitualmente cada 3 años si está normal).");
  }

  if (sex === "female" && age >= 50 && age <= 69) {
    reminders.push("Mamografía: revisar tamizaje entre 50–69 años según programa o riesgo.");
  }

  if (sex === "male" && age >= 50 && age <= 70) {
    reminders.push("Antígeno prostático (PSA): considerar entre 50–70 años conversando pros y contras con un profesional.");
  }

  reminders.push("Chequeo cardiometabólico: presión arterial, glicemia y perfil lipídico según control preventivo.");

  return reminders;

}
export default function QuizPage() {
  const [age, setAge] = useState<number>(30);
  const [sex, setSex] = useState<"female" | "male">("female");
  const [smoke, setSmoke] = useState<boolean>(false);
  const [alcohol, setAlcohol] = useState<boolean>(false);
  const [activityDays, setActivityDays] = useState<number>(3);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [chestPainNow, setChestPainNow] = useState<boolean>(false);
  const [step, setStep] = useState(1); const totalSteps = 4;
  const [weightKg, setWeightKg] = useState<number>(0);
  const [heightCm, setHeightCm] = useState<number>(0);
  const [waistCm, setWaistCm] = useState<number>(0);

  const [breadPerDay, setBreadPerDay] = useState<number>(0);
  const [friedPerWeek, setFriedPerWeek] = useState<number>(0);
  const [sugaryDrinksPerWeek, setSugaryDrinksPerWeek] = useState<number>(0);

  const [glucose, setGlucose] = useState(0);
  const [a1c, setA1c] = useState(0); // HbA1c
  const [totalChol, setTotalChol] = useState(0);

  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    return computeRisk({
      age,
      sex,
      smoke,
      alcohol,
      activityDays,
      sleepHours,
      chestPainNow,
      breadPerDay,
      friedPerWeek,
      sugaryDrinksPerWeek,
      weightKg,
      heightCm,
      waistCm,
      glucose,
      a1c,
      totalChol,
    });
  }, [
    age, sex, smoke, alcohol, activityDays, sleepHours, chestPainNow,
    breadPerDay, friedPerWeek, sugaryDrinksPerWeek,
    weightKg, heightCm, waistCm,
    glucose, a1c, totalChol
  ]);

  const riskLabel =
    result.risk === "green"
      ? "Bajo"
      : result.risk === "yellow"
        ? "Medio"
        : "Alto";

  const riskText =

    result.risk === "green"
      ? "Sigue reforzando hábitos preventivos. Si tienes dudas, agenda un control preventivo."
      : result.risk === "yellow"
        ? "Hay factores que vale la pena mejorar. Considera un control preventivo y ajustes de hábitos."
        : "Recomendación: consulta prioritaria, especialmente si presentas síntomas o antecedentes importantes.";
  const healthScore = Math.max(0, 100 - result.score * 10);

  const riskColor =
    result.risk === "green"
      ? "bg-emerald-600"
      : result.risk === "yellow"
        ? "bg-amber-500"
        : "bg-rose-600";

  const riskBadge =
    result.risk === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : result.risk === "yellow"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-rose-50 text-rose-700 ring-rose-200";

  const answeredCount =
    (age > 0 ? 1 : 0) +
    (activityDays >= 0 ? 1 : 0) +
    (sleepHours >= 0 ? 1 : 0) +
    1 + // smoke siempre tiene valor (true/false)
    1 + // alcohol siempre tiene valor
    1;  // chestPainNow siempre tiene valor

  const totalQuestions = 6;
  const stepProgress = Math.round((step / totalSteps) * 100);

  const canSubmit = age > 0 && sleepHours > 0;

  const screeningReminders = useMemo(() => {
    return getScreeningReminders(age, sex);
  }, [age, sex]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

      <div className="max-w-xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Evaluación preventiva</h1>

            <div className="text-sm text-gray-600 mt-1">
              <p>Orientación general, no reemplaza evaluación médica.</p>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Progreso</span>
                  <span>{stepProgress}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-black" style={{ width: `${stepProgress}%` }} />
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="text-sm text-gray-700 hover:text-black underline underline-offset-4"
          >
            Volver
          </Link>
        </div>

        {/* Card principal */}
        <div className="mt-6 rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-gray-50">
            <p className="text-sm font-medium text-gray-700">Cuestionario rápido</p>
            <p className="text-xs text-gray-500 mt-1">
              Responde y obtén un perfil preventivo + recomendaciones.
            </p>
          </div>

          {/* STEP 1 — Datos básicos */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Edad */}
              <div className="rounded-2xl border p-4">
                <label className="block font-medium">Edad</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              {/* Sexo */}
              <div className="rounded-2xl border p-4">
                <label className="block font-medium">Sexo</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as "male" | "female")}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                >
                  <option value="female">Mujer</option>
                  <option value="male">Hombre</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Esto se usa para recordatorios de controles y cintura (riesgo cardiometabólico).
                </p>
              </div>
            </div>
          )}

          {/* STEP 2 — Hábitos chilenos + tabaco/alcohol */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-2xl border p-4">
                <label className="block font-medium">¿Cuántos panes al día consumes?</label>
                <input
                  type="number"
                  min={0}
                  value={breadPerDay}
                  onChange={(e) => setBreadPerDay(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
                <p className="text-xs text-gray-500 mt-2">Ej: 0–1 / 2–3 / 4 o más.</p>
              </div>

              <div className="rounded-2xl border p-4">
                <label className="block font-medium">¿Cuántas veces a la semana comes frituras?</label>
                <input
                  type="number"
                  min={0}
                  value={friedPerWeek}
                  onChange={(e) => setFriedPerWeek(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="rounded-2xl border p-4">
                <label className="block font-medium">
                  ¿Cuántas veces a la semana consumes bebidas/azucarados?
                </label>
                <input
                  type="number"
                  min={0}
                  value={sugaryDrinksPerWeek}
                  onChange={(e) => setSugaryDrinksPerWeek(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              {/* Tabaco */}
              <div className="rounded-2xl border p-4">
                <label className="block font-medium">¿Fumas actualmente?</label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSmoke(true)}
                    className={`flex-1 px-4 py-2 rounded-xl border font-medium transition ${smoke ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
                      }`}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmoke(false)}
                    className={`flex-1 px-4 py-2 rounded-xl border font-medium transition ${!smoke ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
                      }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Alcohol */}
              <div className="rounded-2xl border p-4">
                <label className="block font-medium">¿Consumes alcohol de forma habitual (≥2 veces/semana)?</label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAlcohol(true)}
                    className={`flex-1 px-4 py-2 rounded-xl border font-medium transition ${alcohol ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
                      }`}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlcohol(false)}
                    className={`flex-1 px-4 py-2 rounded-xl border font-medium transition ${!alcohol ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
                      }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — IMC / cintura + actividad + sueño */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border p-4">
                <label className="block font-medium">Peso (kg)</label>
                <input
                  type="number"
                  min={0}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="rounded-2xl border p-4">
                <label className="block font-medium">Talla (cm)</label>
                <input
                  type="number"
                  min={0}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="rounded-2xl border p-4">
                <label className="block font-medium">Circunferencia de cintura (cm)</label>
                <input
                  type="number"
                  min={0}
                  value={waistCm}
                  onChange={(e) => setWaistCm(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Mide a nivel del ombligo, sin apretar. Útil para riesgo cardiometabólico.
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <label className="block font-medium">¿Cuántos días por semana haces actividad física (≥30 min)?</label>
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={activityDays}
                  onChange={(e) => setActivityDays(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="rounded-2xl border p-4">
                <label className="block font-medium">¿Cuántas horas duermes promedio por noche?</label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>
            </div>
          )}

          {/* STEP 4 — Exámenes + signos de alarma + Resultado */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-2xl border p-4">
                <label className="block font-medium">Glicemia (mg/dL)</label>
                <input
                  type="number"
                  min={0}
                  value={glucose}
                  onChange={(e) => setGlucose(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="rounded-2xl border p-4">
                <label className="block font-medium">Hemoglobina glicosilada HbA1c (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={a1c}
                  onChange={(e) => setA1c(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="rounded-2xl border p-4">
                <label className="block font-medium">Colesterol total (mg/dL)</label>
                <input
                  type="number"
                  min={0}
                  value={totalChol}
                  onChange={(e) => setTotalChol(Number(e.target.value))}
                  className="mt-2 w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="rounded-2xl border p-4">
                <label className="block font-medium">¿Tienes dolor en el pecho ahora mismo?</label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setChestPainNow(true)}
                    className={`flex-1 px-4 py-2 rounded-xl border font-medium transition ${chestPainNow ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
                      }`}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setChestPainNow(false)}
                    className={`flex-1 px-4 py-2 rounded-xl border font-medium transition ${!chestPainNow ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
                      }`}
                  >
                    No
                  </button>
                </div>
              </div>


              {submitted && (
                <div className="mt-2 rounded-2xl border p-5">
                  <p className="text-xs text-gray-500">Resultado</p>

                  {/* Metabólico */}
                  <div className="mt-3 rounded-xl border bg-white p-4">
                    <p className="font-medium">Metabólico</p>
                    <p className="text-sm text-gray-700 mt-1">
                      IMC: {result.bmi == null ? "Sin datos" : result.bmi.toFixed(1)} ({result.bmiCategory})
                    </p>
                    <p className="text-sm text-gray-700">
                      Cintura: {waistCm > 0 ? `${waistCm} cm` : "Sin datos"} — Riesgo {result.waistRisk}
                    </p>
                  </div>

                  {/* Riesgo general */}
                  <div className="mt-3">
                    <div className="mt-1 flex items-center gap-2">
                      <h2 className="text-xl font-bold">Riesgo {riskLabel}</h2>
                      <span className={`text-xs px-2 py-1 rounded-full ring-1 ${riskBadge}`}>
                        {result.risk}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-700">{riskText}</p>
                  </div>

                  {/* Tips */}
                  {result.tips.length > 0 && (
                    <div className="mt-4 rounded-xl border bg-gray-50 p-4">
                      <p className="font-medium">Recomendaciones personalizadas</p>
                      <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                        {result.tips.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recordatorios por edad/sexo */}
                  {screeningReminders.length > 0 && (
                    <div className="mt-4 rounded-xl border bg-white p-4">
                      <p className="font-medium">Controles sugeridos según tu edad</p>
                      <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                        {screeningReminders.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-gray-500">
                        *Orientación general. La frecuencia exacta puede variar según riesgo y programa (CESFAM/EMP).
                      </p>
                    </div>
                  )}

                  {/* Red flags */}
                  {result.redFlags.length > 0 && (
                    <div className="mt-4 rounded-xl border p-4">
                      <p className="font-medium">Signos de alarma detectados</p>
                      <ul className="list-disc pl-5 mt-2 text-sm text-gray-700">
                        {result.redFlags.map((rf) => (
                          <li key={rf}>{rf}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-gray-500">
                        Si esto es actual o severo, busca atención presencial hoy.
                      </p>
                    </div>
                  )}

                  <p className="mt-4 text-xs text-gray-500">
                    *Orientación preventiva. Si tienes una condición crónica o síntomas importantes, consulta.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navegación */}
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className={`px-4 py-2 border rounded-xl ${step === 1 ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              Atrás
            </button>

            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
                className="px-4 py-2 bg-black text-white rounded-xl"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="px-4 py-2 bg-black text-white rounded-xl"
              >
                Ver resultado
              </button>
            )}
          </div>

        </div>  {/* cierra p-5 space-y-4 */}
      </div>    {/* cierra Card principal */}
        /* cierra max-w-xl mx-auto p-6 */
  </main>
);
}