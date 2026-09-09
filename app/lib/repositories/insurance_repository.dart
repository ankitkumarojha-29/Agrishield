import 'package:uuid/uuid.dart';
import '../api/api_client.dart';
import '../models/envelope.dart';
import '../models/insurance_models.dart';

abstract class InsuranceRepository {
  Future<Envelope<QuoteResponse>> getQuote(String farmId, String crop, double areaM2);
  Future<Envelope<PolicyResponse>> createPolicy(String farmId, double premiumAmount, double coverageAmount);
  Future<Envelope<List<dynamic>>> getPolicies();
}

class ApiInsuranceRepository implements InsuranceRepository {
  final ApiClient _client = ApiClient();
  final _uuid = const Uuid();

  @override
  Future<Envelope<QuoteResponse>> getQuote(String farmId, String crop, double areaM2) async {
    return _client.post(
      '/insurance/quote',
      {
        'farm_id': farmId,
        'crop': crop,
        'area_m2': areaM2,
      },
      (data) => QuoteResponse.fromJson(data),
    );
  }

  @override
  Future<Envelope<PolicyResponse>> createPolicy(String farmId, double premiumAmount, double coverageAmount) async {
    final idempotencyKey = _uuid.v4();
    return _client.post(
      '/insurance/policies',
      {
        'farm_id': farmId,
        'premium_amount': premiumAmount,
        'coverage_amount': coverageAmount,
      },
      (data) => PolicyResponse.fromJson(data),
      extraHeaders: {
        'Idempotency-Key': idempotencyKey,
      },
    );
  }

  @override
  Future<Envelope<List<dynamic>>> getPolicies() async {
    return _client.get(
      '/insurance/policies',
      (data) => data as List<dynamic>,
    );
  }
}

class LocalMockInsuranceRepository implements InsuranceRepository {
  @override
  Future<Envelope<QuoteResponse>> getQuote(String farmId, String crop, double areaM2) async {
    await Future.delayed(const Duration(milliseconds: 800));
    return Envelope(
      success: true,
      data: QuoteResponse(premiumAmount: 1250.0, coverageAmount: 62500.0),
      meta: EnvelopeMeta(requestId: 'req-1', timestamp: DateTime.now().toIso8601String()),
    );
  }

  @override
  Future<Envelope<PolicyResponse>> createPolicy(String farmId, double premiumAmount, double coverageAmount) async {
    await Future.delayed(const Duration(milliseconds: 1500));
    return Envelope(
      success: true,
      data: PolicyResponse(
        id: const Uuid().v4(),
        userId: 'user-1',
        farmId: farmId,
        premiumAmount: premiumAmount,
        coverageAmount: coverageAmount,
        status: 'ACTIVE',
        canonicalHash: 'mock_hash',
        txHash: '0xmock_hash',
      ),
      meta: EnvelopeMeta(requestId: 'req-2', timestamp: DateTime.now().toIso8601String()),
    );
  }

  @override
  Future<Envelope<List<dynamic>>> getPolicies() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return Envelope(
      success: true,
      data: [],
      meta: EnvelopeMeta(requestId: 'req-3', timestamp: DateTime.now().toIso8601String()),
    );
  }
}
