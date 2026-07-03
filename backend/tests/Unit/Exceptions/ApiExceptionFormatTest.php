<?php

namespace Tests\Unit\Exceptions;

use App\Exceptions\FileUploadException;
use App\Exceptions\SubscriptionException;
use Tests\TestCase as LaravelTestCase;

class ApiExceptionFormatTest extends LaravelTestCase
{
    public function test_file_upload_exception_renders_consistent_json_response(): void
    {
        $exception = new FileUploadException('INVALID_FILE_TYPE', 'Invalid file type.', 400);
        $response = $exception->render();

        $payload = json_decode($response->getContent(), true);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertFalse($payload['success']);
        $this->assertSame('INVALID_FILE_TYPE', $payload['code']);
        $this->assertSame('Invalid file type.', $payload['message']);
    }

    public function test_subscription_exception_renders_consistent_json_response(): void
    {
        $exception = new SubscriptionException('SUBSCRIPTION_REQUIRED', 'Active subscription required.', 402);
        $response = $exception->render();

        $payload = json_decode($response->getContent(), true);

        $this->assertSame(402, $response->getStatusCode());
        $this->assertFalse($payload['success']);
        $this->assertSame('SUBSCRIPTION_REQUIRED', $payload['code']);
        $this->assertSame('Active subscription required.', $payload['message']);
    }

    public function test_property_exception_format_consistency(): void
    {
        $samples = [
            new FileUploadException('FILE_TOO_LARGE', 'Too large', 400),
            new FileUploadException('INVALID_FILE_URL', 'Bad URL', 400),
            new SubscriptionException('WEBHOOK_VERIFICATION_FAILED', 'Bad signature', 400),
            new SubscriptionException('SUBSCRIPTION_CHECKOUT_FAILED', 'Checkout failed', 500),
        ];

        foreach ($samples as $exception) {
            $response = $exception->render();
            $payload = json_decode($response->getContent(), true);

            $this->assertIsArray($payload);
            $this->assertArrayHasKey('success', $payload);
            $this->assertArrayHasKey('message', $payload);
            $this->assertArrayHasKey('code', $payload);
            $this->assertFalse($payload['success']);
            $this->assertMatchesRegularExpression('/^[A-Z0-9_]+$/', $payload['code']);
        }
    }
}
