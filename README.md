# Atajo Creativo · Observaciones de la semana (T5T)

App web interna del equipo. Cada semana, cada integrante carga 5 observaciones
del negocio. Emi y Cami leen todo junto en un panel y corren un análisis por
capas con IA para detectar señales débiles.

- **Cualquiera entra con el link**, sin cuenta de Claude ni organización.
- Stack: **Next.js (App Router) + Supabase (Postgres) + Anthropic API**, deploy en **Vercel**.
- Toda lectura/escritura pasa por API routes del servidor con la `service_role` de Supabase. La `service_role` y la key de Anthropic viven en variables de entorno, nunca en el frontend.

---

## 🚀 Puesta en marcha (paso a paso)

### 1. Crear la base de datos (Supabase) — gratis

1. Andá a **https://supabase.com** → *Start your project* → creá una cuenta (con tu email).
2. *New project*. Elegí un nombre, una contraseña de base de datos (guardala) y una región cercana (ej. São Paulo). Esperá ~2 min a que se cree.
3. En el menú izquierdo → **SQL Editor** → *New query*. Pegá **todo** el contenido de [`supabase/migration.sql`](supabase/migration.sql) y apretá **Run**. Eso crea la tabla `entries` con seguridad activada.
4. En **Settings → API** vas a copiar dos valores para el paso 3:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** (en *Project API keys*, la secreta, no la `anon`) → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Conseguir la key de IA (Anthropic)

1. Andá a **https://console.anthropic.com** → creá una cuenta y cargá un método de pago (el análisis cuesta centavos por corrida).
2. **API Keys** → *Create Key* → copiala. Ese es `ANTHROPIC_API_KEY`.

> ¿Costo cero total? Podés no configurar Anthropic y usar solo el botón **📋 Copiar para IA**, y pegar el texto en un chat de Claude. El botón "✨ Detectar señales" solo funciona con la key cargada.

### 3. Variables de entorno (local)

1. Copiá `.env.example` a `.env.local`.
2. Completá los 4 valores:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
ADMIN_PASSCODE=inventá-una-clave-secreta
```

`ADMIN_PASSCODE` es la clave que solo saben Emi y Cami para entrar al panel.

### 4. Correr en tu compu

```bash
npm install
npm run dev
```

Abrí **http://localhost:3000** (vista integrante) y **http://localhost:3000/panel** (panel admin).

### 5. Deploy a Vercel (link público) — gratis

1. Subí este proyecto a un repo de GitHub.
2. Andá a **https://vercel.com** → *Add New → Project* → importá el repo.
3. En **Environment Variables** cargá las mismas 4 (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ADMIN_PASSCODE`).
4. *Deploy*. Vercel te da un link tipo `https://atajo-creativo.vercel.app`. Ese es el que compartís por WhatsApp.

---

## 🧭 Cómo se usa

- **Integrantes** (`/`): la primera vez escriben su nombre (se guarda un id en el navegador). Cargan las 5 respuestas; se **autoguarda** solo. Al terminar, *Marcar como enviado*. Ven su propio historial. Cada uno ve solo lo suyo.
- **Panel** (`/panel`): con el passcode se ve todo el equipo. Participación, navegación por semanas, vista *por persona* o *por pregunta*, exportar CSV, copiar para IA, análisis por capas, y recordar por WhatsApp.

### Reingresar en otro dispositivo
El id se guarda en el navegador (`localStorage`). Si alguien cambia de teléfono, al escribir de nuevo su nombre empieza un id nuevo. Para recuperar el historial completo desde otro equipo se puede sumar a futuro un código corto de reingreso (no está en la v1).

---

## ⚙️ Notas técnicas

- **Modelo de IA:** por defecto `claude-opus-5`. Para bajar costo podés poner `ANTHROPIC_MODEL=claude-sonnet-5` en las variables de entorno.
- **Seguridad:** RLS está activado sin políticas públicas → el cliente anónimo no puede tocar la base directamente; todo pasa por las API routes.
- **Semana ISO:** se calcula sola (`lib/week.ts`), con label en español AR.

## 📁 Estructura

```
app/
  page.tsx            # vista integrante
  panel/page.tsx      # panel admin
  api/
    save/             # upsert de respuestas
    submit/           # marcar enviado
    mine/             # historial propio
    panel/            # entradas de la semana + roster (passcode)
    export/           # todas las entradas para el CSV (passcode)
    analyze/          # análisis por capas con Anthropic (passcode)
lib/
  supabase.ts         # cliente service_role (solo server)
  week.ts             # semana ISO + labels
  questions.ts        # las 5 preguntas + bienvenida
  admin.ts            # validación del passcode
supabase/
  migration.sql       # schema inicial
```
