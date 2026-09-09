import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/envelope.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const String _envUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://agrishield-backend-cabu.onrender.com/api/v1',
  );

  final String baseUrl;
  final _storage = const FlutterSecureStorage();

  ApiClient({String? baseUrl}) : baseUrl = baseUrl ?? _envUrl;

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'access_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<Envelope<T>> get<T>(String endpoint, T Function(dynamic) fromJsonData) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(),
      );
      return _processResponse(response, fromJsonData);
    } catch (e) {
      return Envelope(success: false, error: EnvelopeError(code: 'NETWORK_ERROR', message: e.toString()));
    }
  }

  Future<Envelope<T>> post<T>(String endpoint, Map<String, dynamic> body, T Function(dynamic) fromJsonData, {Map<String, String>? extraHeaders}) async {
    try {
      final headers = await _getHeaders();
      if (extraHeaders != null) {
        headers.addAll(extraHeaders);
      }
      final response = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
        body: jsonEncode(body),
      );
      return _processResponse(response, fromJsonData);
    } catch (e) {
      return Envelope(success: false, error: EnvelopeError(code: 'NETWORK_ERROR', message: e.toString()));
    }
  }

  Future<Envelope<T>> patch<T>(String endpoint, Map<String, dynamic> body, T Function(dynamic) fromJsonData, {Map<String, String>? extraHeaders}) async {
    try {
      final headers = await _getHeaders();
      if (extraHeaders != null) {
        headers.addAll(extraHeaders);
      }
      final response = await http.patch(
        Uri.parse('$baseUrl$endpoint'),
        headers: headers,
        body: jsonEncode(body),
      );
      return _processResponse(response, fromJsonData);
    } catch (e) {
      return Envelope(success: false, error: EnvelopeError(code: 'NETWORK_ERROR', message: e.toString()));
    }
  }

  Future<Envelope<T>> uploadFile<T>(String endpoint, String filePath, T Function(dynamic) fromJsonData, {Map<String, String>? fields, String fileFieldName = 'file'}) async {
    try {
      final headers = await _getHeaders();
      var request = http.MultipartRequest('POST', Uri.parse('$baseUrl$endpoint'));
      request.headers.addAll(headers);
      
      if (fields != null) {
        request.fields.addAll(fields);
      }
      
      request.files.add(await http.MultipartFile.fromPath(fileFieldName, filePath));
      
      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);
      
      return _processResponse(response, fromJsonData);
    } catch (e) {
      return Envelope(success: false, error: EnvelopeError(code: 'NETWORK_ERROR', message: e.toString()));
    }
  }

  Envelope<T> _processResponse<T>(http.Response response, T Function(dynamic) fromJsonData) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final jsonBody = jsonDecode(response.body);
      return Envelope.fromJson(jsonBody, fromJsonData);
    } else {
      try {
        final jsonBody = jsonDecode(response.body);
        return Envelope.fromJson(jsonBody, fromJsonData); // API returns envelope on error too
      } catch (_) {
        return Envelope(
          success: false,
          error: EnvelopeError(
            code: 'HTTP_${response.statusCode}',
            message: 'Failed with status ${response.statusCode}',
          )
        );
      }
    }
  }
}
