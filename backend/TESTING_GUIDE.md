# Testing Guide

## Quick Start

### Run All Tests
```bash
# From backend directory
cd backend
php artisan test

# Or from root using Makefile
make test-backend
```

### Run Specific Test Suites
```bash
# Unit tests only (fast, no database)
php artisan test --testsuite=Unit

# Feature tests only with real PostgreSQL/MongoDB/Redis
php artisan test --testsuite=Feature -c phpunit.feature.xml
```

## Test Structure

Your test suite has two main categories:

### Unit Tests (`tests/Unit/`)
- Fast, isolated tests
- No database required (uses SQLite in-memory)
- Tests individual components in isolation
- Mock external dependencies

**Categories**:
- `Controllers/` - Controller logic tests
- `Services/` - Business logic tests
- `Repositories/` - Repository method signature tests
- `Middleware/` - Middleware behavior tests
- `Requests/` - Form request validation tests
- `Exceptions/` - Exception handling tests
- `Routes/` - Route registration tests

### Feature Tests (`tests/Feature/`)
- Integration tests
- Uses test database
- Tests complete workflows
- Tests API endpoints end-to-end

**Categories**:
- `Auth/` - Authentication flows (login, registration, email verification)
- `HR/` - HR management features (invitations, memberships, magic links)
- `Match/` - Matching system tests
- `Swipe/` - Swipe functionality tests

## Running Tests

### All Tests
```bash
# Run everything
php artisan test

# With coverage (requires Xdebug)
php artisan test --coverage

# With minimum coverage threshold
php artisan test --coverage --min=80
```

### Specific Test Suites
```bash
# Unit tests only
php artisan test --testsuite=Unit

# Feature tests only (real backends)
php artisan test --testsuite=Feature -c phpunit.feature.xml
```

### Specific Test Files
```bash
# Run a specific test file
php artisan test tests/Unit/Services/ProfileServiceUnitTest.php

# Run a specific test method
php artisan test --filter=test_calculate_applicant_completion_handles_zero_and_full_completion
```

### By Category
```bash
# All auth tests
php artisan test tests/Feature/Auth/

# All HR tests
php artisan test tests/Feature/HR/

# All service tests
php artisan test tests/Unit/Services/
```

### Parallel Testing (Faster)
```bash
# Run tests in parallel (requires paratest)
php artisan test --parallel

# Specify number of processes
php artisan test --parallel --processes=4
```

## Test Configuration

Unit tests use `phpunit.xml.dist` configuration:

```xml
<php>
    <env name="APP_ENV" value="testing"/>
    <env name="DB_CONNECTION" value="sqlite"/>
    <env name="DB_DATABASE" value=":memory:"/>
    <env name="CACHE_DRIVER" value="array"/>
    <env name="QUEUE_CONNECTION" value="sync"/>
    <env name="SESSION_DRIVER" value="array"/>
    <env name="MAIL_MAILER" value="array"/>
</php>
```

This means for unit tests:
- ✅ Tests use SQLite in-memory database (fast, isolated)
- ✅ No real emails sent (captured in array)
- ✅ No real queue jobs (run synchronously)
- ✅ No real cache (array driver)

Feature tests use `phpunit.feature.xml` (real backends):

```bash
php artisan test --testsuite=Feature -c phpunit.feature.xml
```

## Docker Environment Testing

If you want to test against real databases:

```bash
# Start Docker services
make docker-up

# Create dedicated PostgreSQL test database (one-time)
docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE jobapp_test;"

# Run feature tests against real PostgreSQL/MongoDB/Redis
cd backend
php artisan test --testsuite=Feature -c phpunit.feature.xml
```

## Continuous Integration

Your GitHub Actions CI runs tests automatically:

### On Pull Requests (`.github/workflows/ci.yml`)
```yaml
Phase 1: Lint & Validate
Phase 2: Unit Tests (currently skipped)
Phase 3: Integration Tests (Feature tests)
Phase 4: E2E Tests (currently skipped)
Phase 5: Docker Build & Test
Phase 6: Security Scan
```

### What CI Tests
- ✅ Linting (Laravel Pint)
- ✅ Feature tests with real databases (PostgreSQL, MongoDB, Redis)
- ✅ Docker image builds successfully
- ✅ Security vulnerabilities

## Test Examples

### Unit Test Example
```php
// tests/Unit/Services/ProfileServiceUnitTest.php
public function test_calculate_applicant_completion_handles_zero_and_full_completion(): void
{
    // Arrange
    $service = new ProfileService(...);
    
    // Act
    $result = $service->calculateCompletion($data);
    
    // Assert
    $this->assertEquals(100, $result);
}
```

### Feature Test Example
```php
// tests/Feature/Auth/LoginTest.php
public function test_user_can_login_with_valid_credentials(): void
{
    // Arrange
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => Hash::make('password123')
    ]);
    
    // Act
    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'test@example.com',
        'password' => 'password123'
    ]);
    
    // Assert
    $response->assertStatus(200);
    $response->assertJsonStructure(['token', 'user']);
}
```

## Common Test Commands

```bash
# Run all tests
php artisan test

# Run with output
php artisan test --verbose

# Run specific suite
php artisan test --testsuite=Unit
php artisan test --testsuite=Feature

# Run specific file
php artisan test tests/Unit/Services/ProfileServiceUnitTest.php

# Run specific test method
php artisan test --filter=test_user_can_login

# Run tests matching pattern
php artisan test --filter=Login

# Stop on first failure
php artisan test --stop-on-failure

# Show test execution time
php artisan test --profile

# Run in parallel (faster)
php artisan test --parallel

# Generate coverage report
php artisan test --coverage
php artisan test --coverage-html coverage-report
```

## Test Categories Found

### Unit Tests
- ✅ **Services**: ProfileService, SubscriptionService, FileUploadService
- ✅ **Controllers**: ProfileController, SubscriptionController, FileUploadController, OnboardingController
- ✅ **Repositories**: IAPTransactionRepository, IAPIdempotencyRepository, SubscriptionRepository, WebhookEventRepository
- ✅ **Middleware**: CheckRole
- ✅ **Requests**: Profile validation
- ✅ **Exceptions**: Global exception handler, API exception format
- ✅ **Routes**: API route registration

### Feature Tests
- ✅ **Auth**: Login, Registration, Email Verification
- ✅ **HR**: 
  - HR Registration with Magic Link
  - Invitation system (send, resend, bulk)
  - Membership management (list, revoke, active middleware)
  - Profile setup
  - Admin notifications
  - Rate limiting
- ✅ **Match**: Match lifecycle
- ✅ **Swipe**: Swipe functionality

### Property Tests
- ✅ FileUploadService property tests
- ✅ ProfileService property tests
- ✅ SubscriptionService property tests
- ✅ Controller property tests
- ✅ Preservation property tests

## Debugging Failed Tests

### View detailed output
```bash
php artisan test --verbose
```

### Debug specific test
```bash
# Add dd() or dump() in your test
public function test_something(): void
{
    $result = $this->service->doSomething();
    dd($result); // Dies and dumps
    $this->assertEquals('expected', $result);
}
```

### Check test database
```bash
# Tests use SQLite in-memory by default
# To inspect, use a persistent database:

# Create .env.testing
cp .env .env.testing

# Set test database
DB_CONNECTION=sqlite
DB_DATABASE=database/testing.sqlite

# Create test database
touch database/testing.sqlite

# Run migrations
php artisan migrate --env=testing

# Run tests
php artisan test --env=testing

# Inspect database
sqlite3 database/testing.sqlite
```

### Check logs
```bash
# Test logs go to storage/logs/laravel.log
tail -f storage/logs/laravel.log
```

## Best Practices

### Before Committing
```bash
# 1. Run linter
php vendor/bin/pint --test

# 2. Run all tests
php artisan test

# 3. Check for failures
# Fix any issues before pushing
```

### Before Merging PR
```bash
# CI will run automatically, but you can test locally:

# 1. Lint
make lint-backend

# 2. Run tests
make test-backend

# 3. Build Docker image
docker build -t test-image -f Dockerfile .

# 4. Test Docker image
docker run --rm test-image php artisan test
```

### Writing New Tests

**Unit Test Template**:
```php
<?php

namespace Tests\Unit\Services;

use PHPUnit\Framework\TestCase;

class MyServiceTest extends TestCase
{
    public function test_it_does_something(): void
    {
        // Arrange
        $service = new MyService();
        
        // Act
        $result = $service->doSomething();
        
        // Assert
        $this->assertTrue($result);
    }
}
```

**Feature Test Template**:
```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class MyFeatureTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_api_endpoint_works(): void
    {
        // Arrange
        $user = User::factory()->create();
        
        // Act
        $response = $this->actingAs($user)
            ->postJson('/api/v1/endpoint', ['data' => 'value']);
        
        // Assert
        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
    }
}
```

## Makefile Commands

From project root:

```bash
# Run backend tests
make test-backend

# Run all tests (backend + web + mobile)
make test

# Lint before testing
make lint-backend

# Format code
make format-backend
```

## Summary

### Quick Commands
```bash
# Most common commands:
php artisan test                    # Run all tests
php artisan test --testsuite=Unit   # Unit tests only
php artisan test --testsuite=Feature # Feature tests only
php artisan test --parallel         # Faster parallel execution
php artisan test --coverage         # With coverage report
```

### Test Counts
Based on your test structure, you have:
- **Unit Tests**: 40+ test files
- **Feature Tests**: 15+ test files
- **Total**: 55+ test files with hundreds of test methods

### CI/CD Integration
- ✅ Tests run automatically on every PR
- ✅ Must pass before merge
- ✅ Integration tests use real databases
- ✅ Docker build tested

Your test suite is comprehensive and production-ready!
