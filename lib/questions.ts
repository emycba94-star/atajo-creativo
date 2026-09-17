// Las 5 preguntas T5T (texto exacto) + pistas.

export type Question = {
  key: "q1" | "q2" | "q3" | "q4" | "q5";
  label: string;
  hint: string;
};

export const QUESTIONS: Question[] = [
  {
    key: "q1",
    label: "¿Qué escuché o vi en un cliente esta semana?",
    hint: "Una queja, un pedido raro, una campaña que rindió distinto a lo esperado.",
  },
  {
    key: "q2",
    label: "¿Qué aprendí?",
    hint: "De una plataforma, un creativo, un proceso o de un cliente.",
  },
  {
    key: "q3",
    label: "¿Qué cuello de botella me frenó?",
    hint: "Algo interno o con un cliente que trabó el trabajo o el resultado.",
  },
  {
    key: "q4",
    label: "¿Qué oportunidad empiezo a ver?",
    hint: "Un servicio nuevo, un patrón entre varios clientes, algo que podríamos vender.",
  },
  {
    key: "q5",
    label: "¿Qué deberían saber Emi y Cami?",
    hint: "Algo que no aparece en los reportes ni en los números.",
  },
];

export const WELCOME_TEXT =
  "Esto no es un reporte de lo que hiciste. Es qué viste esta semana: algo raro que dijo un cliente, algo que aprendiste, algo que te trabó, una idea que asoma. 5 puntos cortos y honestos alcanzan. Cuanto más específico, más nos sirve.";
