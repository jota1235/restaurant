<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Http\Resources\OrderResource;

class OrderCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('restaurant.' . $this->order->restaurant_id),
        ];

        // Also broadcast on each assigned cook's personal channel
        $cookIds = $this->order->items
            ->map(fn($item) => $item->product?->category?->assigned_cook_id)
            ->filter()
            ->unique()
            ->values();

        foreach ($cookIds as $cookId) {
            $channels[] = new PrivateChannel('cook.' . $cookId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'order.created';
    }

    public function broadcastWith(): array
    {
        return [
            'order' => new OrderResource($this->order->load(['items.product.category', 'items.variant', 'items.extras.extra', 'table', 'user'])),
        ];
    }
}
