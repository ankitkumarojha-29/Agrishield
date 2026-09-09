import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../theme.dart';
import '../../api/api_client.dart';

class SoilReportScreen extends StatefulWidget {
  final String? farmId;
  const SoilReportScreen({super.key, this.farmId});

  @override
  State<SoilReportScreen> createState() => _SoilReportScreenState();
}

class _SoilReportScreenState extends State<SoilReportScreen> {
  final ApiClient _apiClient = ApiClient();
  final ImagePicker _picker = ImagePicker();

  bool _isUploading = false;
  File? _selectedFile;
  Map<String, dynamic>? _soilResult;

  // Default values until an OCR card is scanned
  double _n = 45.0;
  double _p = 22.0;
  double _k = 180.0;
  double _ph = 6.8;
  double _confidence = 0.85;
  String _modelVersion = 'soil-ocr-v1.0';
  String _dataSource = 'Regional Soil Health baseline';
  String _extractedText = 'Upload a Soil Health Card or photo of soil test report for instant OCR nutrient extraction.';
  String _recommendedCrop = 'Mustard / Wheat';
  String _cropAdvice = 'Balanced NPK ratio. Tolerates neutral to slightly alkaline soil.';

  Future<void> _pickAndAnalyze(ImageSource source) async {
    try {
      final XFile? picked = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 88,
      );
      if (picked == null) return;

      setState(() {
        _selectedFile = File(picked.path);
        _isUploading = true;
      });

      String? targetFarmId = widget.farmId;
      if (targetFarmId == null || targetFarmId.isEmpty) {
        final farmsRes = await _apiClient.get<List<dynamic>>(
          '/farms',
          (json) => json as List<dynamic>,
        );
        if (farmsRes.success && farmsRes.data != null && farmsRes.data!.isNotEmpty) {
          targetFarmId = farmsRes.data!.first['id']?.toString();
        }
      }

      if (targetFarmId == null || targetFarmId.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please register or select a farm first')),
          );
          setState(() => _isUploading = false);
        }
        return;
      }

      final res = await _apiClient.uploadFile<Map<String, dynamic>>(
        '/farms/$targetFarmId/soil/analyze',
        _selectedFile!.path,
        (json) => json as Map<String, dynamic>,
        fileFieldName: 'file',
      );

      if (mounted) {
        setState(() => _isUploading = false);
        if (res.success && res.data != null) {
          final data = res.data!;
          final nVal = (data['N'] is num) ? (data['N'] as num).toDouble() : 45.0;
          final pVal = (data['P'] is num) ? (data['P'] as num).toDouble() : 22.0;
          final kVal = (data['K'] is num) ? (data['K'] as num).toDouble() : 180.0;
          final phVal = (data['pH'] is num) ? (data['pH'] as num).toDouble() : 6.8;
          final conf = (data['confidence'] is num) ? (data['confidence'] as num).toDouble() : 0.85;
          final model = data['model_version']?.toString() ?? 'soil-ocr-v1.0';
          final text = data['extracted_text']?.toString() ?? '';

          setState(() {
            _soilResult = data;
            _n = nVal;
            _p = pVal;
            _k = kVal;
            _ph = phVal;
            _confidence = conf;
            _modelVersion = model;
            _dataSource = 'Live Soil Health Card OCR ($model)';
            _extractedText = text.isNotEmpty ? text : 'OCR scanned nutrients successfully.';
            
            // Dynamic crop recommendation based on NPK & pH
            if (_ph < 6.0) {
              _recommendedCrop = 'Tea / Potato / Rice';
              _cropAdvice = 'Acidic soil. Apply agricultural lime to raise pH for wheat/pulses.';
            } else if (_ph > 7.8) {
              _recommendedCrop = 'Barley / Mustard / Cotton';
              _cropAdvice = 'Alkaline soil. High potassium tolerance, supplement zinc and phosphorus.';
            } else if (_n > 50) {
              _recommendedCrop = 'Maize / Sugarcane / Cotton';
              _cropAdvice = 'High nitrogen fertility. Excellent vegetative vigor expected.';
            } else {
              _recommendedCrop = 'Wheat / Gram / Soybean';
              _cropAdvice = 'Optimal neutral pH (6.5–7.2). Standard NPK starter dosage recommended.';
            }
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text('OCR analysis complete (${(conf * 100).toInt()}% confidence)'),
                ],
              ),
              backgroundColor: AgriShieldTheme.primary,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res.error?.message ?? 'Soil report analysis failed'),
              backgroundColor: AgriShieldTheme.error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AgriShieldTheme.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final confPct = (_confidence * 100).toInt();

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: AppBar(
              backgroundColor: AgriShieldTheme.surface.withValues(alpha: 0.8),
              elevation: 0,
              iconTheme: const IconThemeData(color: AgriShieldTheme.onSurface),
              title: const Text(
                'Soil Health Card & OCR',
                style: TextStyle(color: AgriShieldTheme.onSurface, fontWeight: FontWeight.w600, fontSize: 18),
              ),
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Upload Section
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AgriShieldTheme.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
              ),
              child: Column(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(color: AgriShieldTheme.primaryContainer, shape: BoxShape.circle),
                    child: _isUploading
                        ? const Padding(
                            padding: EdgeInsets.all(16.0),
                            child: CircularProgressIndicator(strokeWidth: 3, color: AgriShieldTheme.primary),
                          )
                        : const Icon(Icons.document_scanner, color: AgriShieldTheme.onPrimaryContainer, size: 32),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _isUploading ? 'Analyzing Soil Report...' : 'Upload Soil Health Card',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _isUploading
                        ? 'Extracting N, P, K & pH values using EasyOCR pipeline...'
                        : 'Take a photo or upload an image of your govt Soil Health Card for instant OCR extraction.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AgriShieldTheme.onSurfaceVariant),
                  ),
                  if (_selectedFile != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.image, size: 16, color: AgriShieldTheme.primary),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            _selectedFile!.path.split(Platform.pathSeparator).last,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AgriShieldTheme.primary),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _isUploading ? null : () => _pickAndAnalyze(ImageSource.camera),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.camera_alt, color: AgriShieldTheme.primary, size: 26),
                              SizedBox(height: 6),
                              Text('Camera', style: TextStyle(color: AgriShieldTheme.onSurface, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _isUploading ? null : () => _pickAndAnalyze(ImageSource.gallery),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Column(
                            children: [
                              Icon(Icons.photo_library, color: AgriShieldTheme.secondary, size: 26),
                              SizedBox(height: 6),
                              Text('Gallery / File', style: TextStyle(color: AgriShieldTheme.onSurface, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            
            // Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Text('Nutrient Analysis', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(width: 8),
                    Icon(
                      _soilResult != null ? Icons.verified : Icons.info_outline,
                      color: _soilResult != null ? AgriShieldTheme.primary : AgriShieldTheme.onSurfaceVariant,
                      size: 18,
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _soilResult != null ? AgriShieldTheme.primaryContainer : AgriShieldTheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _soilResult != null ? Icons.auto_awesome : Icons.history,
                        size: 14,
                        color: _soilResult != null ? AgriShieldTheme.onPrimaryContainer : AgriShieldTheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _soilResult != null ? '$confPct% Confidence' : 'Baseline',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _soilResult != null ? AgriShieldTheme.onPrimaryContainer : AgriShieldTheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Results Dashboard
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AgriShieldTheme.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(color: AgriShieldTheme.primaryContainer.withValues(alpha: 0.1), blurRadius: 12)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AgriShieldTheme.tertiaryFixed, borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.policy, color: AgriShieldTheme.onTertiaryFixed),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'DATA SOURCE • $_modelVersion',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AgriShieldTheme.onTertiaryFixed),
                              ),
                              const SizedBox(height: 2),
                              Text(_dataSource, style: const TextStyle(fontSize: 13, color: AgriShieldTheme.onTertiaryFixed)),
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // OCR Text Snippet if available
                  if (_extractedText.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.receipt_long, size: 16, color: AgriShieldTheme.onSurfaceVariant),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _extractedText,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AgriShieldTheme.onSurfaceVariant),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    childAspectRatio: 0.85,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    children: [
                      _buildGauge(
                        'Nitrogen (N)',
                        _n.toStringAsFixed(0),
                        'kg/ha',
                        _n < 30 ? 'Low' : (_n < 60 ? 'Optimal' : 'High'),
                        _n < 30 ? AgriShieldTheme.error : AgriShieldTheme.primary,
                        (_n / 100.0).clamp(0.05, 1.0),
                      ),
                      _buildGauge(
                        'Phosphorus (P)',
                        _p.toStringAsFixed(1),
                        'kg/ha',
                        _p < 15 ? 'Low' : (_p < 30 ? 'Optimal' : 'High'),
                        _p < 15 ? AgriShieldTheme.error : AgriShieldTheme.primary,
                        (_p / 50.0).clamp(0.05, 1.0),
                      ),
                      _buildGauge(
                        'Potassium (K)',
                        _k.toStringAsFixed(0),
                        'kg/ha',
                        _k < 120 ? 'Low' : (_k < 250 ? 'Optimal' : 'High'),
                        _k < 120 ? AgriShieldTheme.error : AgriShieldTheme.primary,
                        (_k / 300.0).clamp(0.05, 1.0),
                      ),
                      _buildGauge(
                        'Soil pH',
                        _ph.toStringAsFixed(1),
                        'Scale',
                        _ph < 6.5 ? 'Acidic' : (_ph <= 7.5 ? 'Neutral' : 'Alkaline'),
                        _ph >= 6.0 && _ph <= 7.5 ? AgriShieldTheme.primary : AgriShieldTheme.secondary,
                        ((_ph - 4.0) / 6.0).clamp(0.05, 1.0),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Recommendation Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AgriShieldTheme.primaryContainer,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: AgriShieldTheme.surface,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(Icons.eco, color: AgriShieldTheme.primary, size: 28),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'RECOMMENDED CROP & ADVISORY',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AgriShieldTheme.onPrimaryContainer, letterSpacing: 1),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _recommendedCrop,
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AgriShieldTheme.onPrimaryContainer),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(color: Colors.white24),
                  const SizedBox(height: 10),
                  Text(
                    _cropAdvice,
                    style: const TextStyle(fontSize: 14, color: AgriShieldTheme.onPrimaryContainer, height: 1.3),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGauge(String title, String value, String unit, String status, Color color, double progress) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          width: 78,
          height: 78,
          child: Stack(
            fit: StackFit.expand,
            children: [
              CircularProgressIndicator(value: progress, strokeWidth: 8, color: color, backgroundColor: AgriShieldTheme.surfaceVariant),
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
                    Text(unit, style: const TextStyle(fontSize: 10, color: AgriShieldTheme.onSurfaceVariant)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
          child: Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
        ),
      ],
    );
  }
}
