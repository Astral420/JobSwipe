<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class WebSocketServe extends Command
{
    protected $signature = 'websocket:serve {--port=8080 : The port to listen on}';

    protected $description = 'Start the Laravel Reverb WebSocket server for match messaging';

    public function handle(): int
    {
        $port = $this->option('port');

        $this->info('🚀 Starting Reverb WebSocket server...');
        $this->info("This is a wrapper around 'reverb:start'. Use that command directly for production.");
        $this->newLine();

        return $this->call('reverb:start', [
            '--port' => $port,
        ]);
    }
}
