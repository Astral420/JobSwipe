<?php

namespace Tests\Unit\Controllers;

use App\Exceptions\FileUploadException;
use App\Http\Controllers\File\FileUploadController;
use App\Http\Requests\File\ConfirmUploadRequest;
use App\Http\Requests\File\GenerateReadUrlRequest;
use App\Http\Requests\File\GenerateUploadUrlRequest;
use App\Services\FileUploadService;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class FileUploadControllerPropertyTest extends TestCase
{
    public function test_property_file_type_validation_errors_bubble_up(): void
    {
        /** @var FileUploadService&MockObject $service */
        $service = $this->createMock(FileUploadService::class);

        $service->expects($this->exactly(3))
            ->method('generatePresignedUrl')
            ->willThrowException(new FileUploadException('INVALID_FILE_TYPE', 'Invalid file type', 400));

        $controller = new FileUploadController($service);

        foreach (['exe', 'php', 'zip'] as $ext) {
            /** @var GenerateUploadUrlRequest&MockObject $request */
            $request = $this->createMock(GenerateUploadUrlRequest::class);
            $request->expects($this->once())
                ->method('validated')
                ->willReturn([
                    'file_name' => "malicious.{$ext}",
                    'file_type' => 'application/octet-stream',
                    'file_size' => 1024,
                    'upload_type' => 'document',
                ]);
            $request->expects($this->once())
                ->method('user')
                ->willReturn((object) ['id' => 'user-1']);
            try {
                $controller->generateUploadUrl($request);
                $this->fail("Expected INVALID_FILE_TYPE exception for extension [{$ext}]");
            } catch (FileUploadException $exception) {
                $this->assertSame('Invalid file type', $exception->getMessage());
            }
        }
    }

    public function test_property_file_size_validation_errors_bubble_up(): void
    {
        /** @var FileUploadService&MockObject $service */
        $service = $this->createMock(FileUploadService::class);

        $service->expects($this->exactly(2))
            ->method('generatePresignedUrl')
            ->willThrowException(new FileUploadException('FILE_TOO_LARGE', 'File too large', 400));

        $controller = new FileUploadController($service);

        foreach ([6_000_000, 20_000_000] as $size) {
            /** @var GenerateUploadUrlRequest&MockObject $request */
            $request = $this->createMock(GenerateUploadUrlRequest::class);
            $request->expects($this->once())
                ->method('validated')
                ->willReturn([
                    'file_name' => 'resume.pdf',
                    'file_type' => 'application/pdf',
                    'file_size' => $size,
                    'upload_type' => 'document',
                ]);
            $request->expects($this->once())
                ->method('user')
                ->willReturn((object) ['id' => 'user-1']);
            try {
                $controller->generateUploadUrl($request);
                $this->fail("Expected FILE_TOO_LARGE exception for size [{$size}]");
            } catch (FileUploadException $exception) {
                $this->assertSame('File too large', $exception->getMessage());
            }
        }
    }

    public function test_property_file_url_persistence_in_confirm_upload_response(): void
    {
        /** @var FileUploadService&MockObject $service */
        $service = $this->createMock(FileUploadService::class);

        $service->expects($this->exactly(3))
            ->method('validateFileUrl')
            ->willReturn(true);

        $controller = new FileUploadController($service);

        for ($i = 1; $i <= 3; $i++) {
            $url = "https://cdn.jobswipe.test/document/user-{$i}/resume.pdf";

            $request = $this->createMock(ConfirmUploadRequest::class);
            $request->expects($this->once())->method('validated')->willReturn(['file_url' => $url]);

            $response = $controller->confirmUpload($request);
            $payload = json_decode($response->getContent(), true);

            $this->assertSame(200, $response->getStatusCode());
            $this->assertTrue($payload['success']);
            $this->assertSame($url, $payload['data']['file_url']);
        }
    }

    public function test_property_read_url_generation_returns_expected_file_key_for_multiple_inputs(): void
    {
        /** @var FileUploadService&MockObject $service */
        $service = $this->createMock(FileUploadService::class);

        $service->expects($this->exactly(3))
            ->method('generatePresignedReadUrl')
            ->willReturnCallback(static function (string $fileUrl): array {
                $path = ltrim((string) parse_url($fileUrl, PHP_URL_PATH), '/');

                return [
                    'read_url' => 'https://signed.example.test/'.$path.'?X-Amz-Signature=abc',
                    'file_key' => $path,
                    'expires_in' => 900,
                ];
            });

        $controller = new FileUploadController($service);

        for ($i = 1; $i <= 3; $i++) {
            $fileUrl = "https://cdn.jobswipe.test/document/user-{$i}/resume.pdf";

            /** @var GenerateReadUrlRequest&MockObject $request */
            $request = $this->createMock(GenerateReadUrlRequest::class);
            $request->expects($this->once())
                ->method('validated')
                ->willReturn([
                    'file_url' => $fileUrl,
                ]);

            $response = $controller->generateReadUrl($request);
            $payload = json_decode($response->getContent(), true);

            $this->assertSame(200, $response->getStatusCode());
            $this->assertTrue($payload['success']);
            $this->assertSame("document/user-{$i}/resume.pdf", $payload['data']['file_key']);
        }
    }
}
