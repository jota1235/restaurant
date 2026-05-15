<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CookBellRung implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $cookIds;
    public $orderNumber;

    public function __construct(array $cookIds, string $orderNumber)
    {
        $this->cookIds = $cookIds;
        $this->orderNumber = $orderNumber;
    }

    public function broadcastOn(): array
    {
        $channels = [];
        foreach ($this->cookIds as $cookId) {
            $channels[] = new PrivateChannel('cook.' . $cookId);
        }
        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'cook.bell';
    }

    public function broadcastWith(): array
    {
        return [
            'order_number' => $this->orderNumber,
        ];
    }
}
