<?php

namespace App\Services;

use InvalidArgumentException;

class ProfileSocialLinksValidator
{
    public function validate(array $socialLinks): void
    {
        if (isset($socialLinks['linkedin']) && ! preg_match('/^https:\/\/(www\.)?linkedin\.com\/in\/.+/i', (string) $socialLinks['linkedin'])) {
            throw new InvalidArgumentException('INVALID_URL:linkedin');
        }

        if (isset($socialLinks['github']) && ! preg_match('/^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_-]+\/?$/i', (string) $socialLinks['github'])) {
            throw new InvalidArgumentException('INVALID_URL:github');
        }

        if (isset($socialLinks['twitter']) && ! preg_match('/^https:\/\/(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]+\/?$/i', (string) $socialLinks['twitter'])) {
            throw new InvalidArgumentException('INVALID_URL:twitter');
        }

        if (! isset($socialLinks['portfolio'])) {
            return;
        }

        $portfolio = (string) $socialLinks['portfolio'];
        if (! filter_var($portfolio, FILTER_VALIDATE_URL) || ! str_starts_with($portfolio, 'https://')) {
            throw new InvalidArgumentException('INVALID_URL:portfolio');
        }
    }
}
