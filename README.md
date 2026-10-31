# EBA · Bienestar Animal

Sistema web para digitalizar la metodología de **Evaluación de Bienestar Animal (EBA)** del ICA en predios de ovinos y caprinos. Permite registrar predios, aplicar el catálogo de indicadores, calificar cada criterio, calcular el puntaje ponderado por libertades, cerrar evaluaciones y consultar resultados, historial y reportes.

El repositorio es un monorepo con dos aplicaciones:

- `backend`: API REST con Node.js, Express, TypeScript, MySQL/MariaDB y JWT.
- `frontend`: aplicación React + Vite + TypeScript + Tailwind CSS.

---

## 1. Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- MySQL 8 o MariaDB 10.5 o superior.
- Una base de datos vacía o permisos para crearla.

Verifique las versiones:

```bash
node --version
npm --version
mysql --version
```

> Si usa XAMPP, WAMP o un servidor MySQL/MariaDB local, inicie primero el servicio de base de datos. Ajuste `DB_PORT` si el servidor no escucha en `3306`.

---

## 2. Estructura del proyecto

```text
Ovinos/
├── backend/
│   ├── db/
│   │   ├── schema.sql          # Tablas, llaves, índices y restricciones
│   │   ├── seed.sql            # Libertades, 38 indicadores y administrador
│   │   └── seed_demo.sql       # Datos opcionales de demostración
│   ├── scripts/
│   │   ├── setup-db.ts         # Crea la base, ejecuta schema.sql y seed.sql
│   │   └── run-sql.ts          # Ejecuta un archivo SQL sobre la base configurada
│   ├── src/
│   │   ├── config/             # Variables de entorno
│   │   ├── controllers/        # Entrada HTTP
│   │   ├── db/                 # Pool y transacciones MySQL
│   │   ├── domain/             # Cálculos, filtrado y clasificación EBA
│   │   ├── middleware/         # Autenticación, roles y errores
│   │   ├── repositories/       # Consultas SQL parametrizadas
│   │   ├── routes/             # Definición de endpoints
│   │   ├── services/           # Reglas de negocio y control de acceso
│   │   ├── types/              # Tipos del dominio
│   │   └── validation/         # Esquemas Zod
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                # Cliente HTTP y tipos
│   │   ├── components/         # Layout, tablas, gráficas y UI reutilizable
│   │   ├── context/            # Sesión y autenticación
│   │   ├── lib/                # Formato, cálculos de vista previa y utilidades
│   │   └── pages/              # Login, panel, predios, evaluaciones, reportes, etc.
│   └── package.json
├── package.json                # Workspaces y scripts raíz
└── README.md
```

---

## 3. Instalación

Desde la raíz del proyecto:

```bash
npm install
```

Esto instala las dependencias de `backend`, `frontend` y las herramientas de desarrollo del monorepo.

---

## 4. Configuración del entorno

Copie el archivo de ejemplo y edítelo:

```bash
copy backend\.env.example backend\.env
```

En Linux/macOS:

```bash
cp backend/.env.example backend/.env
```

Variables disponibles:

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `DB_HOST` | Host de MySQL/MariaDB | `localhost` |
| `DB_PORT` | Puerto de MySQL/MariaDB | `3306` |
| `DB_USER` | Usuario de la base de datos | `root` |
| `DB_PASSWORD` | Contraseña de la base de datos | `mi_clave` |
| `DB_NAME` | Nombre de la base de datos | `eba_bienestar` |
| `JWT_SECRET` | Secreto para firmar tokens JWT. Use una cadena larga y aleatoria | `...` |
| `PORT` | Puerto de la API | `4000` |
| `CORS_ORIGIN` | Origen(es) permitidos, separados por coma | `http://localhost:5173` |
| `NODE_ENV` | Entorno de ejecución | `development` |

Ejemplo de `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=eba_bienestar
JWT_SECRET=cambie-este-secreto-por-una-cadena-larga-y-aleatoria
PORT=4000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

> `backend/.env` contiene credenciales y está excluido del control de versiones. No lo publique.

---

## 5. Base de datos

### 5.1 Crear la base y cargar el catálogo

Con MySQL/MariaDB iniciado y `backend/.env` configurado:

```bash
npm run db:setup
```

El script:

1. Crea la base `DB_NAME` si no existe, con `utf8mb4`.
2. Ejecuta `backend/db/schema.sql`.
3. Ejecuta `backend/db/seed.sql`.

Al finalizar se crea el usuario administrador:

```text
Correo:     admin@eba.gov.co
Contraseña: Admin123*
```

Cambie la contraseña después del primer ingreso desde la pantalla de usuarios o mediante una actualización administrada.

### 5.2 Datos de demostración opcionales

```bash
npm run db:seed:demo
```

Crea:

- Evaluadora: `evaluador.demo@eba.gov.co` / `Evaluador123*`
- Responsable: `responsable.demo@eba.gov.co` / `Responsable123*`
- Predio “Predio La Esperanza”, ovino de lana, sistema semi-intensivo, 120 animales.
- Una evaluación cerrada de demostración con resultado **92.13 / EXCELENTE BIENESTAR**.

El seed de demostración es idempotente: puede ejecutarse varias veces sin duplicar el predio ni la evaluación.

### 5.3 Reiniciar la base

`npm run db:setup` no elimina datos existentes. Si necesita empezar desde cero:

```sql
DROP DATABASE eba_bienestar;
```

Luego vuelva a ejecutar:

```bash
npm run db:setup
npm run db:seed:demo
```

### 5.4 Tablas principales

- `usuarios`: administradores, evaluadores y responsables.
- `predios`: ubicación, especie, sistema productivo, condición de lana y responsable asignado.
- `libertades`: las cinco libertades y sus pesos.
- `indicadores`: catálogo metodológico, criterios, método y reglas de aplicabilidad.
- `evaluaciones`: cabecera, estado, puntaje y clasificación congelados al cerrar.
- `evaluacion_indicadores`: snapshot de indicadores aplicables y calificación de cada uno.

---

## 6. Ejecución

Desde la raíz:

```bash
npm run dev
```

Se inician ambos servicios con `concurrently`:

- API: `http://localhost:4000/api`
- Frontend: `http://localhost:5173`

Vite redirige las solicitudes `/api` hacia `http://localhost:4000`.

Si la API no puede conectarse a la base de datos, el proceso termina con un mensaje de error. Verifique `backend/.env`, que MySQL/MariaDB esté iniciado y que `npm run db:setup` se haya ejecutado.

### Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia API y frontend en modo desarrollo |
| `npm run build` | Compila backend y frontend |
| `npm run test` | Ejecuta las pruebas unitarias del backend |
| `npm run db:setup` | Crea la base y carga esquema + seed obligatorio |
| `npm run db:seed:demo` | Carga usuarios, predio y evaluación de demostración |

Comandos por workspace:

```bash
npm run dev -w backend
npm run dev -w frontend
npm run build -w backend
npm run build -w frontend
npm run test -w backend
```

---

## 7. Roles y permisos

### Administrador

- Gestiona usuarios: crear, editar, activar/desactivar y asignar predios a responsables.
- Consulta todos los predios, evaluaciones e historial global.
- En **Historial global** filtra las evaluaciones cerradas por predio, rango de fechas y clasificación, y consulta una gráfica de evolución.
- Puede crear y editar predios y evaluaciones.
- Administra el catálogo de indicadores: descripción y criterios de puntuación.
- No puede desactivar ni quitar el rol al último administrador activo.
- No puede desactivar su propio usuario.
- No puede cambiar el rol de un responsable que todavía tiene predios asignados; primero debe reasignarlos.

### Evaluador

- Registra y edita predios.
- Al registrar o editar un predio puede seleccionar o cambiar el responsable entre los usuarios activos con rol `RESPONSABLE`. Esta asignación no está restringida al administrador.
- Crea evaluaciones para predios.
- Califica indicadores, guarda borradores y cierra evaluaciones.
- Solo puede editar/cerrar las evaluaciones que él mismo creó.
- Consulta el historial de los predios.

### Responsable de predio

- Acceso de solo lectura.
- Solo ve los predios donde está asignado como responsable.
- Solo ve evaluaciones **cerradas** de sus propios predios.
- No puede ver borradores, crear predios, crear evaluaciones ni modificar calificaciones.
- Puede descargar el reporte PDF y consultar el historial de sus predios.
- El backend aplica el filtro de responsable en cada consulta; no depende de filtros enviados por el cliente.

---

## 8. Metodología implementada

### 8.1 Libertades y pesos

| Libertad | Peso |
| --- | --- |
| L1. Libre de hambre, sed y desnutrición | 20 % |
| L2. Libre de molestias físicas y térmicas | 20 % |
| L3. Libre de dolor, lesión y enfermedad | 35 % |
| L4. Libre de temor y angustia | 10 % |
| L5. Libre de impedimentos de comportamiento natural | 15 % |

Los pesos se almacenan como fracciones (`0.20`, `0.35`, etc.).

### 8.2 Puntajes permitidos

Cada indicador se califica únicamente con:

```text
0 · 20 · 55 · 100
```

### 8.3 Filtrado de indicadores

Un indicador aplica según:

- Sistema productivo: `EXTENSIVO`, `SEMI_INTENSIVO`, `INTENSIVO` o `FAMILIAR`.
- Especie: `OVINO` o `CAPRINO`.
- Condición de ovino de lana.

Reglas especiales incluidas en el catálogo:

- Indicador 7: no aplica a sistemas familiares.
- Indicadores 15 y 16: no aplican a sistemas extensivos.
- Indicador 20: solo caprinos.
- Indicador 25: solo ovinos.
- Indicador 26: solo ovinos de lana.
- Indicadores 30, 31 y 34 a 36: no aplican a sistemas familiares.
- Indicadores 37 y 38: solo sistemas familiares.

Al crear una evaluación, el backend calcula los indicadores aplicables y guarda un snapshot en `evaluacion_indicadores`. El frontend replica el filtro únicamente para la vista previa; el backend es la fuente autoritativa.

### 8.4 Cálculo

1. **Puntaje de libertad**: promedio simple de los indicadores aplicables ya calificados. Está aislado en `backend/src/domain/scoring.ts` en la función `calcularPuntajeLibertad`, documentada para reemplazarse si la metodología cambia.
2. **Puntaje total**: suma de `puntaje de libertad × peso de la libertad`.
3. **Borradores**: se muestra un total proyectado, renormalizado por el peso de las libertades que ya tienen al menos un indicador calificado. Es solo una vista parcial.
4. **Cierre**: exige que todos los indicadores del snapshot estén calificados. Al cerrar se calcula el total oficial y se congelan puntaje, clasificación y fecha de cierre. Después no se pueden modificar las calificaciones.

### 8.5 Clasificación

| Puntaje | Clasificación |
| --- | --- |
| `>= 90` | EXCELENTE BIENESTAR |
| `>= 75` y `< 90` | ALTO |
| `>= 50` y `< 75` | MEDIO |
| `< 50` | BAJO |

---

## 9. Funcionalidades del frontend

- Inicio de sesión con JWT y cierre de sesión.
- Panel adaptado al rol con métricas, distribución por clasificación, últimas evaluaciones y predios.
- Listado, búsqueda y filtros de predios.
- Creación y edición de predios con validación.
- Detalle de predio con evaluaciones, historial y acceso a resultados.
- Creación de evaluación con selección de predio y fecha.
- Evaluación por pestañas/libertades, barra de progreso, criterios, observaciones y puntaje parcial en vivo.
- Autoguardado por indicador y reanudación de borradores.
- Confirmación antes de cerrar una evaluación.
- Resultados con gráfica por libertad, total, clasificación, mejores/peores indicadores y acceso al reporte.
- Reporte imprimible y descarga de PDF generado en el servidor.
- Historial por predio con gráfica de evolución.
- Historial global para el administrador con filtros por predio, rango de fechas y clasificación, tabla de resultados y gráfica de evolución.
- Administración de usuarios, activación/desactivación y asignación de predios.
- Catálogo de indicadores editable por el administrador (descripción y criterios).
- Estados de carga, mensajes de error y confirmaciones.
- Protección de rutas por rol en el frontend y en el backend.

---

## 10. API

Prefijo: `/api`

### Autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/auth/login` | Inicia sesión y devuelve JWT |
| `GET` | `/auth/me` | Devuelve el usuario autenticado |

### Panel y catálogo

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/dashboard` | Métricas y datos del panel según el rol |
| `GET` | `/libertades` | Lista las cinco libertades |
| `GET` | `/indicadores` | Lista el catálogo de indicadores |
| `PUT` | `/indicadores/:id` | Actualiza descripción/criterios (solo ADMIN) |

### Predios

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/predios` | Lista predios según el rol |
| `GET` | `/predios/:id` | Detalle de un predio |
| `GET` | `/predios/:id/historial` | Historial de evaluaciones cerradas |
| `POST` | `/predios` | Crea un predio (ADMIN/EVALUADOR) |
| `PUT` | `/predios/:id` | Edita un predio (ADMIN/EVALUADOR) |
| `DELETE` | `/predios/:id` | Elimina un predio (solo ADMIN) |

### Evaluaciones

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/evaluaciones` | Lista evaluaciones según el rol |
| `GET` | `/evaluaciones/historial-global` | Historial de evaluaciones cerradas con filtros `predioId`, `fechaDesde`, `fechaHasta` y `clasificacion` (solo ADMIN) |
| `GET` | `/evaluaciones/:id` | Detalle, indicadores y resumen |
| `POST` | `/evaluaciones` | Crea una evaluación (ADMIN/EVALUADOR) |
| `PATCH` | `/evaluaciones/:id` | Actualiza fecha/observaciones |
| `PATCH` | `/evaluaciones/:id/indicadores/:indicadorId` | Califica un indicador |
| `POST` | `/evaluaciones/:id/cerrar` | Valida y cierra la evaluación |
| `DELETE` | `/evaluaciones/:id` | Elimina un borrador |
| `GET` | `/evaluaciones/:id/reporte.pdf` | Descarga el reporte PDF |

### Usuarios

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/usuarios` | Lista usuarios (solo ADMIN) |
| `GET` | `/usuarios/responsables` | Lista responsables (ADMIN/EVALUADOR) |
| `POST` | `/usuarios` | Crea usuario (solo ADMIN) |
| `PUT` | `/usuarios/:id` | Edita usuario (solo ADMIN) |
| `PATCH` | `/usuarios/:id/estado` | Activa/desactiva usuario (solo ADMIN) |
| `PATCH` | `/usuarios/:id/predios` | Asigna predios a un responsable (solo ADMIN) |

Todas las rutas protegidas requieren el encabezado:

```http
Authorization: Bearer <token>
```

---

## 11. Pruebas

```bash
npm run test
```

Las pruebas unitarias cubren:

- Filtrado de indicadores por sistema productivo, especie y condición de lana.
- Promedio de libertad, suma ponderada, proyección de borradores y clasificación.
- Cierre de evaluaciones: bloqueo por indicadores faltantes, congelamiento de resultados y control de acceso por rol.
- Calificación por indicador y conservación de observaciones.
- Creación de evaluaciones y validación de indicadores aplicables.
- Historial global: control de acceso exclusivo para administrador y paso de filtros al repositorio.

También se verificó manualmente el flujo completo contra una instancia temporal de MariaDB: login de los tres roles, creación de predio y evaluación, calificación, bloqueo de cierre incompleto, cierre, resultados, PDF, historial y restricciones del responsable.

---

## 12. Compilación para producción

```bash
npm run build
```

Genera:

- `backend/dist`: JavaScript compilado de la API.
- `frontend/dist`: archivos estáticos del frontend.

Para iniciar la API compilada:

```bash
npm run start -w backend
```

El frontend compilado puede servirse con cualquier servidor estático. Si se publica en un dominio distinto al de la API, configure `VITE_API_URL` al compilar o publique ambos bajo el mismo origen y un proxy `/api`.

---

## 13. Seguridad y validación

- Contraseñas almacenadas con hash `bcrypt` (bcryptjs, costo 10); nunca en texto plano.
- Autenticación con JWT y expiración.
- Validación de entrada con Zod.
- Consultas SQL parametrizadas; no se concatenan valores del usuario.
- Middleware de roles en el backend.
- Filtros de alcance por responsable aplicados en las consultas, no solo en la interfaz.
- Errores centralizados con códigos HTTP adecuados (`400`, `401`, `403`, `404`, `409`, `500`).
- CORS configurable por `CORS_ORIGIN`.
- El reporte PDF se genera en el servidor y respeta las mismas reglas de acceso.

---

## 14. Notas y supuestos

- El promedio simple por libertad está aislado y documentado. Si el ICA define otra regla (por ejemplo, ponderar indicadores o usar el peor puntaje), solo debe modificarse `calcularPuntajeLibertad` en `backend/src/domain/scoring.ts`.
- Los textos de criterios `100`, `55`, `20` y `0` se cargan vacíos en el seed porque la metodología no los trae completos. El administrador puede editarlos desde **Catálogo**.
- El total de un borrador es una proyección para orientar al evaluador; el total oficial solo se congela al cerrar.
- El seed de demostración ajusta sus calificaciones para producir `92.13` y la clasificación `EXCELENTE BIENESTAR`.
- El evaluador puede asignar responsable al crear o editar un predio; la asignación masiva de predios a responsables sigue siendo exclusiva del administrador.
- La base de datos no se incluye en el repositorio. Debe existir un servidor MySQL/MariaDB accesible.
- El proyecto no incluye un servidor de correo ni recuperación de contraseña; la gestión de claves la realiza el administrador.
- El frontend usa Recharts para las gráficas y `pdfkit` en el backend para el PDF.

---

## 15. Solución de problemas

### La API no inicia: “No fue posible conectar con la base de datos”

1. Verifique que MySQL/MariaDB esté iniciado.
2. Revise `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` en `backend/.env`.
3. Confirme que la base exista y que el usuario tenga permisos.
4. Ejecute `npm run db:setup`.

### Error `ECONNREFUSED 127.0.0.1:3306`

El servidor de base de datos no está escuchando en ese puerto. En XAMPP puede iniciarlo desde el panel de control; si usa otro puerto, actualice `DB_PORT`.

### El frontend carga pero las solicitudes fallan

Confirme que la API esté en `http://localhost:4000` y que Vite esté usando el proxy. Si cambió el puerto de la API, actualice `vite.config.ts` o configure `VITE_API_URL`.

### “No se puede cerrar la evaluación: faltan N indicadores”

La evaluación tiene indicadores aplicables sin calificar. Complete todos los indicadores del snapshot antes de cerrar.

### El responsable no ve un predio o una evaluación

El acceso está restringido a los predios donde figura como responsable y a evaluaciones cerradas. Verifique la asignación desde el usuario administrador.

### Puerto 4000 o 5173 ocupado

Cierre el proceso que usa el puerto o cambie `PORT` en `backend/.env` y el proxy de Vite.
