<?php

namespace App\Repositories\MongoDB;

use App\Models\MongoDB\ApplicantProfileDocument;
use Illuminate\Support\Collection;

class ApplicantProfileDocumentRepository
{
    public function findByUserId(string $userId): ?ApplicantProfileDocument
    {
        return ApplicantProfileDocument::where('user_id', $userId)->first();
    }

    public function create(array $data): ApplicantProfileDocument
    {
        return ApplicantProfileDocument::create($data);
    }

    public function update(ApplicantProfileDocument $profile, array $data): ApplicantProfileDocument
    {
        $profile->update($data);

        return $profile->fresh();
    }

    public function updateFields(string $userId, array $fields): void
    {
        ApplicantProfileDocument::where('user_id', $userId)->update($fields);
    }

    public function addSkill(string $userId, array $skill): void
    {
        $profile = $this->findByUserId($userId);

        if ($profile) {
            $skills = $profile->skills ?? [];
            $skills[] = $skill;
            $profile->update(['skills' => $skills]);
        }
    }

    public function addWorkExperience(string $userId, array $experience): void
    {
        $profile = $this->findByUserId($userId);

        if ($profile) {
            $workExperience = $profile->work_experience ?? [];
            $workExperience[] = $experience;
            $profile->update(['work_experience' => $workExperience]);
        }
    }

    public function searchBySkills(array $skills): Collection
    {
        return ApplicantProfileDocument::whereIn('skills.name', $skills)->get();
    }

    public function getNotificationPreferences(string $userId): ?array
    {
        $profile = $this->findByUserId($userId);

        return $profile ? $profile->getNotificationPreferences() : null;
    }

    public function updateNotificationPreferences(string $userId, array $preferences): void
    {
        $profile = $this->findByUserId($userId);

        if ($profile) {
            $currentPrefs = $profile->getNotificationPreferences();
            $merged = array_merge($currentPrefs, $preferences);
            $profile->update(['notification_preferences' => $merged]);
        }
    }

    public function getAll(): Collection
    {
        return ApplicantProfileDocument::all();
    }
}
