<?php

namespace App\Repositories\PostgreSQL;

use App\Models\PostgreSQL\IAPTransaction;
use App\Models\PostgreSQL\Subscription;
use App\Models\PostgreSQL\User;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsRepository
{
    /**
     * Get user growth data for the specified number of days.
     */
    public function getUserGrowthData(int $days): array
    {
        $startDate = now()->subDays($days)->startOfDay();

        $applicants = User::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('COUNT(*) as count')
        )
            ->where('role', 'applicant')
            ->where('created_at', '>=', $startDate)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'asc')
            ->get()
            ->keyBy('date');

        $companies = User::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('COUNT(*) as count')
        )
            ->whereIn('role', ['company_admin', 'hr'])
            ->where('created_at', '>=', $startDate)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'asc')
            ->get()
            ->keyBy('date');

        // Generate array for all days in range
        $result = [];
        for ($i = 0; $i < $days; $i++) {
            $date = now()->subDays($days - $i - 1)->format('Y-m-d');
            $applicantCount = $applicants->get($date)?->count ?? 0;
            $companyCount = $companies->get($date)?->count ?? 0;

            $result[] = [
                'date' => $date,
                'applicants' => $applicantCount,
                'companies' => $companyCount,
                'total' => $applicantCount + $companyCount,
            ];
        }

        return $result;
    }

    /**
     * Get revenue data for the specified number of months.
     */
    public function getRevenueData(int $months): array
    {
        $startDate = now()->subMonths($months)->startOfMonth();

        // Get subscription revenue by month
        $subscriptionRevenue = Subscription::select(
            DB::raw("TO_CHAR(created_at, 'YYYY-MM') as month"),
            DB::raw('SUM(CAST(amount_paid AS DECIMAL)) as revenue')
        )
            ->where('created_at', '>=', $startDate)
            ->whereIn('status', ['active', 'cancelled'])
            ->groupBy(DB::raw("TO_CHAR(created_at, 'YYYY-MM')"))
            ->orderBy('month', 'asc')
            ->get()
            ->keyBy('month');

        // Get IAP revenue by month
        $iapRevenue = IAPTransaction::select(
            DB::raw("TO_CHAR(created_at, 'YYYY-MM') as month"),
            DB::raw('COUNT(*) * 10 as revenue') // Assuming average $10 per transaction
        )
            ->where('created_at', '>=', $startDate)
            ->groupBy(DB::raw("TO_CHAR(created_at, 'YYYY-MM')"))
            ->orderBy('month', 'asc')
            ->get()
            ->keyBy('month');

        // Generate array for all months in range
        $result = [];
        for ($i = 0; $i < $months; $i++) {
            $month = now()->subMonths($months - $i - 1)->format('Y-m');
            $subRevenue = (float) ($subscriptionRevenue->get($month)?->revenue ?? 0);
            $iapRev = (float) ($iapRevenue->get($month)?->revenue ?? 0);

            $result[] = [
                'date' => $month,
                'subscriptions' => $subRevenue,
                'iap' => $iapRev,
                'total' => $subRevenue + $iapRev,
            ];
        }

        return $result;
    }

    /**
     * Get recent platform activity.
     */
    public function getRecentActivity(int $limit): array
    {
        $activities = [];

        // Get recent user registrations
        $recentUsers = User::select('id', 'email', 'role', 'created_at')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        foreach ($recentUsers as $user) {
            $activities[] = [
                'id' => $user->id,
                'type' => 'user_registration',
                'description' => "New {$user->role} registered: {$user->email}",
                'created_at' => $user->created_at->toIso8601String(),
            ];
        }

        // Sort by created_at descending and limit
        usort($activities, function ($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        return array_slice($activities, 0, $limit);
    }
}
