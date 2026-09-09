import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'dart:convert';
import 'package:uuid/uuid.dart';

class OfflineQueueItem {
  final String localId;
  final String operation;
  final Map<String, dynamic> payload;
  final String idempotencyKey;
  final int retryCount;
  final String status;

  OfflineQueueItem({
    required this.localId,
    required this.operation,
    required this.payload,
    required this.idempotencyKey,
    this.retryCount = 0,
    this.status = 'PENDING',
  });

  Map<String, dynamic> toMap() {
    return {
      'local_id': localId,
      'operation': operation,
      'payload': jsonEncode(payload),
      'idempotency_key': idempotencyKey,
      'retry_count': retryCount,
      'status': status,
    };
  }

  factory OfflineQueueItem.fromMap(Map<String, dynamic> map) {
    return OfflineQueueItem(
      localId: map['local_id'],
      operation: map['operation'],
      payload: jsonDecode(map['payload']),
      idempotencyKey: map['idempotency_key'],
      retryCount: map['retry_count'],
      status: map['status'],
    );
  }
}

class OfflineQueue {
  Database? _db;
  final Uuid _uuid = const Uuid();

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDB();
    return _db!;
  }

  Future<Database> _initDB() async {
    String path = join(await getDatabasesPath(), 'agrishield_offline.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE queue(
            local_id TEXT PRIMARY KEY,
            operation TEXT,
            payload TEXT,
            idempotency_key TEXT,
            retry_count INTEGER,
            status TEXT
          )
        ''');
      },
    );
  }

  Future<void> enqueue(String operation, Map<String, dynamic> payload) async {
    final db = await database;
    final item = OfflineQueueItem(
      localId: _uuid.v4(),
      operation: operation,
      payload: payload,
      idempotencyKey: _uuid.v4(),
    );
    await db.insert('queue', item.toMap());
  }

  Future<List<OfflineQueueItem>> getPending() async {
    final db = await database;
    final maps = await db.query('queue', where: 'status = ?', whereArgs: ['PENDING']);
    return maps.map((e) => OfflineQueueItem.fromMap(e)).toList();
  }

  Future<void> markComplete(String localId) async {
    final db = await database;
    await db.update('queue', {'status': 'COMPLETED'}, where: 'local_id = ?', whereArgs: [localId]);
  }
}
