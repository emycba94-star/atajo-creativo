import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atajo Creativo · Observaciones de la semana",
  description:
    "Qué viste esta semana. 5 observaciones cortas y honestas del negocio (metodología T5T).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
