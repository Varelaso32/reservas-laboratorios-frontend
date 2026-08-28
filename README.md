# ReservasLaboratoriosFrontend

Frontend (SPA) del sistema de **Reservas de Laboratorios**, construido con **Angular 19** y **TypeScript**, usando la arquitectura de componentes standalone (sin NgModules).

Este proyecto funciona como equipo: conecta con el backend en Python mediante servicios HTTP (JWT) y organiza las pantallas por historias de usuario (HU).

## 📌 Stack utilizado

| Tecnología | Versión |
|---|---|
| Angular | **19.1.x** (CLI 19.1.8) |
| TypeScript | 5.7.x |
| PrimeNG | 19.x |
| PrimeIcons | 7.x |
| RxJS | 7.8.x |
| Zone.js | 0.15.x |
| Gestor de paquetes | npm |

- Arquitectura: **standalone components** (bootstrap directo con `bootstrapApplication`, sin NgModules), compatible con los componentes standalone de PrimeNG.
- UI: **PrimeNG** (primeng) + **PrimeIcons** para los iconos.
- Estilos: **SCSS** (default del proyecto).
- Enrutamiento: `@angular/router` (lazy loading por feature).

## 📁 Estructura del proyecto

```
src/app/
├── core/              # Servicios globales, interceptores HTTP, guards de autenticación (JWT)
│   ├── guards/        # Guards de rutas (protegen con autenticación, ej. AuthGuard)
│   ├── interceptors/  # Interceptores HTTP (adjuntan token Bearer a las peticiones)
│   └── services/      # Servicios singleton para conectar con el Backend en Python
├── features/          # Módulos y pantallas principales según las historias de usuario (HU)
│   ├── auth/          # Login (HU-23)
│   ├── espacios/      # Catálogo, filtros y detalle de salas (HU-01, HU-02, HU-03)
│   ├── reservas/      # Formulario de solicitud e historial de reservas (HU-04, HU-06, HU-07)
│   └── admin/         # Panel de aprobación y gestión (HU-08, HU-10, HU-19)
├── shared/            # Componentes, modelos y utilidades reutilizables
│   └── models/        # Interfaces del dominio (Espacio, Reserva, Usuario, etc.)
├── app.routes.ts      # Definición de las rutas principales de la SPA
├── app.config.ts      # Configuración de la aplicación (providers, HTTP, interceptores)
└── app.component.ts   # Componente raíz de la aplicación
```

### Descripción de carpetas

- **`core/`** — Código transversal y único de la aplicación. Aquí vive la lógica de autenticación (JWT), los guards que protegen las rutas, los interceptores que inyectan el token en cada petición HTTP y los servicios que se comunican con el backend en Python. Solo deben existir providers de nivel raíz (`providedIn: 'root'`).
- **`features/`** — Cada feature agrupa las pantallas de un dominio de negocio y **debe tener su propio archivo de rutas** (`*.routes.ts`) para cargarse con lazy loading. Se organiza por historias de usuario:
  - `auth/` → login (HU-23)
  - `espacios/` → consulta de salas (HU-01, HU-02, HU-03)
  - `reservas/` → hacer y ver reservas (HU-04, HU-06, HU-07)
  - `admin/` → aprobación y gestión (HU-08, HU-10, HU-19)
- **`shared/`** — Componentes, modelos e interfaces que se reutilizan en varias features (botones, modales, tablas de resultados, navbar). Los modelos (`models/`) definen las interfaces del dominio que comparten frontend y backend.

## 🚀 Cómo levantar el proyecto

### Prerrequisitos

- [Node.js](https://nodejs.org/) **20 o superior** (LTS recomendado).
- Angular CLI **19** instalado de forma global (opcional, ya que se usa con `npx`).

```bash
node --version   # verifica Node.js
npm --version    # verifica npm
```

### Instalación de dependencias

```bash
npm install
```

### 🎨 PrimeNG

Este proyecto usa **PrimeNG 19** como librería de componentes de UI. Para instalarla:

```bash
npm install primeng primeicons
```

> En **PrimeNG 19** los temas y el CSS base ya no vienen dentro del paquete npm. Se cargan vía **CDN** en el `<head>` de `src/index.html` (la opción más simple para empezar):

```html
<link rel="stylesheet" href="https://unpkg.com/primeicons@8.0.0/primeicons.css" />
<link rel="stylesheet" href="https://unpkg.com/primeng@19/resources/styles/primeng.min.css" />
<link rel="stylesheet" href="https://unpkg.com/primeng@19/resources/themes/lara-light-blue/theme.css" />
```

Los componentes de PrimeNG se importan directamente en cada componente standalone:

```typescript
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  standalone: true,
  imports: [ButtonModule, InputTextModule],
  // ...
})
```

### Servidor de desarrollo

```bash
ng serve
```

Una vez iniciado, abre tu navegador en **http://localhost:4200/**. La aplicación se recarga automáticamente cada vez que modifiques un archivo fuente.

> Si no tienes Angular CLI global, usa `npx ng serve`.

### Compilación (build)

```bash
ng build
```

Compila el proyecto y guarda los artefactos en la carpeta `dist/`. Por defecto, el build de producción optimiza la aplicación para rendimiento.

### Pruebas unitarias

```bash
ng test
```

Ejecuta las pruebas unitarias con el runner [Karma](https://karma-runner.github.io).

### Generar código (scaffolding)

```bash
ng generate component features/espacios/mi-componente
```

Para ver todas las opciones de generación:

```bash
ng generate --help
```

> ⚠️ Al generar componentes usa siempre el prefijo de ruta correspondiente, por ejemplo `features/auth/login` para crear `src/app/features/auth/login.component.ts`.

## 🔌 Conexión con el Backend

Los servicios de `core/services/` se comunican con el backend en Python vía HTTP. La base URL y los endpoints se configuran mediante el interceptor definido en `core/interceptors/`, que adjunta el token JWT (obtenido tras el login) a cada petición en la cabecera `Authorization: Bearer <token>`.
