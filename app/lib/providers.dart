import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../repositories/farm_repository.dart';
import '../api/api_client.dart';
import '../repositories/insurance_repository.dart';
import '../repositories/claim_repository.dart';

// Global state for bottom navigation index
final bottomNavIndexProvider = StateProvider<int>((ref) => 0);

// Change to ApiFarmRepository in production
final farmRepositoryProvider = Provider<FarmRepository>((ref) {
  return ApiFarmRepository(ApiClient());
});

final farmsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(farmRepositoryProvider);
  final response = await repo.getFarms();
  if (response.success && response.data != null) {
    return response.data!;
  } else {
    throw Exception(response.error?.message ?? "Failed to load farms");
  }
});

final userProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ApiClient();
  final response = await client.get<Map<String, dynamic>>('/auth/me', (json) => json as Map<String, dynamic>);
  if (response.success && response.data != null) {
    return response.data!;
  } else {
    throw Exception(response.error?.message ?? "Failed to load profile");
  }
});

final weatherProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = ApiClient();
  // Default coordinates centered on Madhya Pradesh (Bhopal / Central MP)
  final response = await client.get<Map<String, dynamic>>('/weather?lat=23.2599&lon=77.4126', (json) => json as Map<String, dynamic>);
  if (response.success && response.data != null) {
    return response.data!;
  } else {
    return {
      "temp": 26.5,
      "temperature_celsius": 26.5,
      "wind_speed_kmh": 14.0,
      "condition": "Partly Cloudy",
      "humidity": 62,
    };
  }
});

final insuranceRepositoryProvider = Provider<InsuranceRepository>((ref) {
  // Change to ApiInsuranceRepository in production
  return ApiInsuranceRepository();
});

final claimRepositoryProvider = Provider<ClaimRepository>((ref) {
  // Change to ApiClaimRepository in production
  return ApiClaimRepository();
});

final claimsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final client = ApiClient();
  final response = await client.get<List<dynamic>>('/claims', (json) => json as List<dynamic>);
  if (response.success && response.data != null) {
    return response.data!.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
  return [];
});
