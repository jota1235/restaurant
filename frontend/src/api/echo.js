import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import api from './axios';

window.Pusher = Pusher;

let echo = null;

if (import.meta.env.VITE_REVERB_APP_KEY) {
    echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        // authorizer logic for private channels
        authorizer: (channel, options) => {
            return {
                authorize: (socketId, callback) => {
                    api.post('/api/broadcasting/auth', {
                        socket_id: socketId,
                        channel_name: channel.name
                    })
                        .then(response => {
                            callback(false, response.data);
                        })
                        .catch(error => {
                            callback(true, error);
                        });
                }
            };
        },
    });
} else {
    console.warn('Echo could not be initialized: VITE_REVERB_APP_KEY is missing');
}

export default echo;
