<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CashRegisterController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\EmployeeCreditController;
use App\Http\Controllers\Api\ExtraController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\RestaurantController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\TableController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

// ========== Rutas Públicas ==========
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// RUTA DE EMERGENCIA PARA LIMPIAR CACHE Y PROBAR CONEXION
Route::get('/debug-ping', function () {
    if (function_exists('opcache_reset')) {
        opcache_reset();
    }
    return response()->json([
        'status' => 'OK',
        'message' => 'OPcache cleared and connected to the correct server!',
        'time' => now()->toDateTimeString(),
    ]);
});

// ========== Rutas Protegidas (Requieren Autenticación) ==========
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/select-branch', [AuthController::class, 'selectBranch']);
    });

    // Rutas Multi-Tenant (Requieren restaurant_id y suscripción activa)
    Route::middleware(['restaurant.scope', 'check.subscription'])->group(function () {

        // ===== RESTAURANTES =====
        // Superadmin: CRUD completo
        Route::middleware('role:superadmin')->group(function () {
            Route::apiResource('restaurants', RestaurantController::class)->except(['update']);
            Route::patch('restaurants/{restaurant}/toggle-active', [RestaurantController::class, 'toggleActive']);
            Route::patch('restaurants/{restaurant}/extend-subscription', [RestaurantController::class, 'extendSubscription']);
        });
        // Admin también puede ver/editar SU restaurante
        Route::middleware('role:superadmin,admin')->group(function () {
            Route::get('restaurants/{restaurant}', [RestaurantController::class, 'show']);
            Route::put('restaurants/{restaurant}', [RestaurantController::class, 'update']);
            Route::patch('restaurants/{restaurant}', [RestaurantController::class, 'update']);
        });

        // ===== ESTADÍSTICAS =====
        Route::middleware('role:superadmin,admin')->group(function () {
            Route::get('stats/dashboard', [StatsController::class, 'dashboard']);
            Route::get('stats/reports', [StatsController::class, 'reports']);
        });

        // ===== USUARIOS =====
        Route::middleware('role:superadmin,admin')->group(function () {
            Route::apiResource('users', UserController::class)->except(['index']);
            Route::patch('users/{user}/toggle-active', [UserController::class, 'toggleActive']);
        });

        // Lectura de usuarios permitida para caja (para seleccionar empleados en créditos)
        Route::middleware('role:superadmin,admin,caja')->group(function () {
            Route::get('users', [UserController::class, 'index']);
        });

        // ===== CATÉGORAS Y PRODUCTOS (admin, mesero puede ver) =====
        Route::middleware('role:superadmin,admin')->group(function () {
            Route::apiResource('categories', CategoryController::class)->except(['show']);
            Route::apiResource('products', ProductController::class)->except(['show']);
            Route::patch('products/{product}/toggle-availability', [ProductController::class, 'toggleAvailability']);
        });
        // Lectura pública al menú (mesero y cocina también lo necesitan)
        Route::middleware('role:superadmin,admin,mesero,cocina,caja')->group(function () {
            Route::get('categories', [CategoryController::class, 'index']);
            Route::get('products', [ProductController::class, 'index']);
            Route::get('products/{product}', [ProductController::class, 'show']);
            Route::get('extras', [ExtraController::class, 'index']);
        });

        // ===== EXTRAS (Admin) =====
        Route::middleware('role:superadmin,admin')->group(function () {
            Route::post('extras', [ExtraController::class, 'store']);
            Route::patch('extras/{extra}', [ExtraController::class, 'update']);
            Route::delete('extras/{extra}', [ExtraController::class, 'destroy']);
        });
        // ===== MESAS =====
        // Admin: CRUD completo
        Route::middleware('role:superadmin,admin')->group(function () {
            Route::post('tables', [TableController::class, 'store']);
            Route::put('tables/{table}', [TableController::class, 'update']);
            Route::patch('tables/{table}', [TableController::class, 'update']);
            Route::delete('tables/{table}', [TableController::class, 'destroy']);
        });
        // Mesero, caja y admin: ver mesas y cambiar estado
        Route::middleware('role:superadmin,admin,mesero,caja')->group(function () {
            Route::get('tables', [TableController::class, 'index']);
            Route::patch('tables/{table}/status', [TableController::class, 'changeStatus']);
        });

        // ===== ÓRDENES =====
        // Mesero: crear y ver sus órdenes
        // Cocina: ver órdenes y actualizar ítems
        // Caja: marcar como pagadas
        Route::middleware('role:superadmin,admin,mesero,cocina,caja')->group(function () {
            Route::get('orders', [OrderController::class, 'index']);
            Route::get('orders/{order}', [OrderController::class, 'show']);
        });
        Route::middleware('role:superadmin,admin,mesero,caja')->group(function () {
            Route::post('orders', [OrderController::class, 'store']);
            Route::delete('orders/{order}', [OrderController::class, 'destroy']);
            
            // Allow adding items to existing order and removing pending items
            Route::post('orders/{order}/items', [OrderController::class, 'addItems']);
            Route::delete('orders/{order}/items/{item}', [OrderController::class, 'removeItem']);
        });
        
        // Print pre-cuenta ticket
        Route::middleware('role:superadmin,admin,mesero,caja,cocina')->group(function () {
            Route::get('orders/{order}/ticket', [OrderController::class, 'printTicket']);
        });
        Route::middleware('role:superadmin,admin,mesero,cocina,caja')->group(function () {
            Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);
            Route::patch('orders/{order}/delivery-fee', [OrderController::class, 'updateDeliveryFee']);
            Route::patch('orders/{order}/items/{item}/status', [OrderController::class, 'updateItemStatus']);
            Route::post('orders/{order}/mark-cook-items-ready', [OrderController::class, 'markCookItemsReady']);
            Route::post('orders/{order}/ring-bell', [OrderController::class, 'ringBell']);
        });

        // ===== PAGOS (Caja, Admin) =====
        Route::middleware('role:superadmin,admin,caja')->group(function () {
            Route::post('payments', [PaymentController::class, 'store']);
            Route::get('payments', [PaymentController::class, 'index']);
            Route::get('payments/{payment}/ticket', [PaymentController::class, 'ticket']);
        });

        // ===== CONTROL DE CAJA (Caja, Admin) =====
        Route::middleware('role:superadmin,admin,caja')->prefix('cash-registers')->group(function () {
            Route::get('/status', [CashRegisterController::class, 'status']);
            Route::get('/summary', [CashRegisterController::class, 'summary']);
            Route::get('/history', [CashRegisterController::class, 'history']);
            Route::post('/open', [CashRegisterController::class, 'open']);
            Route::post('/close', [CashRegisterController::class, 'close']);
            Route::get('/movements', [CashRegisterController::class, 'movements']);
            Route::post('/movements', [CashRegisterController::class, 'storeMovement']);
        });

        // ===== CLIENTES (Mesero, Caja, Admin) =====
        Route::middleware('role:superadmin,admin,mesero,caja')->group(function () {
            Route::get('customers', [CustomerController::class, 'index']);
            Route::post('customers', [CustomerController::class, 'store']);
            Route::patch('customers/{customer}', [CustomerController::class, 'update']);
            Route::post('customers/{customer}/addresses', [CustomerController::class, 'addAddress']);
            Route::patch('customers/{customer}/addresses/{address}', [CustomerController::class, 'updateAddress']);
            Route::delete('customers/{customer}/addresses/{address}', [CustomerController::class, 'deleteAddress']);
        });
        // ===== INVENTARIO (Admin, Almacenista) =====
        Route::middleware('role:superadmin,admin,almacenista')->group(function () {
            Route::get('inventory', [InventoryController::class, 'index']);
            Route::post('inventory', [InventoryController::class, 'store']);
            Route::patch('inventory/{inventoryItem}', [InventoryController::class, 'update']);
            Route::delete('inventory/{inventoryItem}', [InventoryController::class, 'destroy']);
            Route::get('inventory/{inventoryItem}/movements', [InventoryController::class, 'movements']);
            Route::post('inventory/{inventoryItem}/movements', [InventoryController::class, 'addMovement']);
        });

        // ===== CRÉDITO DE EMPLEADOS =====
        // All authenticated roles can register and view their own credits
        Route::get('employee-credits', [EmployeeCreditController::class, 'index']);
        Route::post('employee-credits', [EmployeeCreditController::class, 'store']);
        // Only admin / caja can approve payments and cancel
        Route::middleware('role:superadmin,admin,caja')->group(function () {
            Route::post('employee-credits/{employeeCredit}/pay', [EmployeeCreditController::class, 'markAsPaid']);
            Route::post('employee-credits/{employeeCredit}/cancel', [EmployeeCreditController::class, 'cancel']);
        });
    });
});
