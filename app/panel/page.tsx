"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { QUESTIONS } from "@/lib/questions";
import { currentWeek, shiftWeek, isAfter } from "@/lib/week";
import type { Entry } from "@/lib/supabase";

type Roster = { person_id: string; person_name: string }[];

export default function Panel() {
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState("");
  const pcRef = useRef<HTMLInputElement>(null);

  // Modo oscuro con magenta: solo en el panel.
  useEffect(() => {
    document.body.classList.add("theme-dark");
    return () => document.body.classList.remove("theme-dark");
  }, []);

  const [week, setWeek] = useState(currentWeek());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [roster, setRoster] = useState<Roster>([]);
  const [view, setView] = useState<"persona" | "pregunta">("persona");
  const [loading, setLoading] = useState(false);

  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshed, setRefreshed] = useState(false);

  const current = currentWeek();
  const canGoForward = isAfter(current.weekId, week.weekId);

  const loadWeek = useCallback(
    async (weekId: string, code: string) => {
      setLoading(true);
      setAnalysis("");
      setAnalyzeError("");
      try {
        const res = await fetch("/api/panel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passcode: code, week_id: weekId }),
        });
        if (res.status === 401) {
          setAuthError("Passcode incorrecto.");
          setUnlocked(false);
          return false;
        }
        const data = await res.json();
        setEntries(data.entries ?? []);
        setRoster(data.roster ?? []);
        return true;
      } catch {
        setAuthError("Error al conectar.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  async function unlock() {
    setAuthError("");
    // Leemos el valor real del campo (por si el navegador autocompletó
    // o el onChange no registró), y limpiamos espacios.
    const code = (pcRef.current?.value ?? passcode).trim();
    if (!code) {
      setAuthError("Escribí el passcode.");
      return;
    }
    setPasscode(code);
    const ok = await loadWeek(week.weekId, code);
    if (ok) setUnlocked(true);
  }

  async function refresh() {
    await loadWeek(week.weekId, passcode);
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 1500);
  }

  function changeWeek(delta: number) {
    const next = shiftWeek(week.weekId, delta);
    if (delta > 0 && !isAfter(current.weekId, week.weekId)) return;
    setWeek(next);
    loadWeek(next.weekId, passcode);
  }

  // ---- Participación ----
  const submittedCount = entries.filter((e) => e.submitted).length;
  const loadedCount = entries.filter((e) =>
    [e.q1, e.q2, e.q3, e.q4, e.q5].some((v) => (v || "").trim())
  ).length;
  const total = Math.max(roster.length, entries.length);
  const pct = total > 0 ? Math.round((loadedCount / total) * 100) : 0;

  // ---- Texto crudo para IA / copiar ----
  function rawText(): string {
    const blocks = entries
      .filter((e) =>
        [e.q1, e.q2, e.q3, e.q4, e.q5].some((v) => (v || "").trim())
      )
      .map((e) => {
        const ans = QUESTIONS.map(
          (q, i) => `${i + 1}. ${q.label}\n   ${(e[q.key] || "").trim() || "(sin respuesta)"}`
        ).join("\n");
        return `### ${e.person_name}\n${ans}`;
      });
    return `Observaciones · ${week.weekLabel} (${week.weekId})\n\n${blocks.join("\n\n")}`;
  }

  async function copyForAI() {
    try {
      await navigator.clipboard.writeText(rawText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  // ---- Análisis IA ----
  async function analyze() {
    setAnalyzing(true);
    setAnalysis("");
    setAnalyzeError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, week_id: week.weekId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.error || "No se pudo analizar.");
      } else {
        setAnalysis(data.analysis || "");
      }
    } catch {
      setAnalyzeError("Error al conectar con el análisis.");
    } finally {
      setAnalyzing(false);
    }
  }

  // ---- Export CSV (cliente) ----
  async function exportCSV() {
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) return;
      const all: Entry[] = data.entries ?? [];
      const header = [
        "Semana",
        "weekId",
        "Persona",
        "Estado",
        ...QUESTIONS.map((q) => q.label),
      ];
      const esc = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
      const rows = all.map((e) =>
        [
          e.week_label,
          e.week_id,
          e.person_name,
          e.submitted ? "Enviado" : "Borrador",
          e.q1,
          e.q2,
          e.q3,
          e.q4,
          e.q5,
        ]
          .map(esc)
          .join(",")
      );
      const csv = "﻿" + [header.map(esc).join(","), ...rows].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atajo-creativo-observaciones.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }

  // ---- Recordar por WhatsApp ----
  function remindWhatsApp() {
    const link = typeof window !== "undefined" ? window.location.origin : "";
    const msg = `Hola equipo 👋 Recordá cargar tus 5 observaciones de la semana (${week.weekLabel}). Son 2 minutos: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // ---- Gate de passcode ----
  if (!unlocked) {
    return (
      <div className="wrap">
        <p className="eyebrow">Atajo Creativo · Panel</p>
        <h1>Panel de Emi & Cami</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Ingresá el passcode para ver todo el equipo.
        </p>
        <div className="card" style={{ marginTop: 16 }}>
          <label className="q-label" htmlFor="pc">
            Passcode
          </label>
          <input
            ref={pcRef}
            id="pc"
            name="ac-panel-pass"
            type="password"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            placeholder="••••••••"
          />
          {authError && (
            <p className="error" style={{ marginTop: 12 }}>
              {authError}
            </p>
          )}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={unlock}>
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const withContent = entries.filter((e) =>
    [e.q1, e.q2, e.q3, e.q4, e.q5].some((v) => (v || "").trim())
  );

  return (
    <div className="wrap wrap-wide">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <p className="eyebrow">Atajo Creativo · Panel</p>
          <h1>Observaciones del equipo</h1>
        </div>
        <div className="week-nav">
          <button onClick={() => changeWeek(-1)} aria-label="Semana anterior">
            ‹
          </button>
          <div style={{ textAlign: "center", minWidth: 180 }}>
            <div style={{ fontWeight: 600 }}>{week.weekLabel}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {week.weekId}
            </div>
          </div>
          <button
            onClick={() => changeWeek(1)}
            disabled={!canGoForward}
            aria-label="Semana siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {/* Participación */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Participación</h2>
          <span className="muted">{pct}%</span>
        </div>
        <div className="stat-grid">
          <div>
            <div className="stat-num">{loadedCount}</div>
            <div className="stat-lbl">cargaron</div>
          </div>
          <div>
            <div className="stat-num">{submittedCount}</div>
            <div className="stat-lbl">enviaron</div>
          </div>
          <div>
            <div className="stat-num">{total}</div>
            <div className="stat-lbl">total equipo</div>
          </div>
        </div>
        <div className="stat-bar">
          <div className="stat-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="toolbar">
          <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
            {loading ? "Actualizando…" : refreshed ? "✓ Actualizado" : "🔄 Actualizar"}
          </button>
          <button className="btn btn-ghost" onClick={exportCSV}>
            ⬇ Exportar CSV
          </button>
          <button className="btn btn-ghost" onClick={copyForAI}>
            {copied ? "✓ Copiado" : "📋 Copiar para IA"}
          </button>
          <button className="btn btn-primary" onClick={analyze} disabled={analyzing}>
            {analyzing ? (
              <>
                <span className="spinner" /> Analizando…
              </>
            ) : (
              <>✨ Detectar señales con IA</>
            )}
          </button>
          <button className="btn btn-ghost" onClick={remindWhatsApp}>
            🔔 Recordar al equipo
          </button>
        </div>

        {analyzeError && (
          <p className="error" style={{ marginTop: 14 }}>
            {analyzeError}
          </p>
        )}
        {analysis && (
          <div style={{ marginTop: 16 }}>
            <h2 style={{ marginBottom: 8 }}>Señales de la semana</h2>
            <div className="analysis">{analysis}</div>
          </div>
        )}
      </div>

      {/* Toggle de vista */}
      <div
        className="row"
        style={{ justifyContent: "space-between", marginTop: 20, marginBottom: 8 }}
      >
        <h2>Respuestas</h2>
        <div className="toggle">
          <button
            className={view === "persona" ? "active" : ""}
            onClick={() => setView("persona")}
          >
            Por persona
          </button>
          <button
            className={view === "pregunta" ? "active" : ""}
            onClick={() => setView("pregunta")}
          >
            Por pregunta
          </button>
        </div>
      </div>

      {loading && <div className="card">Cargando…</div>}

      {!loading && withContent.length === 0 && (
        <div className="card muted">Nadie cargó nada en esta semana todavía.</div>
      )}

      {/* Vista por persona */}
      {!loading &&
        view === "persona" &&
        withContent.map((e) => (
          <div className="card" key={e.id} style={{ marginTop: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2>{e.person_name}</h2>
              <span
                className={`badge ${e.submitted ? "badge-sent" : "badge-draft"}`}
              >
                {e.submitted ? "Enviado" : "Borrador"}
              </span>
            </div>
            {QUESTIONS.map((q) => (
              <div key={q.key} className="answer-block">
                <div className="answer-q">{q.label}</div>
                <div className={`answer-a ${e[q.key] ? "" : "empty"}`}>
                  {e[q.key] || "(sin respuesta)"}
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* Vista por pregunta */}
      {!loading &&
        view === "pregunta" &&
        withContent.length > 0 &&
        QUESTIONS.map((q) => (
          <div className="card" key={q.key} style={{ marginTop: 12 }}>
            <h2 style={{ fontSize: 18 }}>{q.label}</h2>
            {withContent
              .filter((e) => (e[q.key] || "").trim())
              .map((e) => (
                <div key={e.id} className="answer-block">
                  <span className="person-chip">{e.person_name}</span>
                  <div className="answer-a">{e[q.key]}</div>
                </div>
              ))}
            {withContent.filter((e) => (e[q.key] || "").trim()).length === 0 && (
              <div className="answer-a empty">Nadie respondió esta pregunta.</div>
            )}
          </div>
        ))}
    </div>
  );
}
