# 📋 TaquerPOS — Guía del Proyecto

Sistema de Punto de Venta multi-sucursal para restaurantes.

---

## 🏗️ Stack

| Capa | Tecnología |
|------|-----------|
| Backend | **Laravel 12** + PHP 8.2 |
| Frontend | **React 19** + Vite 7 |
| Base de datos | **PostgreSQL** |
| Autenticación | Laravel Sanctum (tokens) |
| Permisos | Spatie Laravel-Permission |
| WebSockets | Laravel Reverb + Echo |
| CSS | TailwindCSS 4 |
| State | Zustand |

---

## 🚀 Arranque de Servidores

Abrir **3 terminales separadas** en la carpeta del proyecto:

### Terminal 1 — Backend (API Laravel)
```bash
cd c:\post\backend
php artisan serve --host=0.0.0.0 --port=8000
```

### Terminal 2 — WebSockets (Laravel Reverb)
```bash
cd c:\post\backend
php artisan reverb:start --host=0.0.0.0 --port=8080
```

### Terminal 3 — Frontend (React + Vite)
```bash
cd c:\post\frontend
npm run dev
```

### URLs de acceso
| Servicio | URL |
|----------|-----|
| Frontend | `http://192.168.1.88:5173` |
| API Backend | `http://192.168.1.88:8000` |
| WebSocket Reverb | `ws://192.168.1.88:8080` |

> ⚠️ **Cambio de IP:** Si cambia la IP de la máquina, actualizar en:
> - `backend/.env` → `APP_URL`, `SANCTUM_STATEFUL_DOMAINS`, `REVERB_HOST`
> - `frontend/.env` → `VITE_API_URL`, `VITE_REVERB_HOST`
> - `backend/config/cors.php` → `allowed_origins`

---

## 🔐 Roles del Sistema

| Rol | Acceso |
|-----|--------|
| `superadmin` | Todo el sistema, todos los restaurantes |
| `admin` | Su restaurante: menú, usuarios, mesas, estadísticas |
| `mesero` | Mapa de mesas, crear y gestionar órdenes |
| `cocina` | Kitchen Display (KDS) — ve y actualiza sus ítems |
| `caja` | Cobrar, control de caja, historial de pagos |

---

## 🗺️ Rutas del Frontend

| URL | Rol | Descripción |
|-----|-----|-------------|
| `/login` | Todos | Inicio de sesión |
| `/select-branch` | Todos | Selector de sucursal |
| `/admin` | admin, superadmin | Dashboard con estadísticas |
| `/admin/usuarios` | admin, superadmin | CRUD de usuarios |
| `/admin/restaurantes` | admin, superadmin | Gestión de sucursales |
| `/admin/menu` | admin, superadmin | Categorías y productos |
| `/admin/extras` | admin, superadmin | Extras/complementos |
| `/admin/mesas` | admin, superadmin | Configuración de mesas |
| `/mesero/mesas` | mesero | Mapa visual de mesas |
| `/mesero/orden` | mesero | Crear/editar órdenes |
| `/cocina` | cocina | Kitchen Display System |
| `/caja` | caja | Cobrar órdenes |
| `/caja/corte` | caja | Abrir/cerrar turno de caja |
| `/caja/historial` | caja | Historial de pagos |

---

## 🌐 API — Endpoints Principales

Base URL: `http://192.168.1.88:8000/api`

Todos los requests protegidos requieren:
```
Authorization: Bearer {token}
X-Restaurant-Id: {restaurant_id}
```

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Usuario autenticado |
| POST | `/auth/select-branch` | Cambiar sucursal activa |
| GET | `/categories` | Listar categorías |
| POST | `/categories` | Crear categoría |
| PATCH | `/categories/{id}` | Editar categoría |
| DELETE | `/categories/{id}` | Eliminar categoría |
| GET | `/products` | Listar productos |
| POST | `/orders` | Crear orden |
| GET | `/orders` | Listar órdenes |
| PATCH | `/orders/{id}/status` | Cambiar estado de orden |
| PATCH | `/orders/{id}/items/{itemId}/status` | Cambiar estado de ítem |
| POST | `/payments` | Registrar pago |
| GET | `/cash-registers/status` | Estado de caja |
| POST | `/cash-registers/open` | Abrir turno |
| POST | `/cash-registers/close` | Cerrar turno |

---

## 📦 Base de Datos

**Motor:** PostgreSQL  
**Base de datos:** `pv`  
**Host:** `localhost:5432`

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema |
| `restaurants` | Sucursales |
| `restaurant_user` | Pivot usuario ↔ sucursal (multi-branch) |
| `categories` | Categorías del menú |
| `products` | Productos/platillos |
| `product_variants` | Variantes de producto |
| `extras` | Extras/complementos |
| `tables` | Mesas del restaurante |
| `orders` | Órdenes |
| `order_items` | Ítems de cada orden |
| `order_item_extras` | Extras por ítem |
| `payments` | Pagos |
| `cash_registers` | Turnos de caja |
| `cash_movements` | Movimientos de efectivo |
| `plans` | Planes de suscripción |
| `subscriptions` | Suscripciones activas |
| `audit_logs` | Bitácora de auditoría |

### Comandos útiles de BD

```bash
cd c:\post\backend

# Ver estado de migraciones
php artisan migrate:status

# Correr migraciones pendientes
php artisan migrate

# Rollback de la última migración
php artisan migrate:rollback

# Reset completo + re-migrar
php artisan migrate:fresh --seed
```

---

## ⚡ WebSockets — Canales

| Canal | Tipo | Quién escucha | Eventos |
|-------|------|---------------|---------|
| `restaurant.{id}` | Privado | Admin, todos los roles del restaurante | `order.created`, `order.updated` |
| `cook.{userId}` | Privado | Solo ese cocinero | `order.created`, `order.updated` (solo sus ítems) |

---

## 👨‍🍳 Funcionalidad: Enrutamiento de Órdenes a Cocineros

Implementada en la sesión actual. Permite asignar un cocinero a cada categoría del menú.

### Cómo funciona

1. **El admin** va a `Menú → Categorías` y edita una categoría
2. En el modal aparece el campo **"Cocinero asignado"** (opcional)
3. Si se asigna un cocinero → los ítems de esa categoría **solo aparecen en su pantalla**
4. Si no se asigna → la categoría **no va a cocina** (ej. Refrescos, el mesero los entrega)

### Ejemplo de configuración

| Categoría | Cocinero asignado | ¿Va a cocina? |
|-----------|------------------|---------------|
| Tacos | Chef Juan | ✅ Solo en pantalla de Chef Juan |
| Hamburguesas | Chef María | ✅ Solo en pantalla de Chef María |
| Refrescos | Sin asignar | ❌ No va a cocina |
| Postres | Sin asignar | ❌ No va a cocina |

### Archivos relacionados

**Backend:**
- `database/migrations/2026_03_21_220000_add_assigned_cook_to_categories_table.php`
- `app/Models/Category.php` — relación `assignedCook()`
- `app/Http/Controllers/Api/CategoryController.php` — acepta `assigned_cook_id`
- `app/Http/Controllers/Api/OrderController.php` — filtra ítems por cocinero
- `app/Events/OrderCreated.php` + `OrderStatusUpdated.php` — emiten en canal `cook.{id}`
- `routes/channels.php` — autoriza canal `cook.{id}`

**Frontend:**
- `src/components/CategoryFormModal.jsx` — selector de cocinero
- `src/pages/cocina/CocinaPage.jsx` — escucha canal `cook.{user.id}`
- `src/api/users.js` — método `listCooks()`

---

## 🔧 Comandos de Mantenimiento

```bash
# Limpiar caché de configuración (requerido tras cambiar .env)
php artisan config:clear
php artisan cache:clear

# Ver logs del sistema
php artisan pail

# Crear nuevo usuario desde Tinker
php artisan tinker
>>> \App\Models\User::create(['name'=>'Admin','email'=>'admin@test.com','password'=>bcrypt('password'),'restaurant_id'=>1])->assignRole('admin');

# Ver rutas de la API
php artisan route:list --path=api

# Verificar estructura de tabla
php artisan tinker
>>> Schema::getColumnListing('categories')
```

---

## 🗂️ Estructura del Proyecto

```
c:\post/
├── backend/                  ← Laravel API
│   ├── app/
│   │   ├── Events/           OrderCreated.php, OrderStatusUpdated.php
│   │   ├── Http/
│   │   │   ├── Controllers/Api/   12 controladores
│   │   │   ├── Middleware/        RestaurantScope, CheckSubscription, RoleMiddleware
│   │   │   └── Resources/        JSON resources
│   │   ├── Models/           16 modelos Eloquent
│   │   └── Services/         AuditLogger
│   ├── config/
│   │   └── cors.php          ← Actualizar IPs aquí
│   ├── database/migrations/  22 migraciones
│   ├── routes/
│   │   ├── api.php           ← Todas las rutas de la API
│   │   └── channels.php      ← Autorización de canales WebSocket
│   └── .env                  ← IP, BD, Reverb, Sanctum
│
└── frontend/                 ← React SPA
    └── src/
        ├── api/              axios, auth, menu, orders, tables, users...
        ├── components/       Modales reutilizables
        ├── layouts/          AdminLayout, MeseroLayout, CajaLayout, CocinaLayout
        ├── pages/            admin/, mesero/, cocina/, caja/, auth/
        ├── router/           AppRouter.jsx
        └── store/            authStore.js (Zustand)
```

---

## 🛡️ Middleware Pipeline

Cada request protegido pasa por:

```
Request → auth:sanctum → restaurant.scope → check.subscription → role:xxx → Controller
```

1. **`auth:sanctum`** — Valida el Bearer token
2. **`RestaurantScope`** — Lee `X-Restaurant-Id` header, valida acceso, inyecta `restaurant_id`
3. **`CheckSubscription`** — Verifica que el restaurante tenga suscripción activa
4. **`RoleMiddleware`** — Verifica que el usuario tenga el rol requerido

---

*Última actualización: 2026-03-21*
