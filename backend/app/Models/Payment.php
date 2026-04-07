<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'restaurant_id',
        'order_id',
        'user_id',
        'cash_register_id',
        'amount',
        'tip',
        'payment_method',
        'reference',
        'status',
        'notes',
        'ticket_generated',
        'registered_in_cash',
        'ticket_folio',
        'ticket_data',
        'amount_received',
        'change_amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'tip' => 'decimal:2',
        'amount_received' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'ticket_generated' => 'boolean',
        'registered_in_cash' => 'boolean',
        'ticket_data' => 'array',
    ];

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    /**
     * Generate a sequential ticket folio for today within a restaurant.
     */
    public static function generateTicketFolio(int $restaurantId): string
    {
        $today = now()->format('Ymd');
        $count = self::where('restaurant_id', $restaurantId)
            ->where('ticket_folio', 'like', "T{$today}-%")
            ->count();

        return sprintf('T%s-%04d', $today, $count + 1);
    }

    /**
     * Build ticket data snapshot for storage/reprint.
     */
    public function buildTicketData(): array
    {
        $this->loadMissing(['order.items.product', 'order.items.variant', 'order.items.extras', 'order.table', 'user', 'restaurant']);

        $order = $this->order;
        $restaurant = $this->restaurant;

        return [
            'folio' => $this->ticket_folio,
            'restaurant' => [
                'name'    => $restaurant->name,
                'address' => $restaurant->address,
                'phone'   => $restaurant->phone,
                'city'    => $restaurant->city,
                'logo'    => $restaurant->logo, // base64 data URI
            ],
            'cashier' => $this->user->name,
            'date'    => now()->format('d/m/Y'),
            'time'    => now()->format('H:i:s'),
            'order_type'       => $order->type,
            'customer_name'    => $order->customer_name,
            'delivery_address' => $order->delivery_address,
            'order_number'     => $order->order_number,
            // Use getRelation() to bypass Eloquent's internal $table property conflict
            'table'            => $order->getRelation('table')?->name,
            'items' => $order->items->map(fn($item) => [
                'name' => $item->product->name,
                'variant' => $item->variant?->name,
                'extras' => $item->extras->pluck('name')->all(),
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'subtotal' => (float) $item->subtotal,
            ])->all(),
            'subtotal' => (float) $order->subtotal,
            'tax' => (float) $order->tax,
            'total' => (float) $order->total,
            'tip' => (float) $this->tip,
            'grand_total' => (float) $order->total + (float) $this->tip,
            'payment_method' => $this->payment_method,
            'amount_received' => (float) $this->amount_received,
            'change_amount' => (float) $this->change_amount,
            'reference' => $this->reference,
        ];
    }
}
