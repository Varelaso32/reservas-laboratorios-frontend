# Reservas Laboratorios - Frontend

Aplicación web (SPA) para la gestión de reservas de laboratorios y salas, construida con **Angular 19**, **TypeScript** y **PrimeNG**. Usa componentes standalone (sin NgModules).

## Requisitos previos

- Node.js **20 o superior** (LTS recomendado)
- npm (incluido con Node.js)

## Instalación

```bash
npm install
```

## Ejecución (desarrollo)

```bash
ng serve
```

Abre la aplicación en **http://localhost:4200/**. Se recarga automáticamente al modificar los archivos fuente.

> Si no tienes Angular CLI instalado globalmente, usa `npx ng serve`.

## Compilación para producción

```bash
ng build
```

Los artefactos se generan en la carpeta `dist/`.

## Pruebas unitarias

```bash
ng test
```

## Conexión con el Backend

Los servicios de `src/app/core/services/` consumen la API REST del backend (`/api/v1` — FastAPI). El interceptor HTTP de `core/interceptors/` adjunta el token JWT (obtenido tras el login) en la cabecera `Authorization: Bearer <token>`.

## Estructura del proyecto

```
src/app/
├── core/              # Guards, interceptores y servicios HTTP globales
├── features/          # Pantallas organizadas por historia de usuario
│   ├── auth/          # Login
│   ├── espacios/      # Consulta de espacios
│   ├── reservas/      # Solicitudes y reservas
│   └── admin/         # Aprobación y gestión
└── shared/            # Componentes, modelos e interfaces reutilizables
```