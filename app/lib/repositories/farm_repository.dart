import '../api/api_client.dart';
import '../models/envelope.dart';

import 'offline_queue.dart';

abstract class FarmRepository {
  Future<Envelope<List<Map<String, dynamic>>>> getFarms();
  Future<Envelope<Map<String, dynamic>>> createFarm(Map<String, dynamic> data);
}

class ApiFarmRepository implements FarmRepository {
  final ApiClient client;

  ApiFarmRepository(this.client);

  @override
  Future<Envelope<List<Map<String, dynamic>>>> getFarms() {
    return client.get('/farms', (data) => List<Map<String, dynamic>>.from(data));
  }

  @override
  Future<Envelope<Map<String, dynamic>>> createFarm(Map<String, dynamic> data) async {
    final response = await client.post('/farms', data, (data) => data as Map<String, dynamic>);
    
    // If network error, add to offline queue
    if (!response.success && response.error?.code == 'NETWORK_ERROR') {
      final queue = OfflineQueue();
      await queue.enqueue('POST_FARM', data);
      return Envelope(
        success: true,
        data: data..addAll({'status': 'PENDING_SYNC', 'id': 'temp_${DateTime.now().millisecondsSinceEpoch}'}),
        meta: EnvelopeMeta(requestId: 'offline', timestamp: DateTime.now().toIso8601String()),
      );
    }
    return response;
  }
}

class LocalMockFarmRepository implements FarmRepository {
  @override
  Future<Envelope<List<Map<String, dynamic>>>> getFarms() async {
    await Future.delayed(const Duration(seconds: 1));
    return Envelope(
      success: true,
      data: [
        {
          "id": "123",
          "name": "North Field",
          "crop": "Wheat",
          "status": "VERIFIED",
        }
      ],
    );
  }

  @override
  Future<Envelope<Map<String, dynamic>>> createFarm(Map<String, dynamic> data) async {
    await Future.delayed(const Duration(seconds: 1));
    return Envelope(
      success: true,
      data: {"farm_id": "456", "area_m2": 5000.0},
    );
  }
}
