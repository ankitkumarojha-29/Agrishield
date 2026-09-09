class QuoteResponse {
  final double premiumAmount;
  final double coverageAmount;

  QuoteResponse({required this.premiumAmount, required this.coverageAmount});

  factory QuoteResponse.fromJson(Map<String, dynamic> json) {
    return QuoteResponse(
      premiumAmount: (json['premium_amount'] as num).toDouble(),
      coverageAmount: (json['coverage_amount'] as num).toDouble(),
    );
  }
}

class PolicyResponse {
  final String id;
  final String userId;
  final String farmId;
  final double premiumAmount;
  final double coverageAmount;
  final String? canonicalHash;
  final String? txHash;
  final String status;

  PolicyResponse({
    required this.id,
    required this.userId,
    required this.farmId,
    required this.premiumAmount,
    required this.coverageAmount,
    this.canonicalHash,
    this.txHash,
    required this.status,
  });

  factory PolicyResponse.fromJson(Map<String, dynamic> json) {
    return PolicyResponse(
      id: json['id'],
      userId: json['user_id'],
      farmId: json['farm_id'],
      premiumAmount: (json['premium_amount'] as num).toDouble(),
      coverageAmount: (json['coverage_amount'] as num).toDouble(),
      canonicalHash: json['canonical_hash'],
      txHash: json['tx_hash'],
      status: json['status'],
    );
  }
}

class VerificationResponse {
  final String? canonicalHash;
  final String? txHash;
  final String status;

  VerificationResponse({
    this.canonicalHash,
    this.txHash,
    required this.status,
  });

  factory VerificationResponse.fromJson(Map<String, dynamic> json) {
    return VerificationResponse(
      canonicalHash: json['canonical_hash'],
      txHash: json['tx_hash'],
      status: json['status'],
    );
  }
}
