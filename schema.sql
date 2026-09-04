-- ============================================================================
-- Feedback Nova · Grupo Ternova
-- Esquema para Neon (PostgreSQL). Ejecutar una sola vez en el SQL Editor de Neon.
-- Clasificacion de la informacion: USO INTERNO (contiene nombre y correo corporativo).
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_nova (
  id                BIGSERIAL PRIMARY KEY,
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Identificacion del participante
  nombre            TEXT         NOT NULL,
  correo            TEXT         NOT NULL,
  area              TEXT,
  frecuencia_uso    TEXT,

  -- Escalas cuantitativas
  satisfaccion      SMALLINT     CHECK (satisfaccion   BETWEEN 1 AND 5),
  calidad           SMALLINT     CHECK (calidad        BETWEEN 1 AND 5),
  velocidad         SMALLINT     CHECK (velocidad      BETWEEN 1 AND 5),
  facilidad         SMALLINT     CHECK (facilidad      BETWEEN 1 AND 5),
  nps               SMALLINT     CHECK (nps            BETWEEN 0 AND 10),

  -- Uso real
  casos_uso         TEXT[]       NOT NULL DEFAULT '{}',
  tiempo_ahorrado   TEXT,
  confianza         TEXT,

  -- Respuestas abiertas
  lo_mejor          TEXT,
  problemas         TEXT,
  mejoras           TEXT,
  futuro            TEXT,
  comentario        TEXT,

  -- Cierre
  contactable       BOOLEAN      NOT NULL DEFAULT false,

  -- Metadatos tecnicos (la IP nunca se guarda en claro: solo su hash con sal)
  ip_hash           TEXT,
  user_agent        TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_nova_creado  ON feedback_nova (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_nova_correo  ON feedback_nova (lower(correo));
CREATE INDEX IF NOT EXISTS idx_feedback_nova_iphash  ON feedback_nova (ip_hash, creado_en DESC);

-- Bitacora minima de accesos al panel de respuestas (trazabilidad POL-TIC-001).
CREATE TABLE IF NOT EXISTS feedback_nova_accesos (
  id          BIGSERIAL PRIMARY KEY,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  evento      TEXT        NOT NULL,   -- 'login_ok' | 'login_fallido' | 'export_csv'
  ip_hash     TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_accesos_creado ON feedback_nova_accesos (creado_en DESC);
