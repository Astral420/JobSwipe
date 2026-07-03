<?php

namespace App\Console\Commands;

use App\Repositories\MongoDB\ApplicantProfileDocumentRepository;
use Illuminate\Console\Command;

class MigrateSkillsStructure extends Command
{
    protected $signature = 'migrate:skills-structure';

    protected $description = 'Migrate applicant skills from flat array to nested hard_skills/soft_skills structure';

    public function __construct(
        private ApplicantProfileDocumentRepository $applicantDocs
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Starting skills structure migration...');

        $profiles = $this->applicantDocs->getAll();
        $migrated = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($profiles as $profile) {
            try {
                $skills = $profile->skills;

                // Skip if already in new format
                if (is_array($skills) && isset($skills['hard_skills'])) {
                    $this->line("Skipping {$profile->user_id} - already migrated");
                    $skipped++;

                    continue;
                }

                // Handle JSON string (from your example)
                if (is_string($skills)) {
                    $decoded = json_decode($skills, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $skills = $decoded;
                    } else {
                        $skills = [];
                    }
                }

                // Convert flat array to nested structure
                if (is_array($skills) && ! isset($skills['hard_skills'])) {
                    // Treat all existing skills as hard skills by default
                    $newSkills = [
                        'hard_skills' => array_values($skills),
                        'soft_skills' => [],
                    ];

                    $this->applicantDocs->update($profile, ['skills' => $newSkills]);
                    $this->info("Migrated {$profile->user_id}: ".count($skills).' skills');
                    $migrated++;
                } else {
                    $this->line("Skipping {$profile->user_id} - no skills to migrate");
                    $skipped++;
                }
            } catch (\Exception $e) {
                $this->error("Error migrating {$profile->user_id}: {$e->getMessage()}");
                $errors++;
            }
        }

        $this->newLine();
        $this->info('Migration complete!');
        $this->table(
            ['Status', 'Count'],
            [
                ['Migrated', $migrated],
                ['Skipped', $skipped],
                ['Errors', $errors],
                ['Total', $profiles->count()],
            ]
        );

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}
