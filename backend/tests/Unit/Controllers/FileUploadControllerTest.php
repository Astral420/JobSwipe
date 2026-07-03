<?php

namespace Tests\Unit\Controllers;

use App\Http\Controllers\File\FileUploadController;
use App\Http\Requests\File\ConfirmUploadRequest;
use App\Http\Requests\File\GenerateReadUrlRequest;
use App\Http\Requests\File\GenerateUploadUrlRequest;
use App\Services\FileUploadService;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class FileUploadControllerTest extends TestCase
{
    public function test_generate_upload_url_returns_expected_payload(): void
    {
        /** @var FileUploadService&MockObject $service */
        $service = $this->createMock(FileUploadService::class);

        $service->expects($this->once())
            ->method('generatePresignedUrl')
            ->willReturn([
                'upload_url' => 'https://uploads.example.test/presigned',
                'file_key' => 'document/user-1/resume.pdf',
                'public_url' => 'https://cdn.example.test/document/user-1/resume.pdf',
                'expires_in' => 900,
            ]);

        $controller = new FileUploadController($service);

        /** @var GenerateUploadUrlRequest&MockObject $request */
        $request = $this->createMock(GenerateUploadUrlRequest::class);
        $request->expects($this->once())
            ->method('validated')
            ->willReturn([
                'file_name' => 'resume.pdf',
                'file_type' => 'application/pdf',
                'file_size' => 1024,
                'upload_type' => 'document',
            ]);
        $request->expects($this->once())
            ->method('user')
            ->willReturn((object) ['id' => 'user-1']);

        $response = $controller->generateUploadUrl($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame('Upload URL generated.', $payload['message']);
        $this->assertSame('document/user-1/resume.pdf', $payload['data']['file_key']);
    }

    public function test_confirm_upload_returns_success(): void
    {
        /** @var FileUploadService&MockObject $service */
        $service = $this->createMock(FileUploadService::class);

        $service->expects($this->once())
            ->method('validateFileUrl')
            ->with('https://cdn.example.test/document/user-1/resume.pdf')
            ->willReturn(true);

        $controller = new FileUploadController($service);

        $request = $this->createMock(ConfirmUploadRequest::class);
        $request->expects($this->once())->method('validated')->willReturn([
            'file_url' => 'https://cdn.example.test/document/user-1/resume.pdf',
        ]);

        $response = $controller->confirmUpload($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertTrue($payload['data']['confirmed']);
    }

    public function test_generate_read_url_returns_expected_payload(): void
    {
        /** @var FileUploadService&MockObject $service */
        $service = $this->createMock(FileUploadService::class);

        $service->expects($this->once())
            ->method('generatePresignedReadUrl')
            ->with('https://cdn.example.test/document/user-1/resume.pdf')
            ->willReturn([
                'read_url' => 'https://jobswipe-test-bucket.example-r2-endpoint.r2.cloudflarestorage.com/document/user-1/resume.pdf?X-Amz-Signature=abc',
                'file_key' => 'document/user-1/resume.pdf',
                'expires_in' => 900,
            ]);

        $controller = new FileUploadController($service);

        /** @var GenerateReadUrlRequest&MockObject $request */
        $request = $this->createMock(GenerateReadUrlRequest::class);
        $request->expects($this->once())
            ->method('validated')
            ->willReturn([
                'file_url' => 'https://cdn.example.test/document/user-1/resume.pdf',
            ]);

        $response = $controller->generateReadUrl($request);
        $payload = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame('Read URL generated.', $payload['message']);
        $this->assertSame('document/user-1/resume.pdf', $payload['data']['file_key']);
    }
}
