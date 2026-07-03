<?php

namespace Tests\Unit\Requests;

use App\Http\Requests\File\GenerateReadUrlRequest;
use App\Http\Requests\File\GenerateUploadUrlRequest;
use App\Http\Requests\Profile\UpdateApplicantBasicInfoRequest;
use App\Http\Requests\Profile\UpdateApplicantSkillsRequest;
use App\Http\Requests\Profile\UpdateCompanyDetailsRequest;
use Tests\TestCase;

class ProfileRequestValidationTest extends TestCase
{
    public function test_update_applicant_basic_info_validation_rules_accept_valid_payload(): void
    {
        $data = [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'bio' => 'Backend developer',
            'location' => 'Makati',
            'location_city' => 'Makati',
            'location_region' => 'NCR',
        ];

        $validator = validator($data, (new UpdateApplicantBasicInfoRequest)->rules());

        $this->assertFalse($validator->fails(), json_encode($validator->errors()->toArray()));
    }

    public function test_update_applicant_skills_rejects_empty_skills_array(): void
    {
        $data = ['skills' => []];

        $validator = validator($data, (new UpdateApplicantSkillsRequest)->rules());

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('skills', $validator->errors()->toArray());
    }

    public function test_update_company_details_requires_company_fields(): void
    {
        $data = [
            'company_name' => '',
            'description' => '',
            'industry' => '',
            'company_size' => '',
        ];

        $validator = validator($data, (new UpdateCompanyDetailsRequest)->rules());

        $this->assertTrue($validator->fails());
        $errors = $validator->errors()->toArray();
        $this->assertArrayHasKey('company_name', $errors);
        $this->assertArrayHasKey('description', $errors);
        $this->assertArrayHasKey('industry', $errors);
        $this->assertArrayHasKey('company_size', $errors);
    }

    public function test_generate_upload_url_request_validation(): void
    {
        $validData = [
            'file_name' => 'resume.pdf',
            'file_type' => 'application/pdf',
            'file_size' => 1024,
            'upload_type' => 'document',
        ];

        $validator = validator($validData, (new GenerateUploadUrlRequest)->rules());
        $this->assertFalse($validator->fails(), json_encode($validator->errors()->toArray()));

        $invalidData = $validData;
        $invalidData['upload_type'] = 'binary';

        $validator = validator($invalidData, (new GenerateUploadUrlRequest)->rules());
        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('upload_type', $validator->errors()->toArray());
    }

    public function test_generate_read_url_request_validation(): void
    {
        $validData = [
            'file_url' => 'https://cdn.jobswipe.test/document/user-1/resume.pdf',
        ];

        $validator = validator($validData, (new GenerateReadUrlRequest)->rules());
        $this->assertFalse($validator->fails(), json_encode($validator->errors()->toArray()));

        $invalidData = [
            'file_url' => 'not-a-url',
        ];

        $validator = validator($invalidData, (new GenerateReadUrlRequest)->rules());
        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('file_url', $validator->errors()->toArray());
    }

    public function test_role_authorization_for_profile_requests(): void
    {
        $applicantReq = UpdateApplicantBasicInfoRequest::create('/profile/applicant/basic-info', 'PATCH');
        $applicantReq->setUserResolver(static fn () => (object) ['role' => 'applicant']);
        $this->assertTrue($applicantReq->authorize());

        $invalidApplicantReq = UpdateApplicantBasicInfoRequest::create('/profile/applicant/basic-info', 'PATCH');
        $invalidApplicantReq->setUserResolver(static fn () => (object) ['role' => 'hr']);
        $this->assertFalse($invalidApplicantReq->authorize());

        $companyReq = UpdateCompanyDetailsRequest::create('/profile/company/details', 'PATCH');
        $companyReq->setUserResolver(static fn () => (object) ['role' => 'company_admin']);
        $this->assertTrue($companyReq->authorize());

        $invalidCompanyReq = UpdateCompanyDetailsRequest::create('/profile/company/details', 'PATCH');
        $invalidCompanyReq->setUserResolver(static fn () => (object) ['role' => 'applicant']);
        $this->assertFalse($invalidCompanyReq->authorize());
    }
}
