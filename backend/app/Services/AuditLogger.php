<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    /**
     * Log a system event
     *
     * @param string $event The event name (e.g., 'order.cancelled')
     * @param string $description Human readable description
     * @param array|null $metadata Additional contextual data
     * @param Model|null $auditable The target object (optional)
     * @return AuditLog
     */
    public static function log(string $event, string $description, ?array $metadata = null, $auditable = null)
    {
        try {
            $user = Auth::user();
            
            return AuditLog::create([
                'restaurant_id' => $user ? $user->restaurant_id : $metadata['restaurant_id'] ?? null,
                'user_id' => $user ? $user->id : null,
                'event' => $event,
                'description' => $description,
                'metadata' => $metadata,
                'auditable_type' => $auditable ? get_class($auditable) : null,
                'auditable_id' => $auditable ? $auditable->id : null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("AuditLogger failed: {$e->getMessage()}", [
                'event' => $event,
                'description' => $description,
            ]);
            return null;
        }
    }
}
