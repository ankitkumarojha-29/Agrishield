class EnvelopeError {
  final String code;
  final String message;
  final Map<String, dynamic>? details;

  EnvelopeError({required this.code, required this.message, this.details});

  factory EnvelopeError.fromJson(Map<String, dynamic> json) {
    return EnvelopeError(
      code: json['code'] ?? 'UNKNOWN',
      message: json['message'] ?? 'Unknown error',
      details: json['details'] as Map<String, dynamic>?,
    );
  }
}

class EnvelopeMeta {
  final String requestId;
  final String timestamp;

  EnvelopeMeta({required this.requestId, required this.timestamp});
  
  factory EnvelopeMeta.fromJson(Map<String, dynamic> json) {
    return EnvelopeMeta(
      requestId: json['request_id'] ?? '',
      timestamp: json['timestamp'] ?? '',
    );
  }
}

class Envelope<T> {
  final bool success;
  final T? data;
  final EnvelopeMeta? meta;
  final EnvelopeError? error;

  Envelope({required this.success, this.data, this.meta, this.error});

  factory Envelope.fromJson(Map<String, dynamic> json, T Function(dynamic) fromJsonData) {
    return Envelope(
      success: json['success'] ?? false,
      data: json['success'] == true && json['data'] != null ? fromJsonData(json['data']) : null,
      meta: json['meta'] != null ? EnvelopeMeta.fromJson(json['meta']) : null,
      error: json['error'] != null ? EnvelopeError.fromJson(json['error']) : null,
    );
  }
}
