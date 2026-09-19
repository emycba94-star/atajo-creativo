"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { QUESTIONS, WELCOME_TEXT } from "@/lib/questions";
import { currentWeek } from "@/lib/week";
import type { Entry } from "@/lib/supabase";

type Answers = { q1: string; q2: string; q3: string; q4: string; q5: string };
const EMPTY: Answers = { q1: "", q2: "", q3: "", q4: "", q5: "" };

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Home() {
  const week = currentWeek();

  const [personId, setPersonId] = useState<string | null>(null);
  const [personName, setPersonName] = useState<string>("");
  const [nameInput, setNameInput] = useState("");

  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [history, setHistory] = useState<Entry[]>([]);
  const [viewing, setViewing] = useState<Entry | null>(null);
  const [ready, setReady] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoad = useRef(true);

  // Cargar identidad de localStorage
  useEffect(() => {
    const id = localStorage.getItem("ac_person_id");
    const name = localStorage.getItem("ac_person_name");
    if (id && name) {
      setPersonId(id);
      setPersonName(name);
    }
    setReady(true);
  }, []);

  // Traer historial + entrada de la semana actual
  const loadMine = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/mine?person_id=${encodeURIComponent(id)}`);
      const data = await res.json();
      const entries: Entry[] = data.entries ?? [];
      setHistory(entries);
      const thisWeek = entries.find((e) => e.week_id === week.weekId);
      if (thisWeek) {
        setAnswers({
          q1: thisWeek.q1 || "",
          q2: thisWeek.q2 || "",
          q3: thisWeek.q3 || "",
          q4: thisWeek.q4 || "",
          q5: thisWeek.q5 || "",
        });
        setSubmitted(thisWeek.submitted);
      }
    } catch {
      /* silencioso */
    }
  }, [week.weekId]);

  useEffect(() => {
    if (personId) loadMine(personId);
  }, [personId, loadMine]);

  function confirmName() {
    const name = nameInput.trim();
    if (name.length < 2) return;
    const id = genId();
    localStorage.setItem("ac_person_id", id);
    localStorage.setItem("ac_person_name", name);
    setPersonId(id);
    setPersonName(name);
  }

  // Autoguardado con debounce
  const save = useCallback(
    async (next: Answers) => {
      if (!personId) return;
      setSaveState("saving");
      try {
        await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            person_id: personId,
            person_name: personName,
            week_id: week.weekId,
            week_label: week.weekLabel,
            ...next,
          }),
        });
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    },
    [personId, personName, week.weekId, week.weekLabel]
  );

  function onChange(key: keyof Answers, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(next), 800);
  }

  // Evitar guardar en el primer render
  useEffect(() => {
    firstLoad.current = false;
  }, []);

  async function markSubmitted() {
    if (!personId) return;
    // Asegura guardar lo último antes de marcar
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await save(answers);
    await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_id: personId, week_id: week.weekId }),
    });
    setSubmitted(true);
    loadMine(personId);
  }

  // Nudge: viernes(5), sábado(6), domingo(0) y no cargó nada esta semana
  const day = new Date().getDay();
  const isWeekend = day === 5 || day === 6 || day === 0;
  const nothingYet = Object.values(answers).every((v) => v.trim() === "");
  const showNudge = isWeekend && nothingYet && !submitted;

  if (!ready) {
    return (
      <div className="wrap">
        <div className="card">Cargando…</div>
      </div>
    );
  }

  // Pantalla de nombre (primera vez)
  if (!personId) {
    return (
      <div className="wrap">
        <p className="eyebrow">Atajo Creativo</p>
        <h1>Observaciones de la semana</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Antes de empezar, ¿cómo te llamás? Se usa para agrupar tus entradas
          semana a semana.
        </p>
        <div className="card" style={{ marginTop: 16 }}>
          <label className="q-label" htmlFor="name">
            Tu nombre
          </label>
          <input
            id="name"
            type="text"
            placeholder="Ej. Emi"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmName()}
          />
          <div style={{ marginTop: 14 }}>
            <button
              className="btn btn-primary"
              onClick={confirmName}
              disabled={nameInput.trim().length < 2}
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <p className="eyebrow">Atajo Creativo · {week.weekLabel}</p>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Hola, {personName} 👋</h1>
        {submitted && <span className="badge badge-sent">Enviado</span>}
      </div>

      {showNudge && (
        <div className="nudge" style={{ marginTop: 16 }}>
          Es fin de semana y todavía no cargaste nada. Cinco puntos cortos
          alcanzan 🙌
        </div>
      )}

      <div className="welcome" style={{ marginTop: 16 }}>
        {WELCOME_TEXT}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {QUESTIONS.map((q) => (
          <div key={q.key} style={{ marginBottom: 20 }}>
            <label className="q-label" htmlFor={q.key}>
              {q.label}
            </label>
            <p className="q-hint">{q.hint}</p>
            <textarea
              id={q.key}
              value={answers[q.key]}
              onChange={(e) => onChange(q.key, e.target.value)}
              placeholder="Escribí acá…"
            />
          </div>
        ))}

        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="save-state">
            {saveState === "saving" && (
              <>
                <span className="dot dot-saving" /> Guardando…
              </>
            )}
            {saveState === "saved" && (
              <>
                <span className="dot dot-saved" /> Guardado
              </>
            )}
          </span>
          <button className="btn btn-primary" onClick={markSubmitted}>
            {submitted ? "Actualizar envío ✓" : "Marcar como enviado"}
          </button>
        </div>
        {submitted && (
          <p className="q-hint" style={{ marginTop: 10 }}>
            Ya lo enviaste ✓ — podés seguir editando y reenviar cuando quieras.
          </p>
        )}
      </div>

      {history.filter((e) => e.week_id !== week.weekId).length > 0 && (
        <>
          <hr className="divider" />
          <h2>Tus semanas anteriores</h2>
          <div className="card" style={{ marginTop: 12 }}>
            {history
              .filter((e) => e.week_id !== week.weekId)
              .map((e) => (
                <div
                  key={e.id}
                  className="hist-item"
                  onClick={() => setViewing(e)}
                >
                  <span>{e.week_label}</span>
                  <span
                    className={`badge ${
                      e.submitted ? "badge-sent" : "badge-draft"
                    }`}
                  >
                    {e.submitted ? "Enviado" : "Borrador"}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}

      {viewing && (
        <ReadOnlyModal entry={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function ReadOnlyModal({
  entry,
  onClose,
}: {
  entry: Entry;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(58,44,37,0.4)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 50,
        padding: 12,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, width: "100%", maxHeight: "85vh", overflowY: "auto" }}
      >
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{entry.week_label}</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {QUESTIONS.map((q) => (
          <div key={q.key} className="answer-block">
            <div className="answer-q">{q.label}</div>
            <div className={`answer-a ${entry[q.key] ? "" : "empty"}`}>
              {entry[q.key] || "(sin respuesta)"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
