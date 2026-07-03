<?php

namespace App\Http\Controllers\File;

use App\Http\Controllers\Controller;
use App\Http\Requests\File\ConfirmUploadRequest;
use App\Http\Requests\File\GenerateReadUrlRequest;
use App\Http\Requests\File\GenerateUploadUrlRequest;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;

class FileUploadController extends Controller
{
    public function __construct(private FileUploadService $fileUploads) {}

    public function generateUploadUrl(GenerateUploadUrlRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $result = $this->fileUploads->generatePresignedUrl(
            userId: (string) $request->user()->id,
            fileName: (string) $validated['file_name'],
            fileType: (string) $validated['file_type'],
            fileSize: (int) $validated['file_size'],
            uploadType: (string) $validated['upload_type'],
        );

        return $this->success(data: $result, message: 'Upload URL generated.');
    }

    public function generateReadUrl(GenerateReadUrlRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $result = $this->fileUploads->generatePresignedReadUrl((string) $validated['file_url']);

        return $this->success(data: $result, message: 'Read URL generated.');
    }

    public function confirmUpload(ConfirmUploadRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->fileUploads->validateFileUrl((string) $validated['file_url']);

        return $this->success(data: [
            'file_url' => $validated['file_url'],
            'confirmed' => true,
        ], message: 'Upload confirmed.');
    }
}
