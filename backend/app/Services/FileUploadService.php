<?php

namespace App\Services;

use App\Exceptions\FileUploadException;
use Aws\S3\S3Client;
use Illuminate\Support\Str;

class FileUploadService
{
    public const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

    public const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

    public const PRESIGNED_EXPIRATION_SECONDS = 900;

    private const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

    private const DOCUMENT_EXTENSIONS = ['pdf', 'docx'];

    private const IMAGE_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
    ];

    private const DOCUMENT_MIME_TYPES = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    public function generatePresignedUrl(
        string $userId,
        string $fileName,
        string $fileType,
        int $fileSize,
        string $uploadType
    ): array {
        $extension = strtolower((string) pathinfo($fileName, PATHINFO_EXTENSION));

        $this->validateFileType($extension, $fileType, $uploadType);
        $this->validateFileSize($fileSize, $uploadType);

        $bucket = (string) config('filesystems.disks.r2.bucket');

        if ($bucket === '') {
            throw new FileUploadException('R2_NOT_CONFIGURED', 'R2 bucket is not configured.', 500);
        }

        $fileKey = sprintf(
            '%s/%s/%s.%s',
            $uploadType,
            $userId,
            Str::uuid()->toString(),
            $extension
        );

        $command = $this->client()->getCommand('PutObject', [
            'Bucket' => $bucket,
            'Key' => $fileKey,
            'ContentType' => $fileType,
        ]);

        $request = $this->client()->createPresignedRequest(
            $command,
            '+'.self::PRESIGNED_EXPIRATION_SECONDS.' seconds'
        );

        return [
            'upload_url' => (string) $request->getUri(),
            'file_key' => $fileKey,
            'public_url' => $this->buildPublicUrl($fileKey),
            'expires_in' => self::PRESIGNED_EXPIRATION_SECONDS,
        ];
    }

    public function validateFileUrl(string $fileUrl): bool
    {
        $url = filter_var($fileUrl, FILTER_VALIDATE_URL);

        if ($url === false) {
            throw new FileUploadException('INVALID_FILE_URL', 'The provided file URL is invalid.');
        }

        $allowedHosts = array_filter([
            parse_url((string) config('filesystems.disks.r2.url'), PHP_URL_HOST),
            parse_url((string) config('filesystems.disks.r2.endpoint'), PHP_URL_HOST),
        ]);

        $host = parse_url($fileUrl, PHP_URL_HOST);

        if (! is_string($host)) {
            throw new FileUploadException('INVALID_FILE_URL', 'The provided file URL has no valid host.');
        }

        // Check if host matches exactly or is a subdomain of allowed hosts
        $isAllowed = false;
        foreach ($allowedHosts as $allowedHost) {
            if ($host === $allowedHost || str_ends_with($host, '.'.$allowedHost)) {
                $isAllowed = true;
                break;
            }
        }

        if (! $isAllowed) {
            throw new FileUploadException('INVALID_FILE_URL', 'The provided file URL is not from an authorized R2 bucket.');
        }

        return true;
    }

    public function generatePresignedReadUrl(string $fileUrl): array
    {
        $this->validateFileUrl($fileUrl);

        $bucket = (string) config('filesystems.disks.r2.bucket');

        if ($bucket === '') {
            throw new FileUploadException('R2_NOT_CONFIGURED', 'R2 bucket is not configured.', 500);
        }

        $fileKey = $this->extractFileKeyFromUrl($fileUrl);

        if ($fileKey === '') {
            throw new FileUploadException('INVALID_FILE_URL', 'The provided file URL has no valid file key.');
        }

        $command = $this->client()->getCommand('GetObject', [
            'Bucket' => $bucket,
            'Key' => $fileKey,
        ]);

        $request = $this->client()->createPresignedRequest(
            $command,
            '+'.self::PRESIGNED_EXPIRATION_SECONDS.' seconds'
        );

        return [
            'read_url' => (string) $request->getUri(),
            'file_key' => $fileKey,
            'expires_in' => self::PRESIGNED_EXPIRATION_SECONDS,
        ];
    }

    private function validateFileType(string $extension, string $mimeType, string $uploadType): void
    {
        if ($uploadType === 'image') {
            if (! in_array($extension, self::IMAGE_EXTENSIONS, true) || ! in_array($mimeType, self::IMAGE_MIME_TYPES, true)) {
                throw new FileUploadException(
                    'INVALID_FILE_TYPE',
                    'Invalid file type. Allowed image types: jpg, jpeg, png, webp, heic, heif.'
                );
            }

            return;
        }

        if ($uploadType === 'document') {
            if (! in_array($extension, self::DOCUMENT_EXTENSIONS, true) || ! in_array($mimeType, self::DOCUMENT_MIME_TYPES, true)) {
                throw new FileUploadException(
                    'INVALID_FILE_TYPE',
                    'Invalid file type. Allowed document types: pdf, docx.'
                );
            }

            return;
        }

        throw new FileUploadException('INVALID_UPLOAD_TYPE', 'Upload type must be image or document.');
    }

    private function validateFileSize(int $fileSize, string $uploadType): void
    {
        if ($fileSize < 1) {
            throw new FileUploadException('FILE_TOO_SMALL', 'File size must be greater than zero.');
        }

        $maxBytes = $uploadType === 'image' ? self::MAX_IMAGE_BYTES : self::MAX_DOCUMENT_BYTES;

        if ($fileSize > $maxBytes) {
            throw new FileUploadException(
                'FILE_TOO_LARGE',
                sprintf('File too large. Maximum allowed size is %d bytes.', $maxBytes)
            );
        }
    }

    private function buildPublicUrl(string $fileKey): string
    {
        $publicBase = rtrim((string) config('filesystems.disks.r2.url'), '/');

        if ($publicBase !== '') {
            return $publicBase.'/'.$fileKey;
        }

        $endpoint = rtrim((string) config('filesystems.disks.r2.endpoint'), '/');
        $bucket = (string) config('filesystems.disks.r2.bucket');

        return $endpoint.'/'.$bucket.'/'.$fileKey;
    }

    private function extractFileKeyFromUrl(string $fileUrl): string
    {
        $path = ltrim((string) parse_url($fileUrl, PHP_URL_PATH), '/');

        if ($path === '') {
            return '';
        }

        $bucket = trim((string) config('filesystems.disks.r2.bucket'));

        if ($bucket !== '' && str_starts_with($path, $bucket.'/')) {
            return substr($path, strlen($bucket) + 1);
        }

        if ($path === $bucket) {
            return '';
        }

        return $path;
    }

    private function client(): S3Client
    {
        $endpoint = (string) config('filesystems.disks.r2.endpoint');

        if ($endpoint === '') {
            throw new FileUploadException('R2_NOT_CONFIGURED', 'R2 endpoint is not configured.', 500);
        }

        return new S3Client([
            'version' => 'latest',
            'region' => 'auto',
            'endpoint' => $endpoint,
            'credentials' => [
                'key' => (string) config('filesystems.disks.r2.key'),
                'secret' => (string) config('filesystems.disks.r2.secret'),
            ],
            'use_path_style_endpoint' => false,
        ]);
    }
}
