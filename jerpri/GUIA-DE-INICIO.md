# JERPRI · Guía de inicio

Esta guía explica, paso a paso, cómo dejar funcionando la tienda en una computadora con **Windows** y **Visual Studio Code**. Al final vas a poder abrirla con **Live Server** y todo lo que cargues quedará guardado en la base de datos.

## Cómo está armada

```
Navegador (la tienda)          ⇄   Servidor (carpeta servidor/)   ⇄   Base de datos PostgreSQL
Live Server: 127.0.0.1:5500         Node.js en el puerto 3000            base "jerpri"
```

- **La tienda** (index.html, css, js) es lo que ves en el navegador.
- **El servidor** recibe cada cambio (un producto nuevo, un pedido, un registro) y lo guarda en la base. Tiene que estar **encendido** mientras uses la tienda.
- **PostgreSQL** es la base de datos donde queda todo guardado, aunque apagues la computadora.

## Lo que hay que instalar (una sola vez)

| Programa | Para qué sirve |
|---|---|
| **Visual Studio Code** + extensión **Live Server** | Abrir y ver la tienda |
| **Node.js** (versión LTS, 20 o más nueva) | Hacer funcionar el servidor |
| **PostgreSQL** (incluye **pgAdmin 4**) | La base de datos |

---

## Paso 1 · Instalar PostgreSQL

1. Entrá a **https://www.postgresql.org/download/windows/** → **Download the installer** y descargá la versión más nueva para **Windows x86-64**.
2. En **Select Components** dejá marcados **PostgreSQL Server**, **pgAdmin 4** y **Command Line Tools**. *Stack Builder* no hace falta.
3. **Contraseña**: elegí una contraseña para el usuario `postgres` y **anotala**. La vas a necesitar en el archivo `.env`.
4. **Puerto**: dejá **5432**. **Locale**: dejá el que viene.
5. Terminá la instalación.

PostgreSQL queda como un servicio de Windows: se enciende solo cada vez que prendés la computadora.

## Paso 2 · Instalar Node.js

1. Entrá a **https://nodejs.org** y descargá la versión **LTS**.
2. Instalala con las opciones que vienen marcadas.
3. **Cerrá y volvé a abrir Visual Studio Code.**
4. Para comprobarlo, abrí la terminal de VS Code (**Terminal → New Terminal**) y escribí `node -v`. Tiene que aparecer un número, por ejemplo `v22.11.0`.

## Paso 3 · Crear la base de datos

1. Abrí **pgAdmin 4**. A la izquierda desplegá **Servers → PostgreSQL** (pide la contraseña del paso 1).
2. Clic derecho en **Databases → Create → Database…**, escribí `jerpri` y tocá **Save**.

Listo: no hace falta crear las tablas a mano. **La primera vez que se enciende el servidor (paso 5), si la base está vacía, crea sola todas las tablas** con las 4 categorías, sus subcategorías y los ajustes iniciales. La tienda arranca **sin productos, sin pedidos y sin clientes**: todo se carga desde el panel.

> Si preferís crear las tablas vos desde pgAdmin (o ya lo habías hecho), también funciona: clic derecho sobre **jerpri → Query Tool**, pegá todo el contenido de `servidor/db/base-de-datos-completa.sql` y ejecutalo con **▶**. Ojo: ese SQL **borra y vuelve a crear** las tablas.

---

## Paso 4 · El archivo `.env` (configuración del servidor)

El archivo `.env` le dice al servidor cómo entrar a la base de datos y cuál es la cuenta de administración. **Es privado**: tiene tu contraseña, así que no lo compartas ni lo subas a internet.

### 4.1 Crear el archivo

1. En VS Code, dentro de la carpeta `servidor`, hacé clic derecho sobre **`.env.ejemplo`** → **Copy**, y después clic derecho sobre la carpeta `servidor` → **Paste**.
2. Renombrá la copia (`F2`) como **`.env`**: con punto adelante y nada más.

> 💡 Hacelo desde VS Code y no desde el Explorador de Windows: Windows suele esconder las extensiones y el archivo puede quedar llamado `.env.txt` sin que te des cuenta.

### 4.2 Completar los datos

Abrí `servidor/.env` y completá cada línea. Así se escribe cada una: `NOMBRE=valor`, sin espacios alrededor del `=` y sin comillas.

| Línea | Qué poner | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor. Dejalo en 3000. | `PORT=3000` |
| `PGHOST` | Dónde está PostgreSQL. En tu computadora es `localhost`. | `PGHOST=localhost` |
| `PGPORT` | Puerto de PostgreSQL (el del paso 1). | `PGPORT=5432` |
| `PGUSER` | Usuario de PostgreSQL. | `PGUSER=postgres` |
| `PGPASSWORD` | **La contraseña que elegiste al instalar PostgreSQL.** | `PGPASSWORD=MiClave2024` |
| `PGDATABASE` | El nombre de la base del paso 3. | `PGDATABASE=jerpri` |
| `ADMIN_NOMBRE` | Tu nombre, para la cuenta de administración. | `ADMIN_NOMBRE=Priscila Lima` |
| `ADMIN_EMAIL` | El correo con el que vas a entrar al panel. | `ADMIN_EMAIL=tu_correo@gmail.com` |
| `ADMIN_CLAVE` | La contraseña para entrar al panel: mínimo 8 caracteres, con letras y números. | `ADMIN_CLAVE=Jerpri2024` |
| `ADMIN_TELEFONO` | (Opcional) Tu celular con código de área. Sirve para recuperar la contraseña. | `ADMIN_TELEFONO=387 4123456` |
| `TWILIO_ACCOUNT_SID` `TWILIO_AUTH_TOKEN` `TWILIO_FROM` | (Opcional) Para mandar SMS reales al recuperar la contraseña. Si los dejás vacíos, el código aparece en la terminal. | Vacíos |
| `DIAS_SESION` | Cuántos días queda abierta una sesión. | `DIAS_SESION=7` |
| `ORIGENES_PERMITIDOS` | (Opcional) Solo si abrís la tienda desde otra dirección. Para Live Server **no hace falta**. | Vacío |

Ejemplo completo:

```
PORT=3000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=MiClave2024
PGDATABASE=jerpri

ADMIN_NOMBRE=Priscila Lima
ADMIN_EMAIL=tu_correo@gmail.com
ADMIN_CLAVE=Jerpri2024
ADMIN_TELEFONO=387 4123456

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=

DIAS_SESION=7
ORIGENES_PERMITIDOS=
```

Guardá con `Ctrl + S`.

### 4.3 Qué pasa con la cuenta de administración

- La primera vez que encendés el servidor, si en la base no hay ninguna cuenta de administración, la crea con `ADMIN_EMAIL` y `ADMIN_CLAVE`. La contraseña se guarda **cifrada**.
- Si después cambiás `ADMIN_CLAVE` en el `.env`, **no** cambia la contraseña de la cuenta que ya existe. Para cambiarla usá "¿Olvidaste tu contraseña?" en la tienda.
- Si ese correo ya estaba registrado como cliente, lo convierte en administración y conserva su contraseña.

---

## Paso 5 · Encender el servidor

Elegí la forma que te resulte más cómoda. En las tres, **la primera vez** se descarga solo lo que necesita el servidor (hace falta internet un momento).

**Forma A · Automática al abrir la carpeta (recomendada)**
1. En VS Code: **File → Open Folder…** y elegí la carpeta `jerpri`.
2. VS Code pregunta si permitís que la carpeta ejecute tareas automáticas: elegí **Allow** (o **Permitir**).
3. Se abre una terminal llamada *JERPRI: encender servidor*. Desde ese momento, cada vez que abras la carpeta el servidor se enciende solo.

> Si no aparece la pregunta: **Terminal → Run Task… → JERPRI: encender servidor**. Para que se active siempre: `Ctrl + Shift + P` → *Tasks: Manage Automatic Tasks* → **Allow Automatic Tasks**.

**Forma B · Doble clic**
Hacé doble clic en **`INICIAR-SERVIDOR.bat`** (está en la carpeta `jerpri`). Se abre una ventana negra: dejala abierta mientras uses la tienda.

**Forma C · Escribiendo en la terminal**
```
cd servidor
npm start
```

Si todo está bien, vas a ver:

```
  JERPRI · Servidor iniciado
  ✔ PostgreSQL conectado (base "jerpri")
  ✔ La base estaba vacía: se crearon las tablas, las categorías y los ajustes iniciales
  ✔ Se creó la cuenta de administración tu_correo@gmail.com.
  ⓘ SMS en modo prueba: los códigos para recuperar la contraseña se muestran en esta terminal
```

Para apagarlo: hacé clic en la terminal y apretá `Ctrl + C` (o cerrá la ventana negra).

## Paso 6 · Abrir la tienda con Live Server

1. Si no tenés Live Server: en VS Code abrí Extensiones (`Ctrl + Shift + X`), buscá **Live Server** (de Ritwick Dey) e instalala. VS Code también la sugiere solo al abrir la carpeta.
2. Clic derecho sobre **`index.html`** → **Open with Live Server**.
3. Se abre el navegador en `http://127.0.0.1:5500`. **No hace falta escribir ninguna dirección**: la página encuentra sola al servidor.

> Si el servidor estaba apagado, la página muestra "Encendé el servidor de JERPRI" con los pasos. Apenas lo encendés, la tienda se abre sola.
>
> También podés abrir la tienda sin Live Server, escribiendo `http://localhost:3000` en el navegador.

## Paso 7 · Primeros pasos en el panel

1. Tocá el ícono de la cuenta → **Ingresar** con `ADMIN_EMAIL` y `ADMIN_CLAVE`.
2. En **Panel → Ajustes** completá:
   - **Pagos**: alias, CBU y titular para las transferencias;
   - **Contacto**: el número de WhatsApp y el Instagram;
   - las **publicidades** del inicio (con foto, si querés).
3. En **Panel → Productos → Nuevo producto** cargá los productos con sus fotos, talles, colores y stock.
4. Para sumar empleados: que se registren en la tienda y después, en **Panel → Usuarios**, cambiales el rol a *Empleado*.

Todo queda guardado en PostgreSQL. Para ver las tablas: pgAdmin → **jerpri → Schemas → public → Tables** → clic derecho en una tabla → **View/Edit Data → All Rows**.

---

## Recuperar contraseña por SMS (opcional)

- **Sin configurar nada (modo prueba)**: el SMS no se envía; el código de 6 números aparece en la terminal del servidor.
- **Con SMS reales**: creá una cuenta en **https://www.twilio.com**, copiá de su consola el *Account SID* y el *Auth Token*, comprá o activá un número y completá en el `.env`:

  ```
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
  TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
  TWILIO_FROM=+1xxxxxxxxxx
  ```
  Después reiniciá el servidor. Con una cuenta de prueba de Twilio solo se puede mandar SMS a números verificados en su consola.

## Copia de seguridad

En pgAdmin: clic derecho sobre la base **jerpri → Backup…**, elegí dónde guardar el archivo y tocá **Backup**. Para recuperarla: clic derecho → **Restore…** y elegí ese archivo.

## Problemas frecuentes

| Lo que aparece | Qué pasa | Cómo se arregla |
|---|---|---|
| La página dice "Encendé el servidor de JERPRI" | El servidor está apagado | Hacé el paso 5. La página se abre sola cuando arranca. |
| `'npm' no se reconoce como un comando` | Node.js no está instalado o VS Code no lo ve | Instalá Node (paso 2) y cerrá y abrí VS Code. |
| `Falta el archivo servidor/.env` | No existe el `.env` o quedó como `.env.txt` | Hacé el paso 4.1 desde VS Code. |
| `password authentication failed` (28P01) | La contraseña de PostgreSQL está mal | Revisá `PGPASSWORD` en el `.env`. |
| `database "jerpri" does not exist` (3D000) | Falta crear la base | Hacé el paso 3. |
| `PostgreSQL no responde` / `ECONNREFUSED` | PostgreSQL está apagado | En Windows: *Servicios* → `postgresql-x64-…` → **Iniciar**. |
| `Todavía no hay cuenta de administración` | Falta `ADMIN_EMAIL` o `ADMIN_CLAVE` en el `.env` | Completalos y reiniciá el servidor. |
| `El puerto 3000 ya está en uso` | Ya hay un servidor encendido (otra terminal o la ventana del .bat) | Usá ese, o cerralo con `Ctrl + C`. |
| No se puede ingresar con la cuenta de administración | El correo o la contraseña no son los del `.env`, o la cuenta ya existía con otra contraseña | Usá "¿Olvidaste tu contraseña?" con el teléfono de `ADMIN_TELEFONO`. |
| Abrí `index.html` con doble clic y no anda | Abierto como archivo, el navegador no deja usar la sesión | Abrilo con **Live Server** (paso 6). |
| Cambié `PORT` en el `.env` y la página no conecta | La página busca el servidor en el puerto 3000 | Poné el mismo número en `js/config.js`. |

## Empezar de cero

Para borrar **todo** (productos, pedidos, cuentas y ajustes) y dejar la tienda como nueva, volvé a ejecutar `servidor/db/base-de-datos-completa.sql` en pgAdmin, o en VS Code: **Terminal → Run Task… → JERPRI: crear la base de datos de cero**. Después reiniciá el servidor para que vuelva a crear la cuenta de administración.
