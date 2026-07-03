<?php

namespace Tests\Unit\Services;

use App\Exceptions\FileUploadException;
use App\Services\FileUploadService;
use Tests\TestCase as LaravelTestCase;

class FileUploadServiceUnitTest extends LaravelTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('filesystems.disks.r2', [
            'bucket' => 'jobswipe-test-bucket',
            'endpoint' => 'https://example-r2-endpoint.r2.cloudflarestorage.com',
            'url' => 'https://cdn.jobswipe.test',
            'key' => 'test-key',
            'secret' => 'test-secret',
        ]);
    }

    public function test_valid_image_upload_request_returns_presigned_payload(): void
    {
        $service = new FileUploadService;

        $result = $service->generatePresignedUrl(
            userId: 'user-123',
            fileName: 'avatar.png',
            fileType: 'image/png',
            fileSize: 120_000,
            uploadType: 'image'
        );

        $this->assertArrayHasKey('upload_url', $result);
        $this->assertArrayHasKey('file_key', $result);
        $this->assertArrayHasKey('public_url', $result);
        $this->assertArrayHasKey('expires_in', $result);

        $this->assertStringContainsString('image/user-123/', $result['file_key']);
        $this->assertStringEndsWith('.png', $result['file_key']);
        $this->assertSame(FileUploadService::PRESIGNED_EXPIRATION_SECONDS, $result['expires_in']);
    }

    public function test_invalid_file_type_throws_invalid_file_type_exception(): void
    {
        $service = new FileUploadService;

        $this->expectException(FileUploadException::class);
        $this->expectExceptionMessage('Invalid file type');

        $service->generatePresignedUrl(
            userId: 'user-123',
            fileName: 'script.exe',
            fileType: 'application/x-msdownload',
            fileSize: 10_000,
            uploadType: 'document'
        );
    }

    public function test_oversized_file_throws_file_too_large_exception(): void
    {
        $service = new FileUploadService;

        $this->expectException(FileUploadException::class);
        $this->expectExceptionMessage('File too large');

        $service->generatePresignedUrl(
            userId: 'user-123',
            fileName: 'resume.pdf',
            fileType: 'application/pdf',
            fileSize: FileUploadService::MAX_DOCUMENT_BYTES + 1,
            uploadType: 'document'
        );
    }

    public function test_validate_file_url_accepts_authorized_bucket_url(): void
    {
        $service = new FileUploadService;

        $this->assertTrue(
            $service->validateFileUrl('https://cdn.jobswipe.test/document/user-123/resume.pdf')
        );
    }

    public function test_validate_file_url_rejects_untrusted_url(): void
    {
        $service = new FileUploadService;

        $this->expectException(FileUploadException::class);
        $this->expectExceptionMessage('authorized R2 bucket');

        $service->validateFileUrl('https://evil.example.com/file.pdf');
    }

    public function test_generate_presigned_read_url_returns_expected_payload(): void
    {
        $service = new FileUploadService;

        $result = $service->generatePresignedReadUrl(
            'https://cdn.jobswipe.test/document/user-123/resume.pdf'
        );

        $this->assertArrayHasKey('read_url', $result);
        $this->assertArrayHasKey('file_key', $result);
        $this->assertArrayHasKey('expires_in', $result);

        $this->assertSame('document/user-123/resume.pdf', $result['file_key']);
        $this->assertSame(FileUploadService::PRESIGNED_EXPIRATION_SECONDS, $result['expires_in']);
        $this->assertStringContainsString('X-Amz-Signature', $result['read_url']);
    }

    public function test_generate_presigned_read_url_accepts_endpoint_style_url_with_bucket_prefix(): void
    {
        $service = new FileUploadService;

        $result = $service->generatePresignedReadUrl(
            'https://example-r2-endpoint.r2.cloudflarestorage.com/jobswipe-test-bucket/document/user-123/resume.pdf'
        );

        $this->assertSame('document/user-123/resume.pdf', $result['file_key']);
    }
}
