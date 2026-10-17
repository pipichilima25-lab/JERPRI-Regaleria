# JERPRI · Tienda online

Tienda online de **JERPRI**: calzado, accesorios, bijouterie y regalería, con panel de administración.

Todo lo que se carga (productos, stock, cuentas, pedidos y ajustes) se guarda en una base de datos **PostgreSQL** a través de un servidor **Node.js** (carpeta `servidor/`). No hay datos simulados: la tienda arranca vacía y se completa desde el panel.

> 📘 **Para ponerla en marcha seguí [`GUIA-DE-INICIO.md`](GUIA-DE-INICIO.md)**: instalar PostgreSQL y Node, crear la base, completar el archivo `.env` y abrir la tienda con Live Server.

---

## 1. Uso diario (cuando ya está todo instalado)

1. Abrí la carpeta `jerpri` en Visual Studio Code. El servidor **se enciende solo** (tarea automática de VS Code). Si no, hacé doble clic en `INICIAR-SERVIDOR.bat` o escribí en la terminal `cd servidor` y `npm start`.
2. Clic derecho en `index.html` → **Open with Live Server**.

No hace falta escribir ninguna dirección: la página que abre Live Server (`http://127.0.0.1:5500`) se conecta sola con el servidor (`http://127.0.0.1:3000`). También se puede abrir directamente `http://localhost:3000`.

Si el servidor está apagado, la tienda muestra una pantalla que explica cómo encenderlo y se abre sola apenas arranca.

## 2. Cuentas y roles

La **cuenta de administración** se configura en `servidor/.env` (`ADMIN_EMAIL`, `ADMIN_CLAVE`, `ADMIN_NOMBRE` y `ADMIN_TELEFONO`). El servidor la crea la primera vez que se enciende, con la contraseña cifrada.

**Roles**

| Rol | Qué puede hacer |
|---|---|
| Administración | Todo el panel: resumen, productos, pedidos, categorías, usuarios, estadísticas y ajustes. Es el **único** rol que cambia roles y que puede borrar todos los productos. |
| Empleado | Productos, pedidos, categorías, usuarios y ajustes. En Usuarios ve **solo a los clientes**, sin filtro de roles y sin poder cambiarlos. No ve el resumen ni las estadísticas. |
| Cliente | Compra en la tienda. No entra al panel. |

- Toda cuenta que se registra en la tienda es **cliente**.
- La administración la convierte en **empleado** o **administración** desde **Panel → Usuarios**, con el selector de la columna *Rol*.
- Nadie puede cambiar su propio rol. Así la cuenta de administración no se queda sin acceso por error.
- Estos permisos los controla el servidor en cada operación (no alcanza con esconder botones).

## 3. Borrar todos los productos

En **Panel → Ajustes → Borrar todos los productos** (solo administración) se eliminan todos los productos del catálogo, con sus talles, colores y stock, para cargar los reales desde cero. Antes de borrar pide confirmación.

No se borran:
- los pedidos ya hechos (guardan su propia copia de cada producto);
- las cuentas;
- las categorías;
- los ajustes.

Para empezar la base de datos de cero (todo, incluidos pedidos y cuentas) se vuelve a ejecutar `base-de-datos-completa.sql` en pgAdmin o `npm run db:crear` en la carpeta `servidor`.

## 4. Estructura de carpetas

```
jerpri/
├── index.html                 Página única (la app se dibuja dentro de #app)
├── README.md                  Este archivo
├── GUIA-DE-INICIO.md          Instalación paso a paso y guía del archivo .env
├── INICIAR-SERVIDOR.bat       Doble clic para encender el servidor (Windows)
├── documentacion/             Documentación del proyecto (historias, MoSCoW, backlog, diagramas…)
├── .vscode/                   Live Server y tarea que enciende el servidor al abrir la carpeta
├── servidor/                  Servidor Node.js + PostgreSQL
│   ├── package.json           Scripts: npm start · npm run dev · npm run db:crear
│   ├── .env.ejemplo           Modelo de configuración (copiar como .env)
│   ├── db/base-de-datos-completa.sql   Todo el SQL: tablas, categorías, subcategorías y ajustes
│   ├── db/crear.js            npm run db:crear: ejecuta ese SQL y crea la cuenta de administración
│   └── src/
│       ├── servidor.js        Servidor web: API /api/..., archivos de la tienda y permisos para Live Server
│       ├── rutas.js           Cada operación de la API (pedidos, productos, cuenta…)
│       ├── datos.js           Lee la base y arma los datos para la tienda
│       ├── db.js              Conexión a PostgreSQL, transacciones y actualización del esquema
│       ├── seguridad.js       Contraseñas (scrypt) y sesiones con cookie HttpOnly
│       ├── validaciones.js    Validación de datos en el servidor
│       ├── semilla.js         Crea la cuenta de administración de servidor/.env
│       ├── sms.js             Envío del código por SMS (Twilio o modo prueba)
│       ├── instalar.js        Antes de npm start: instala lo que falta y revisa el .env
│       └── config.js          Lee servidor/.env
├── assets/img/                Logo, wordmark y favicon de JERPRI
├── css/
│   ├── styles.css             Tienda y componentes compartidos
│   └── admin.css              Panel de administración
└── js/
    ├── config.js              Puerto del servidor (3000)
    ├── core/
    │   ├── utils.js           Formato de moneda y fechas, escape de HTML, bus de eventos
    │   ├── api.js             Conexión con el servidor (Live Server o localhost:3000)
    │   └── storage.js         Lectura de los datos del servidor + carrito y favoritos del navegador
    ├── data/colores.js        Colores sugeridos para las variantes
    ├── services/              Lógica de negocio: catálogo, cuentas, carrito, pedidos, estadísticas
    ├── ui/                    Íconos SVG, componentes (avisos, modales, tarjetas) y estructura
    ├── views/                 Pantallas de la tienda, del panel y el asistente
    └── app.js                 Enrutador (#/ruta) y arranque
```

## 5. Cómo funciona

```
Navegador (tienda)           ⇄   Servidor Node.js (servidor/)     ⇄   PostgreSQL (base "jerpri")
Live Server :5500 o :3000         API http://…:3000/api/…               tablas: productos, pedidos, …
```

- El navegador **nunca** se conecta directo a PostgreSQL: habla con el servidor y el servidor usa la base. La contraseña de la base queda solo en `servidor/.env`.
- Al abrir la página se consulta `GET /api/salud` y se cargan los datos con `GET /api/datos`. Cada cambio se envía a la API (`POST`, `PUT`, `PATCH`, `DELETE`) y después se vuelven a pedir los datos.
- **Live Server**: la página se abre en otro puerto (5500). El servidor acepta pedidos de páginas abiertas en el **mismo equipo** (CORS con cookies) y rechaza los de cualquier otro sitio.
- **Catálogo**: cada producto pertenece a una categoría y, opcionalmente, a una subcategoría. Cada variante (talle + color) tiene **su propio stock**. Los productos *por pedido* no descuentan stock.
- **Carrito y favoritos**: hace falta iniciar sesión. Se guardan en el navegador, separados por cuenta; el servidor vuelve a revisar stock y precios al confirmar.
- **Pedidos**: número único (`JP-00001`, …) que sale de una secuencia de la base. Guardan una copia de productos, variantes y precios. Estado del pedido, del pago y de la entrega son independientes: confirmar un pedido **no** verifica el pago.
- **Stock**: se descuenta al confirmar y se devuelve **una sola vez** al cancelar, dentro de transacciones con bloqueo de filas. Nunca queda negativo.
- **Estadísticas**: se calculan con los pedidos guardados. Los cancelados nunca cuentan como venta.

## 6. Funciones

**Tienda**
- **Encabezado** en beige cálido: logo, buscador al lado del logo y, a la derecha, **Inicio** y **Categorías**, favoritos, carrito y cuenta.
- **Menú Categorías**: lista con Todos los productos, las categorías, Nuevos ingresos, Destacados y Por pedido.
  - Al tocar **Calzado** aparecen Zapatillas, Ojotas y Sandalias.
  - Al tocar **Bijouterie** aparecen Aritos, Collares, Pulseras, Tobilleras, Anillos y Dijes.
- **Inicio**:
  - **portada fija a todo el ancho**: "Todo lo que te gusta," en letra manuscrita, "EN UN SOLO LUGAR", texto y botón VER PRODUCTOS. A la derecha está el **logo de JERPRI** con su fondo satinado, que se funde suavemente con la portada. No se desliza;
  - **separador decorativo** (onda suave y adorno "JERPRI · Regalería") entre la portada y el marco publicitario;
  - **marco publicitario** debajo: se desliza solo cada 5 segundos, sin botones, y en el celular también con el dedo. Se edita en Panel → Ajustes, con foto si querés;
  - **Nuestros productos** (todos juntos), información de pago y entrega, y **"Visitá nuestro Instagram"**.
- **Botón fijo de WhatsApp** en la esquina inferior derecha de todas las páginas de la tienda. Abre WhatsApp con un mensaje ya escrito: "¡Hola, JERPRI! 👋✨ Estuve mirando la tienda y me encantaron sus productos 💕 Quería hacerles una consulta:".
- **🎀 JERPRI te ayuda a elegir**: un asistente con forma de chat.
  - Se abre con un **botón redondo del mismo tamaño que el de WhatsApp**, fijo arriba de él en todas las páginas de la tienda (no en el panel), o con el enlace del pie.
  - Al pasar el cursor por el botón aparece "¿Te ayudo a elegir? 🎀".
  - La primera vez aparece una sugerencia corta: "¿Te ayudo a elegir? 🎀".
  - El chat se abre en una ventanita, que en el celular ocupa el ancho de la pantalla. Se cierra con la X, con Esc o con el mismo botón.
  - La conversación sigue aunque se cambie de página.

  Hace tres preguntas:
  1. **¿Para quién buscás?**: para mí, mi pareja, un amigo o amiga, alguien de mi familia o un niño o niña;
  2. **¿Qué tipo de producto querés?**: las categorías que tienen algo para esa persona, o "Sorprendeme";
  3. **¿Cuál es tu presupuesto?**: rangos calculados con los precios de los productos que quedan, o "No importa".

  Al final muestra hasta 6 productos que coinciden, con foto, precio y enlace. Si no hay nada exacto, muestra lo más parecido y lo avisa.
  - Se puede responder tocando las opciones o **escribiendo como en un chat**, por ejemplo:
    - "para mi mamá", "mi novio";
    - "unos aros", "zapas", "algo para el pelo";
    - "hasta 15 mil", "entre 5 y 10 lucas", "más de 20k".
  - Tiene "Empezar de nuevo" y "Ver más en el catálogo" (con los filtros aplicados).
  - Cuando la persona **escribe** para quién es, también detecta si es para **hombre o mujer**:
    - "mi novio" → pareja, hombre;
    - "mi novia" → pareja, mujer;
    - "mi mamá" → familia, mujer;
    - "mi familia" o "mis amigos" → los dos.

    Las opciones para tocar no cambian.
  - Usa los campos **"¿Para quién es ideal?"** y **"¿Es para mujer o para hombre?"** de cada producto.
- **Tarjetas de producto**: foto, corazón de favoritos, categoría, nombre, precio y un único botón **"Ver detalle"**. Solo se muestra el cartel **"Sin stock"** cuando corresponde.
- **Páginas de categoría y subcategoría**: botones **Filtrar** (color, talle solo en Calzado, precio) y **Ordenar** (más relevante, precio mayor, precio menor).
- **Detalle de producto**:
  - selector de talle y color que no deja elegir variantes sin stock;
  - mensaje **"¡Últimas unidades!"** cuando quedan menos de 3;
  - favoritos y productos relacionados.
- **Compra (requiere sesión)**:
  1. **Tus datos**: nombre, teléfono, envío a domicilio (con dirección) o retiro.
  2. **Pago**: efectivo o transferencia (muestra alias, CBU y titular). El botón **"Confirmar pedido"** registra el pedido; ya no hay paso de revisión.
- **¡Recibimos tu pedido!**:
  - número de pedido, estados ("Pago a confirmar") y productos;
  - cuadro **"¿Ya hiciste tu transferencia?"** con dos botones: **"Ya transferí"** y **"Aún no he transferido"**, que muestra el monto a pagar, el alias, el CBU y el titular.
- **Mis pedidos**, **Mi cuenta** (datos y direcciones) y **Registro** con teléfono.
- **Avisos con número rojo para el cliente**: cuando la tienda cambia su pedido (lo confirma, lo cancela, verifica el pago, etc.), aparece un número rojo con la cantidad de pedidos con novedades:
  - en el ícono de la cuenta;
  - en "Mis pedidos" del menú;
  - en el menú del celular.

  En Mis pedidos, el pedido aparece destacado con el mensaje ("¡Tu pedido fue confirmado!", "Tu pedido fue cancelado.", etc.). Al entrar, el aviso se va. El detalle del pedido muestra la última novedad.
- **Ingresar**:
  - enlace **"¿Olvidaste tu contraseña?"** debajo de la contraseña;
  - **"¿No tenés cuenta? Registrarte"**, separado del botón.
- **Recuperar contraseña** (`#/recuperar`), en tres pasos:
  1. el cliente pone su **número de teléfono**;
  2. escribe el **código de 6 números** que le llega por **SMS** (vence a los 10 minutos, 5 intentos, se puede reenviar después de 60 segundos);
  3. elige la **contraseña nueva**.

  El teléfono no se puede repetir entre cuentas. Para enviar SMS reales se configura Twilio (ver la guía). Sin Twilio configurado, el código se muestra en la terminal del servidor (modo prueba).

**Panel de administración**
- **Resumen** con indicadores, últimos pedidos, stock bajo y más vendidos.
- **Productos**: crear, editar, activar o desactivar y eliminar; **categoría y subcategoría**; imágenes; variantes con stock independiente; **"¿Para quién es ideal?"** (para mí, pareja, amistad, familia, niños) y **"¿Es para mujer o para hombre?"** (mujer, hombre o para los dos), que usa el asistente. Si no se marca ninguna opción de "¿Para quién es ideal?", el producto se recomienda para cualquiera.
  - El editor no tiene las casillas Activo, Destacado y Nuevo: al guardar se conservan como estaban. Un producto se activa o desactiva desde la lista de productos.
  - Las variantes se agregan con "Agregar variante". Los talles escritos en "Talles" aparecen como sugerencia en cada variante.
- **Pedidos**: buscar por número, cliente o **teléfono**.
  - **Aviso de pedidos nuevos**: número rojo al lado de "Pedidos" en el panel, en el ícono de la cuenta y en "Panel de administración" del menú. Los pedidos nuevos aparecen marcados "Nuevo".
  - El aviso es **compartido**: cuando alguien del personal (administración o empleado) entra a Pedidos, se va para todos.
  - Cada 30 segundos se revisa si entraron pedidos nuevos, sin recargar la página.
  - **Detalle del pedido**:
    - arriba, el cuadro del pedido (número, fecha, cliente, total y estado) y la barra de seguimiento (Recibido → Confirmado → Listo → Entregado);
    - debajo, un cuadro debajo del otro: Productos, Cliente, Estado del pedido, Pago (con "Verificar pago"), Entrega, Cancelar pedido e Historial.

    Cancelar devuelve el stock una sola vez.
- **Categorías**: botón **"Nueva categoría"** y, al lado, **"Agregar subcategoría"**. Cada categoría muestra sus subcategorías, que se pueden editar, ocultar o eliminar (los productos no se borran).
- **Usuarios**:
  - buscador por nombre, correo o teléfono;
  - filtro por rol (administración, empleado o cliente) y selector de rol en cada fila, solo para administración;
  - los empleados ven solo a los clientes;
  - nunca se muestran contraseñas.
- **Estadísticas**:
  - cuatro indicadores: ventas registradas, ingresos confirmados, pagos a confirmar y ticket promedio;
  - ventas por mes;
  - reparto de pedidos y pagos con barras y porcentajes;
  - ranking de más vendidos y stock bajo.
- **Ajustes**:
  - **marco publicitario con foto**: título, texto, botón, enlace, orden y visibilidad, y subir, cambiar o quitar la foto;
  - **datos para transferencias**: alias, CBU, titular, banco y aclaración;
  - seña para productos por pedido, que **solo se pide cuando el pedido es para retirar** (con envío a domicilio no hay seña);
  - **WhatsApp** e Instagram;
  - modalidades de entrega (y si piden dirección);
  - stock: umbral de stock bajo;
  - **borrar todos los productos** (solo administración).

**Experiencia y accesibilidad**
- **Se adapta a todas las pantallas**:
  - celulares chicos (desde 320 px) y celulares acostados (dos columnas, encabezado y botones más chicos);
  - tablets parados y acostados;
  - computadoras y monitores grandes (más columnas de productos);
  - televisores y pantallas 2K/4K (toda la página se agranda en proporción);
  - pantallas táctiles: botones de al menos 44 px para tocar fácil.
- Menú móvil.
- Notificaciones integradas en la página (no se usa `alert()`).
- Modales accesibles: retienen el foco y se cierran con `Esc`.
- Navegación por teclado, foco visible, etiquetas asociadas, textos alternativos y respeto por "reducir movimiento".
- Estados vacíos y estados de carga.

## 7. Limitaciones

- Funciona en la computadora local (o en la red de la casa), sin HTTPS. Para publicarla en internet hace falta un hosting con HTTPS.
- Los SMS reales necesitan una cuenta de Twilio (servicio pago). Sin ella, el código se muestra en la terminal del servidor.
- Las fotos subidas se guardan dentro de la base de datos: conviene usar imágenes livianas.
- No hay pagos en línea ni correos automáticos.
- **Datos para completar**: alias, CBU, titular y WhatsApp empiezan vacíos. Cargalos en **Panel → Ajustes**.

## 8. API del servidor

**Endpoints principales**:
- `GET /api/salud` (estado de la conexión) y `GET /api/datos` (todo lo que la persona puede ver).
- `POST /api/auth/registro`, `/ingresar`, `/salir`, `/recuperar/codigo`, `/recuperar/verificar`, `/recuperar/cambiar`.
- `PUT /api/cuenta` y `/api/cuenta/direcciones`.
- `POST /api/pedidos`, `POST /api/pedidos/:id/informar-pago`, `PATCH /api/pedidos/:id/estado|pago|entrega`, `POST /api/pedidos/:id/cancelar`.
- Solo administración:
  - `/api/categorias`, `/api/subcategorias`, `/api/productos` (crear, editar, activar, borrar);
  - `PUT /api/ajustes` (administración y empleados);
  - `PATCH /api/usuarios/:id/rol` y `DELETE /api/productos` (borrar todos): **solo administración**.

**Qué controla el servidor** (no confía en el navegador):
- precios, total y seña de cada pedido;
- stock descontado dentro de una transacción con bloqueo de filas;
- devolución de stock una sola vez;
- rol en cada operación del panel (administración, empleado o cliente);
- validación de todos los datos;
- contraseñas con scrypt;
- sesión con cookie `HttpOnly`.

**Qué controla el servidor** (no confía en el navegador):
- precios, total y seña de cada pedido;
- stock descontado dentro de una transacción con bloqueo de filas;
- devolución de stock una sola vez;
- rol en cada operación del panel (administración, empleado o cliente);
- validación de todos los datos;
- contraseñas con scrypt y sesión con cookie `HttpOnly`;
- origen de cada pedido: solo páginas de este mismo equipo (o las de `ORIGENES_PERMITIDOS`).

## 9. Pruebas realizadas

Con un navegador automático, abriendo la tienda como lo hace Live Server (`http://127.0.0.1:5500`) contra PostgreSQL 16, se recorrió todo el circuito: 22 de 22 pasos correctos y sin errores en la consola.
- La página se conecta sola al servidor y la tienda arranca sin productos simulados, con las 4 categorías.
- Ingreso de la administración y sesión que sigue al recargar la página.
- Alta de un producto con dos variantes y guardado de ajustes.
- Registro de un cliente, carrito y pedido `JP-00001` con descuento de stock.
- "Ya transferí", aviso de pedido nuevo para el personal, verificación del pago, confirmación y cancelación con devolución del stock.
- Aviso rojo para el cliente y producto visible en el inicio.
- La misma tienda abierta en `http://localhost:3000`.
- Pantalla "Encendé el servidor" con el servidor apagado y apertura automática cuando arranca.
- Un pedido desde otro sitio (otro origen) es rechazado.
