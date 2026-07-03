<?php

namespace Tests\Unit\Services;

use App\Exceptions\FileUploadException;
use App\Services\FileUploadService;
use Tests\TestCase as LaravelTestCase;

class FileUploadServicePropertyTest extends LaravelTestCase
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

    public function test_property_file_type_validation_for_images(): void
    {
        $service = new FileUploadService;
        $invalidExtensions = ['exe', 'php', 'js', 'zip', 'svg'];

        foreach ($invalidExtensions as $extension) {
            try {
                $service->generatePresignedUrl(
                    userId: 'user-123',
                    fileName: "sample.{$extension}",
                    fileType: 'image/png',
                    fileSize: 1024,
                    uploadType: 'image'
                );

                $this->fail("Expected INVALID_FILE_TYPE for extension {$extension}");
            } catch (FileUploadException $exception) {
                $this->assertStringContainsString('Invalid file type', $exception->getMessage());
            }
        }
    }

    public function test_property_file_size_validation_boundaries(): void
    {
        $service = new FileUploadService;

        $validImage = $service->generatePresignedUrl(
            userId: 'user-123',
            fileName: 'photo.webp',
            fileType: 'image/webp',
            fileSize: FileUploadService::MAX_IMAGE_BYTES,
            uploadType: 'image'
        );

        $this->assertSame(FileUploadService::PRESIGNED_EXPIRATION_SECONDS, $validImage['expires_in']);

        $this->expectException(FileUploadException::class);

        $service->generatePresignedUrl(
            userId: 'user-123',
            fileName: 'photo.webp',
            fileType: 'image/webp',
            fileSize: FileUploadService::MAX_IMAGE_BYTES + 1,
            uploadType: 'image'
        );
    }

    public function test_property_presigned_expiration_is_fixed_to_15_minutes(): void
    {
        $service = new FileUploadService;

        for ($i = 0; $i < 10; $i++) {
            $result = $service->generatePresignedUrl(
                userId: 'user-'.$i,
                fileName: 'resume.pdf',
                fileType: 'application/pdf',
                fileSize: 1024,
                uploadType: 'document'
            );

            $this->assertSame(900, $result['expires_in']);
        }
    }
}
