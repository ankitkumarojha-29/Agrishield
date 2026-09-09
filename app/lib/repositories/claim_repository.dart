import '../api/api_client.dart';
import '../models/envelope.dart';
import '../models/insurance_models.dart'; // Reuse VerificationResponse
import 'package:uuid/uuid.dart';

abstract class ClaimRepository {
  Future<Envelope<VerificationResponse>> getClaimVerification(String claimId);
  Future<Envelope<Map<String, dynamic>>> createClaim(Map<String, dynamic> payload);
}

class ApiClaimRepository implements ClaimRepository {
  final ApiClient _client = ApiClient();

  @override
  Future<Envelope<VerificationResponse>> getClaimVerification(String claimId) async {
    return _client.get(
      '/claims/$claimId/verification',
      (data) => VerificationResponse.fromJson(data),
    );
  }

  @override
  Future<Envelope<Map<String, dynamic>>> createClaim(Map<String, dynamic> payload) async {
    final idempotencyKey = const Uuid().v4();
    return _client.post(
      '/claims',
      payload,
      (data) => data as Map<String, dynamic>,
      extraHeaders: {'Idempotency-Key': idempotencyKey},
    );
  }
}

class LocalMockClaimRepository implements ClaimRepository {
  @override
  Future<Envelope<VerificationResponse>> getClaimVerification(String claimId) async {
    await Future.delayed(const Duration(milliseconds: 800));
    return Envelope(
      success: true,
      data: VerificationResponse(
        status: 'VERIFIED',
        canonicalHash: 'mock_hash',
        txHash: '0xmock_hash_claim',
      ),
      meta: EnvelopeMeta(requestId: 'req-3', timestamp: DateTime.now().toIso8601String()),
    );
  }

  @override
  Future<Envelope<Map<String, dynamic>>> createClaim(Map<String, dynamic> payload) async {
    await Future.delayed(const Duration(milliseconds: 1000));
    return Envelope(
      success: true,
      data: {"id": "mock_claim_id", "status": "PENDING"},
      meta: EnvelopeMeta(requestId: 'req-4', timestamp: DateTime.now().toIso8601String()),
    );
  }
}
