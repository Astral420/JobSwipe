<?php

namespace App\Http\Controllers\IAP;

use App\Exceptions\IAPException;
use App\Http\Controllers\Controller;
use App\Http\Requests\IAP\PurchaseRequest;
use App\Services\IAPService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IAPController extends Controller
{
    public function __construct(private IAPService $iapService) {}

    /**
     * Process IAP purchase from mobile app
     * POST /api/v1/iap/purchase
     */
    public function purchase(PurchaseRequest $request): JsonResponse
    {
        try {
            $result = $this->iapService->processPurchase(
                user: $request->user(),
                paymentProvider: $request->input('payment_provider'),
                productId: $request->input('product_id'),
                receiptData: $request->input('receipt_data'),
                idempotencyKey: $request->input('idempotency_key')
            );

            return $this->success($result, 'Purchase processed successfully');
        } catch (IAPException $e) {
            return $e->render();
        }
    }

    /**
     * Get applicant subscription status
     * GET /api/v1/applicant/subscription/status
     */
    public function getSubscriptionStatus(Request $request): JsonResponse
    {
        try {
            $status = $this->iapService->getApplicantSubscriptionStatus($request->user());

            return $this->success($status);
        } catch (IAPException $e) {
            return $e->render();
        }
    }

    /**
     * Get purchase history for applicant
     * GET /api/v1/applicant/purchases
     */
    public function getPurchaseHistory(Request $request): JsonResponse
    {
        try {
            $history = $this->iapService->getPurchaseHistory($request->user());

            return $this->success($history);
        } catch (IAPException $e) {
            return $e->render();
        }
    }

    /**
     * Cancel applicant subscription
     * POST /api/v1/applicant/subscription/cancel
     */
    public function cancelSubscription(Request $request): JsonResponse
    {
        try {
            $this->iapService->cancelApplicantSubscription($request->user());

            return $this->success([], 'Subscription cancelled successfully');
        } catch (IAPException $e) {
            return $e->render();
        }
    }
}
