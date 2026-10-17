-- =========================================================
-- JERPRI · Base de datos completa (PostgreSQL)
-- ---------------------------------------------------------
-- CÓMO USARLO EN pgAdmin:
--   1) Databases → clic derecho en "jerpri" → Query Tool.
--   2) Pegá TODO este código y ejecutalo con el botón ▶ (o F5).
--   3) Tiene que terminar con "Query returned successfully".
--
-- ATENCIÓN: si las tablas ya existían, las BORRA con todo lo que
-- tengan y las crea de nuevo vacías. Ejecutalo una sola vez.
--
-- Crea todas las tablas y carga solo datos reales: las categorías,
-- las subcategorías y los ajustes de la tienda. No hay productos,
-- clientes ni pedidos inventados.
-- La cuenta de administración NO está acá (la contraseña tiene que
-- quedar cifrada): la crea el servidor al hacer "npm start" con
-- ADMIN_EMAIL y ADMIN_CLAVE de servidor/.env.
-- =========================================================

DROP TABLE IF EXISTS recuperaciones, pedido_historial, pedido_items, pedidos, sesiones, direcciones, usuarios,
  variantes, productos, subcategorias, categorias, ajustes CASCADE;
DROP SEQUENCE IF EXISTS pedidos_numero_seq;

-- ---------- Catálogo ----------
CREATE TABLE categorias (
  id          TEXT PRIMARY KEY,                       -- ej.: 'calzado'
  nombre      TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  icono       TEXT NOT NULL DEFAULT 'tag',
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  orden       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE subcategorias (
  id           TEXT PRIMARY KEY,                      -- ej.: 'zapatillas'
  categoria_id TEXT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  activa       BOOLEAN NOT NULL DEFAULT TRUE,
  orden        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE productos (
  id              TEXT PRIMARY KEY,                   -- ej.: 'zapatilla-urbana'
  nombre          TEXT NOT NULL,
  descripcion     TEXT NOT NULL DEFAULT '',
  categoria_id    TEXT NOT NULL REFERENCES categorias(id),
  subcategoria_id TEXT REFERENCES subcategorias(id) ON DELETE SET NULL,
  precio          INTEGER NOT NULL CHECK (precio > 0),
  tipo_venta      TEXT NOT NULL DEFAULT 'stock' CHECK (tipo_venta IN ('stock', 'pedido')),
  destacado       BOOLEAN NOT NULL DEFAULT FALSE,
  nuevo           BOOLEAN NOT NULL DEFAULT FALSE,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  imagenes        JSONB NOT NULL DEFAULT '[]',        -- lista de direcciones de imágenes
  colores         JSONB NOT NULL DEFAULT '[]',        -- [{ "name": "Negro", "hex": "#26211E" }]
  para            JSONB NOT NULL DEFAULT '[]',        -- para quién es ideal: ["mi", "pareja", "amistad", "familia", "peques"]
  genero          TEXT NOT NULL DEFAULT '' CHECK (genero IN ('', 'mujer', 'hombre')),   -- '' = para los dos
  es_demo         BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cada combinación de talle y color tiene su PROPIO stock.
CREATE TABLE variantes (
  id          TEXT PRIMARY KEY,
  producto_id TEXT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  talle       TEXT,
  color       TEXT,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),   -- el stock nunca puede quedar negativo
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  orden       INTEGER NOT NULL DEFAULT 0
);
-- No puede repetirse la misma combinación de talle y color en un producto
CREATE UNIQUE INDEX variantes_combinacion_unica ON variantes (producto_id, COALESCE(talle, ''), COALESCE(color, ''));

-- ---------- Usuarios ----------
CREATE TABLE usuarios (
  id         TEXT PRIMARY KEY,
  nombre     TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  telefono   TEXT NOT NULL DEFAULT '',
  rol        TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'empleado', 'cliente')),
  clave_hash TEXT NOT NULL,                           -- nunca se guarda la contraseña, solo su hash (scrypt)
  novedades_vistas_en TIMESTAMPTZ,                    -- cliente: hasta cuándo vio las novedades de sus pedidos
  es_demo    BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE direcciones (
  id            TEXT PRIMARY KEY,
  usuario_id    TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  provincia     TEXT NOT NULL,
  ciudad        TEXT NOT NULL,
  codigo_postal TEXT NOT NULL,
  calle         TEXT NOT NULL,
  numero        TEXT NOT NULL,
  piso_depto    TEXT NOT NULL DEFAULT '',
  principal     BOOLEAN NOT NULL DEFAULT FALSE,
  creada_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sesiones iniciadas (el navegador guarda el token en una cookie HttpOnly)
CREATE TABLE sesiones (
  token      TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_en  TIMESTAMPTZ NOT NULL
);

-- ---------- Recuperar contraseña con código por SMS ----------
CREATE TABLE IF NOT EXISTS recuperaciones (
  id          SERIAL PRIMARY KEY,
  usuario_id  TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_hash TEXT NOT NULL,                 -- el código de 6 números, cifrado (nunca en texto plano)
  intentos    INTEGER NOT NULL DEFAULT 0,    -- códigos equivocados escritos
  token_hash  TEXT,                          -- se crea al verificar el código: permite cambiar la contraseña
  usado       BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS recuperaciones_usuario_idx ON recuperaciones (usuario_id, creado_en DESC);

-- ---------- Pedidos ----------
CREATE SEQUENCE pedidos_numero_seq;                   -- genera JP-00001, JP-00002…

CREATE TABLE pedidos (
  id                    TEXT PRIMARY KEY,             -- ej.: 'JP-00007'
  usuario_id            TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_nombre        TEXT NOT NULL,
  cliente_telefono      TEXT NOT NULL DEFAULT '',
  cliente_email         TEXT NOT NULL DEFAULT '',
  total                 INTEGER NOT NULL CHECK (total >= 0),
  sena                  JSONB,                        -- { percent, amount, balance } o NULL
  pago_metodo           TEXT NOT NULL CHECK (pago_metodo IN ('efectivo', 'transferencia')),
  pago_estado           TEXT NOT NULL DEFAULT 'pendiente' CHECK (pago_estado IN ('pendiente', 'informado', 'verificado')),
  pago_verificado_en    TIMESTAMPTZ,
  estado                TEXT NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido', 'en_preparacion', 'listo', 'entregado', 'cancelado')),
  entrega_opcion_id     TEXT NOT NULL,
  entrega_opcion_nombre TEXT NOT NULL,
  entrega_direccion     JSONB,                        -- copia de la dirección al momento de comprar
  entrega_notas         TEXT NOT NULL DEFAULT '',
  entrega_estado        TEXT NOT NULL DEFAULT 'a_coordinar' CHECK (entrega_estado IN ('a_coordinar', 'coordinada', 'entregada')),
  notas                 TEXT NOT NULL DEFAULT '',
  stock_descontado      BOOLEAN NOT NULL DEFAULT TRUE,
  stock_devuelto        BOOLEAN NOT NULL DEFAULT FALSE, -- evita devolver el stock dos veces
  actualizado_tienda_en TIMESTAMPTZ,                    -- última vez que la tienda cambió el pedido (aviso para el cliente)
  novedad               TEXT NOT NULL DEFAULT '',        -- mensaje para el cliente: "¡Tu pedido fue confirmado!", etc.
  visto_personal        BOOLEAN NOT NULL DEFAULT FALSE,  -- algún admin o empleado ya entró a Pedidos (aviso rojo compartido)
  es_demo               BOOLEAN NOT NULL DEFAULT FALSE
);

-- Copia de cada producto comprado: si después cambia el precio, el pedido no cambia.
CREATE TABLE pedido_items (
  id              SERIAL PRIMARY KEY,
  pedido_id       TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id     TEXT NOT NULL,                      -- sin clave foránea: el producto puede eliminarse
  variante_id     TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  talle           TEXT,
  color           TEXT,
  precio_unitario INTEGER NOT NULL CHECK (precio_unitario >= 0),
  cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
  tipo_venta      TEXT NOT NULL,
  categoria_id    TEXT,
  imagen          TEXT
);

CREATE TABLE pedido_historial (
  id        SERIAL PRIMARY KEY,
  pedido_id TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  fecha     TIMESTAMPTZ NOT NULL DEFAULT now(),
  texto     TEXT NOT NULL
);

-- ---------- Configuración de la tienda ----------
-- Cada ajuste se guarda como JSON: instagram, whatsapp, transfer, deposit, deliveryOptions, banners…
CREATE TABLE ajustes (
  clave TEXT PRIMARY KEY,
  valor JSONB NOT NULL
);

-- Índices para las búsquedas más comunes
CREATE INDEX productos_categoria_idx ON productos (categoria_id);
CREATE INDEX variantes_producto_idx ON variantes (producto_id);
CREATE INDEX pedidos_usuario_idx ON pedidos (usuario_id);
CREATE INDEX pedido_items_pedido_idx ON pedido_items (pedido_id);
CREATE INDEX direcciones_usuario_idx ON direcciones (usuario_id);


-- =========================================================
-- DATOS INICIALES (reales, sin productos ni cuentas inventadas)
-- =========================================================

-- Categorías
INSERT INTO categorias (id, nombre, descripcion, icono, activa, orden) VALUES
  ('calzado', 'Calzado', 'Zapatillas, sandalias y ojotas.', 'shoe', TRUE, 0),
  ('accesorios', 'Accesorios', 'Hebillas, gomitas, vinchas, peines y scrunchies.', 'bow', TRUE, 1),
  ('bijouterie', 'Bijouterie', 'Aros, cadenitas, anillos, pulseras, dijes y tobilleras.', 'gem', TRUE, 2),
  ('regaleria', 'Regalería', 'Carteras, billeteras, mochilas, neceseres y más.', 'gift', TRUE, 3);

-- Subcategorías
INSERT INTO subcategorias (id, categoria_id, nombre, activa, orden) VALUES
  ('zapatillas', 'calzado', 'Zapatillas', TRUE, 0),
  ('ojotas', 'calzado', 'Ojotas', TRUE, 1),
  ('sandalias', 'calzado', 'Sandalias', TRUE, 2),
  ('aritos', 'bijouterie', 'Aritos', TRUE, 3),
  ('collares', 'bijouterie', 'Collares', TRUE, 4),
  ('pulseras', 'bijouterie', 'Pulseras', TRUE, 5),
  ('tobilleras', 'bijouterie', 'Tobilleras', TRUE, 6),
  ('anillos', 'bijouterie', 'Anillos', TRUE, 7),
  ('dijes', 'bijouterie', 'Dijes', TRUE, 8);

-- Ajustes de la tienda (se cambian después desde Panel → Ajustes)
INSERT INTO ajustes (clave, valor) VALUES
  ('instagram', '"jerpri.dtb"'::jsonb),
  ('lowStockThreshold', '3'::jsonb),
  ('transfer', '{"alias":"","cbu":"","holder":"","note":""}'::jsonb),
  ('whatsapp', '""'::jsonb),
  ('deposit', '{"enabled":false,"percent":30,"note":"La seña confirma el encargo del producto por pedido."}'::jsonb),
  ('deliveryOptions', '[{"id":"envio","name":"Envío a domicilio","description":"Lo enviamos a la dirección que indiques. El costo y el día se coordinan con vos.","requiresAddress":true,"active":true},{"id":"retiro","name":"Retiro","description":"Retirás tu pedido en el lugar y horario que acordemos.","requiresAddress":false,"active":true}]'::jsonb),
  ('banners', '[{"id":"b1","title":"Calzado, accesorios y regalería","text":"Todo en un solo lugar, con atención personalizada.","cta":"Ver productos","link":"#/catalogo","image":"","active":true},{"id":"b2","title":"Productos por pedido","text":"Si no tenemos tu talle o color, consultá y lo encargamos.","cta":"Ver productos por pedido","link":"#/catalogo?disp=pedido","image":"","active":true},{"id":"b3","title":"Bijouterie para regalar","text":"Aritos, collares, pulseras y tobilleras.","cta":"Ver bijouterie","link":"#/catalogo?cat=bijouterie","image":"","active":true}]'::jsonb);

-- Listo. Los productos se cargan desde Panel → Productos.
-- La cuenta de administración la crea el servidor al hacer "npm start",
-- con ADMIN_EMAIL y ADMIN_CLAVE de servidor/.env (la contraseña queda cifrada).
