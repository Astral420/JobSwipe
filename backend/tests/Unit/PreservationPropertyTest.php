<?php

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Preservation Property Tests
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests verify that non-test CI workflow behaviors are preserved after the fix.
 * They test behaviors that should NOT be affected by adding phpunit.xml.dist and DatabaseSeeder.
 *
 * EXPECTED OUTCOME: All tests PASS on UNFIXED code (confirms baseline behavior to preserve)
 */
class PreservationPropertyTest extends TestCase
{
    /**
     * Property 2: Preservation - Linting Behavior
     *
     * Test that Laravel Pint linting continues to work exactly as before.
     * This verifies that adding phpunit.xml.dist does not affect code style validation.
     *
     * **Validates: Requirement 3.1**
     */
    public function test_linting_with_pint_continues_to_work(): void
    {
        $basePath = dirname(__DIR__, 2);
        $pintPath = $basePath.'/vendor/bin/pint';

        // Skip if vendor/bin/pint doesn't exist (dependencies not installed)
        if (file_exists($pintPath) === false) {
            $this->markTestSkipped('Laravel Pint not installed. Run composer install first.');
        }

        // Run Laravel Pint in test mode (--test flag means it won't modify files)
        $command = escapeshellcmd($pintPath).' --test';
        $output = [];
        $exitCode = 0;

        exec('cd '.escapeshellarg($basePath)." && $command 2>&1", $output, $exitCode);

        // Pint should execute without fatal errors
        // Exit code 0 = no style issues, Exit code 1 = style issues found (both are valid)
        // We're testing that Pint RUNS, not that code is perfectly styled
        $this->assertContains(
            $exitCode,
            [0, 1],
            "Laravel Pint should execute successfully. Exit code: $exitCode\nOutput: ".implode("\n", $output)
        );

        // Verify Pint actually ran by checking output contains expected patterns
        $outputString = implode("\n", $output);
        $this->assertTrue(
            str_contains($outputString, 'PASS') ||
            str_contains($outputString, 'FAIL') ||
            str_contains($outputString, 'files') ||
            str_contains($outputString, 'Pint'),
            "Laravel Pint output should contain expected patterns indicating it ran successfully.\nOutput: $outputString"
        );
    }

    /**
     * Property 2: Preservation - Migration Behavior
     *
     * Test that database migrations continue to work exactly as before.
     * This verifies that adding DatabaseSeeder does not affect migration execution.
     *
     * **Validates: Requirement 3.2**
     */
    public function test_migrations_continue_to_work(): void
    {
        $basePath = dirname(__DIR__, 2);
        $artisanPath = $basePath.'/artisan';

        // Skip if artisan doesn't exist
        if (file_exists($artisanPath) === false) {
            $this->markTestSkipped('Artisan command not found.');
        }

        // Skip if vendor directory doesn't exist (dependencies not installed)
        if (is_dir($basePath.'/vendor') === false) {
            $this->markTestSkipped('Vendor directory not found. Run composer install first.');
        }

        // Test that migrate command can be invoked (we use --help to avoid actually running migrations)
        $command = 'php '.escapeshellarg($artisanPath).' migrate --help';
        $output = [];
        $exitCode = 0;

        exec('cd '.escapeshellarg($basePath)." && $command 2>&1", $output, $exitCode);

        // Command should execute successfully
        $this->assertEquals(
            0,
            $exitCode,
            "Migration command should be available. Exit code: $exitCode\nOutput: ".implode("\n", $output)
        );

        // Verify output contains migration help text
        $outputString = implode("\n", $output);
        $this->assertTrue(
            str_contains($outputString, 'migrate') || str_contains($outputString, 'database'),
            "Migration command help should be displayed.\nOutput: $outputString"
        );
    }

    /**
     * Property 2: Preservation - Feature Test Behavior
     *
     * Test that feature tests continue to work if they exist.
     * This verifies that adding phpunit.xml.dist preserves existing test execution.
     *
     * **Validates: Requirement 3.3**
     */
    public function test_feature_tests_continue_to_work_if_they_exist(): void
    {
        $basePath = dirname(__DIR__, 2);
        $featureTestsPath = $basePath.'/tests/Feature';

        // Skip if Feature tests directory doesn't exist
        if (is_dir($featureTestsPath) === false) {
            $this->markTestSkipped('Feature tests directory does not exist. This is expected for this project.');
        }

        // Skip if vendor directory doesn't exist (dependencies not installed)
        if (is_dir($basePath.'/vendor') === false) {
            $this->markTestSkipped('Vendor directory not found. Run composer install first.');
        }

        // Check if there are any feature test files
        $featureTestFiles = glob($featureTestsPath.'/*Test.php');

        if (empty($featureTestFiles)) {
            $this->markTestSkipped('No feature test files found. This is expected for this project.');
        }

        // Test that feature tests can be invoked
        $artisanPath = $basePath.'/artisan';
        $command = 'php '.escapeshellarg($artisanPath).' test --testsuite=Feature --help';
        $output = [];
        $exitCode = 0;

        exec('cd '.escapeshellarg($basePath)." && $command 2>&1", $output, $exitCode);

        // Command should execute successfully
        $this->assertEquals(
            0,
            $exitCode,
            "Feature test command should be available. Exit code: $exitCode\nOutput: ".implode("\n", $output)
        );
    }

    /**
     * Property 2: Preservation - Docker Build Behavior
     *
     * Test that Docker image builds successfully.
     * This verifies that adding configuration files does not break Docker builds.
     *
     * **Validates: Requirement 3.4**
     */
    public function test_docker_build_continues_to_work(): void
    {
        // Determine Dockerfile path - works both locally and in Docker
        $backendPath = dirname(__DIR__, 2); // From tests/Unit to backend root
        $dockerfilePath = dirname($backendPath).'/Dockerfile'; // Up one more to project root

        // Skip if Dockerfile doesn't exist
        if (file_exists($dockerfilePath) === false) {
            $this->markTestSkipped('Dockerfile not found at project root.');
        }

        // Verify Dockerfile is readable and contains expected content
        $dockerfileContent = file_get_contents($dockerfilePath);

        $this->assertNotEmpty(
            $dockerfileContent,
            'Dockerfile should not be empty'
        );

        // Verify Dockerfile contains expected Laravel/PHP patterns
        $this->assertTrue(
            str_contains($dockerfileContent, 'FROM') ||
            str_contains($dockerfileContent, 'php') ||
            str_contains($dockerfileContent, 'composer'),
            'Dockerfile should contain expected Docker/PHP patterns'
        );

        // Note: We don't actually build the Docker image here because:
        // 1. It's time-consuming and resource-intensive
        // 2. It requires Docker daemon to be running
        // 3. The CI workflow already tests actual Docker builds
        // This test verifies the Dockerfile exists and is valid for the CI workflow
    }

    /**
     * Property 2: Preservation - Security Scan Behavior
     *
     * Test that security scan tools can access necessary files.
     * This verifies that adding configuration files does not break security scanning.
     *
     * **Validates: Requirement 3.5**
     */
    public function test_security_scan_prerequisites_continue_to_work(): void
    {
        // Determine paths - works both locally and in Docker
        // In Docker: /var/www/html (backend) -> /var/www/Dockerfile
        // Locally: backend/ -> ../Dockerfile
        $backendPath = dirname(__DIR__, 2); // From tests/Unit to backend root
        $dockerfilePath = dirname($backendPath).'/Dockerfile'; // Up one more to project root
        $composerJsonPath = $backendPath.'/composer.json';

        // Verify files needed for security scanning exist
        $this->assertFileExists(
            $dockerfilePath,
            'Dockerfile must exist for security scanning (SBOM generation, Trivy scan)'
        );

        $this->assertFileExists(
            $composerJsonPath,
            'composer.json must exist for dependency scanning'
        );

        // Verify composer.json is valid JSON
        $composerContent = file_get_contents($composerJsonPath);
        $composerData = json_decode($composerContent, true);

        $this->assertNotNull(
            $composerData,
            'composer.json must be valid JSON for security scanning'
        );

        $this->assertArrayHasKey(
            'require',
            $composerData,
            'composer.json must have require section for dependency scanning'
        );
    }
}
