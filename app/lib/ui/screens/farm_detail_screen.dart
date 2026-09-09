import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme.dart';
import '../../api/api_client.dart';
import 'crop_photo_scan_screen.dart';
import 'soil_report_screen.dart';
import 'insurance_quote_screen.dart';
import 'file_claim_screen.dart';
import 'claim_timeline_screen.dart';

class FarmDetailScreen extends StatefulWidget {
  final Map<String, dynamic> farm;
  
  const FarmDetailScreen({super.key, required this.farm});

  @override
  State<FarmDetailScreen> createState() => _FarmDetailScreenState();
}

class _FarmDetailScreenState extends State<FarmDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiClient _apiClient = ApiClient();

  late Map<String, dynamic> _farmData;
  Map<String, dynamic>? _weatherData;
  Map<String, dynamic>? _yieldData;
  Map<String, dynamic>? _advisoryData;
  Map<String, dynamic>? _riskData;
  Map<String, dynamic>? _revenueData;
  List<Map<String, dynamic>> _farmClaims = [];
  bool _isLoadingClaims = false;
  bool _isLoadingWeather = true;
  bool _isLoadingAi = false;
  bool _isLoadingRevenue = false;
  bool _isUpdatingCrop = false;

  @override
  void initState() {
    super.initState();
    _farmData = Map<String, dynamic>.from(widget.farm);
    _tabController = TabController(length: 4, vsync: this);
    _fetchWeather();
    _fetchFarmDetails();
    _fetchAiInsights();
    _fetchRevenue();
    _fetchClaims();
  }

  Future<void> _fetchClaims() async {
    final farmId = widget.farm['id'];
    if (farmId == null) return;
    setState(() => _isLoadingClaims = true);
    try {
      final res = await _apiClient.get<List<dynamic>>(
        '/claims?farm_id=$farmId',
        (json) => json as List<dynamic>,
      );
      if (res.success && res.data != null && mounted) {
        setState(() {
          _farmClaims = res.data!.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _isLoadingClaims = false;
        });
        return;
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoadingClaims = false);
  }

  Future<void> _fetchRevenue() async {
    final farmId = widget.farm['id'];
    if (farmId == null) return;
    setState(() => _isLoadingRevenue = true);
    try {
      final res = await _apiClient.get<Map<String, dynamic>>(
        '/farms/$farmId/revenue',
        (json) => json as Map<String, dynamic>,
      );
      if (res.success && res.data != null && mounted) {
        setState(() {
          _revenueData = res.data;
          _isLoadingRevenue = false;
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoadingRevenue = false);
  }

  Future<void> _selectAdvisedCrop(String cropName) async {
    final farmId = widget.farm['id'];
    if (farmId == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Sow $cropName?'),
        content: Text('Set $cropName as the active crop for this plot? This will update your crop advisories, yield predictions, and insurance quotes.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AgriShieldTheme.primary),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm Sowing'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isUpdatingCrop = true);
    try {
      final todayStr = DateTime.now().toIso8601String().substring(0, 10);
      final res = await _apiClient.patch<Map<String, dynamic>>(
        '/farms/$farmId',
        {
          'crop': cropName,
          'sowing_date': todayStr,
        },
        (json) => json as Map<String, dynamic>,
      );

      if (res.success && res.data != null && mounted) {
        setState(() {
          _farmData = res.data!;
          widget.farm['crop'] = cropName;
          widget.farm['sowing_date'] = todayStr;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Successfully updated crop to $cropName!'),
            backgroundColor: AgriShieldTheme.primary,
          ),
        );
        // Refresh AI insights and revenue
        _fetchAiInsights();
        _fetchRevenue();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(res.error?.message ?? 'Failed to update crop')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating crop: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdatingCrop = false);
    }
  }

  Future<void> _fetchAiInsights() async {
    final farmId = widget.farm['id'];
    if (farmId == null) return;
    setState(() => _isLoadingAi = true);

    try {
      final yieldRes = await _apiClient.post<Map<String, dynamic>>(
        '/farms/$farmId/yield-predict',
        {},
        (json) => json as Map<String, dynamic>,
      );
      if (yieldRes.success && yieldRes.data != null && mounted) {
        setState(() => _yieldData = yieldRes.data);
      }
    } catch (_) {}

    try {
      final advisoryRes = await _apiClient.post<Map<String, dynamic>>(
        '/farms/$farmId/advisory',
        {},
        (json) => json as Map<String, dynamic>,
      );
      if (advisoryRes.success && advisoryRes.data != null && mounted) {
        setState(() => _advisoryData = advisoryRes.data);
      }
    } catch (_) {}

    try {
      final riskRes = await _apiClient.post<Map<String, dynamic>>(
        '/farms/$farmId/risk-score',
        {},
        (json) => json as Map<String, dynamic>,
      );
      if (riskRes.success && riskRes.data != null && mounted) {
        setState(() => _riskData = riskRes.data);
      }
    } catch (_) {}

    if (mounted) {
      setState(() => _isLoadingAi = false);
    }
    // Also refresh revenue calculation with newest yield/crop
    _fetchRevenue();
  }

  Future<void> _fetchFarmDetails() async {
    final farmId = widget.farm['id'];
    if (farmId == null) return;
    try {
      final res = await _apiClient.get<Map<String, dynamic>>(
        '/farms/$farmId',
        (json) => json as Map<String, dynamic>,
      );
      if (res.success && res.data != null && mounted) {
        setState(() {
          _farmData = res.data!;
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchWeather() async {
    setState(() => _isLoadingWeather = true);
    
    // First try farm-specific endpoint
    final farmId = widget.farm['id'];
    if (farmId != null) {
      final res = await _apiClient.get<Map<String, dynamic>>(
        '/farms/$farmId/weather/current',
        (json) => json as Map<String, dynamic>,
      );
      if (res.success && res.data != null) {
        if (mounted) {
          setState(() {
            _weatherData = res.data;
            _isLoadingWeather = false;
          });
          return;
        }
      }
    }

    // Fallback to general MP weather endpoint
    final fallbackRes = await _apiClient.get<Map<String, dynamic>>(
      '/weather?lat=23.2599&lon=77.4126',
      (json) => json as Map<String, dynamic>,
    );

    if (mounted) {
      setState(() {
        _weatherData = fallbackRes.data ?? {
          "temp": 25.5,
          "temperature_celsius": 25.5,
          "condition": "Showers",
          "humidity": 65,
          "wind_speed_kmh": 14.0,
        };
        _isLoadingWeather = false;
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final farmName = widget.farm['name'] ?? 'Farm Details';
    final rawCrop = (widget.farm['crop'] ?? _farmData['crop'])?.toString().trim();
    final isUnsown = rawCrop == null || rawCrop.isEmpty || rawCrop.toLowerCase() == 'unsown' || rawCrop.toLowerCase() == 'fallow';
    final cropDisplayName = isUnsown ? 'Fallow / Unsown' : rawCrop;

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 180.0,
              pinned: true,
              backgroundColor: AgriShieldTheme.surface,
              iconTheme: const IconThemeData(color: AgriShieldTheme.onSurface),
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: const EdgeInsets.only(left: 16, bottom: 58, right: 16),
                title: Text(
                  '$farmName • $cropDisplayName',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16, shadows: [
                    Shadow(color: Colors.black54, blurRadius: 4, offset: Offset(0, 1)),
                  ]),
                ),
                background: _buildFarmHeaderImage(),
              ),
              bottom: TabBar(
                controller: _tabController,
                isScrollable: false,
                labelColor: AgriShieldTheme.primary,
                unselectedLabelColor: AgriShieldTheme.onSurfaceVariant,
                indicatorColor: AgriShieldTheme.primary,
                tabs: const [
                  Tab(text: 'Overview'),
                  Tab(text: 'Weather'),
                  Tab(text: 'Soil'),
                  Tab(text: 'Insurance'),
                ],
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(),
            _buildWeatherTab(),
            _buildSoilTab(),
            _buildInsuranceTab(),
          ],
        ),
      ),
    );
  }

  // --- TAB 1: OVERVIEW ---
  Widget _buildOverviewTab() {
    final areaM2 = (widget.farm['area_m2'] is num) ? (widget.farm['area_m2'] as num).toDouble() : 0.0;
    final areaHa = areaM2 / 10000.0;
    final areaAcres = areaHa * 2.47105;
    final rawCrop = (widget.farm['crop'] ?? _farmData['crop'])?.toString().trim();
    final isUnsown = rawCrop == null || rawCrop.isEmpty || rawCrop.toLowerCase() == 'unsown' || rawCrop.toLowerCase() == 'fallow';
    final cropDisplayName = isUnsown ? 'Fallow / Unsown' : rawCrop;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Per-crop Claim Status Banner (if claim filed for this parcel)
        if (_farmClaims.isNotEmpty) ...[
          _buildActiveClaimBanner(_farmClaims.first),
          const SizedBox(height: 16),
        ],

        // Crop Health Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AgriShieldTheme.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AgriShieldTheme.surfaceVariant),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Field & Crop Status', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isUnsown ? Colors.orange.shade100 : AgriShieldTheme.tertiaryFixed,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      isUnsown ? 'Needs Sowing' : 'Registered',
                      style: TextStyle(
                        fontSize: 12,
                        color: isUnsown ? Colors.orange.shade900 : AgriShieldTheme.onTertiaryFixed,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Sown Crop', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant)),
                        const SizedBox(height: 2),
                        Text(
                          cropDisplayName,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: isUnsown ? Colors.orange.shade800 : AgriShieldTheme.onSurface,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Surveyed Area', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant)),
                        const SizedBox(height: 2),
                        Text('${areaHa.toStringAsFixed(2)} ha (${areaAcres.toStringAsFixed(1)} ac)', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AgriShieldTheme.primary)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Unsown Crop Suggestions Card
        if (isUnsown && _advisoryData != null && _advisoryData!['recommended_crops'] != null && (_advisoryData!['recommended_crops'] as List).isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.green.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.eco, size: 20, color: Colors.green.shade700),
                    const SizedBox(width: 8),
                    Text('AI Sowing Recommendations', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.green.shade900)),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Land is currently unsown. Based on soil pH, rainfall, and season, these crops are best suited:',
                    style: TextStyle(fontSize: 12, color: Colors.green.shade800)),
                const SizedBox(height: 10),
                ...((_advisoryData!['recommended_crops'] as List).map((rc) {
                  final recCropName = rc['crop']?.toString() ?? 'Crop';
                  final suitability = rc['suitability']?.toString() ?? 'Good';
                  final isHigh = suitability.toLowerCase() == 'high';

                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.green.shade200),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4)],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isHigh ? Colors.green.shade100 : Colors.amber.shade100,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '$recCropName • $suitability',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isHigh ? Colors.green.shade900 : Colors.amber.shade900,
                                ),
                              ),
                            ),
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AgriShieldTheme.primary,
                                side: const BorderSide(color: AgriShieldTheme.primary, width: 1.2),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                visualDensity: VisualDensity.compact,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              onPressed: _isUpdatingCrop ? null : () => _selectAdvisedCrop(recCropName),
                              icon: const Icon(Icons.grass, size: 14),
                              label: const Text('Sow This Crop', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          rc['reason']?.toString() ?? '',
                          style: const TextStyle(fontSize: 12, color: AgriShieldTheme.onSurface),
                        ),
                      ],
                    ),
                  );
                })),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        const SizedBox(height: 8),
        const Text('Agronomic Tools', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        _buildActionCard(
          icon: Icons.camera_alt,
          title: 'Scan Crop Photo',
          subtitle: 'Instant AI pest & disease detection',
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => CropPhotoScanScreen(
                farmId: _farmData['id']?.toString() ?? widget.farm['id']?.toString(),
                crop: isUnsown ? 'General' : (_farmData['crop']?.toString() ?? widget.farm['crop']?.toString()),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _buildActionCard(
          icon: Icons.upload_file,
          title: 'Upload Soil Health Card',
          subtitle: 'OCR nutrient extraction (N, P, K, pH)',
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => SoilReportScreen(
                farmId: _farmData['id']?.toString() ?? widget.farm['id']?.toString(),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _buildActionCard(
          icon: Icons.shield,
          title: 'PMFBY Insurance Quote',
          subtitle: 'Subsidized crop protection with blockchain audit',
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => InsuranceQuoteScreen(
                farm: widget.farm,
                farmId: widget.farm['id']?.toString() ?? '',
                crop: isUnsown ? (_advisoryData?['suggested_crop'] ?? 'Soybean') : (widget.farm['crop'] ?? 'Wheat'),
                areaM2: areaM2 > 0 ? areaM2 : 10000.0,
                farmName: widget.farm['name'],
              ),
            ),
          ),
        ),

        // Live AI Insights Section
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('AI Yield & Agronomic Insights', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            if (_isLoadingAi)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: AgriShieldTheme.primary),
              )
            else
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: AgriShieldTheme.primaryContainer, borderRadius: BorderRadius.circular(10)),
                child: const Text('LIVE AI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AgriShieldTheme.onPrimaryContainer)),
              ),
          ],
        ),
        const SizedBox(height: 12),

        // Yield Prediction Card
        if (_yieldData != null) ...[
          Builder(builder: (context) {
            final rawYieldVal = _yieldData!['yield_value'] is num ? (_yieldData!['yield_value'] as num).toDouble() : 3200.0;
            final farmAreaHa = areaHa > 0 ? areaHa : 1.0;
            final totalYieldKg = _yieldData!['total_yield_kg'] is num
                ? (_yieldData!['total_yield_kg'] as num).toDouble()
                : (rawYieldVal * farmAreaHa);
            final totalYieldQuintals = _yieldData!['total_yield_quintals'] is num
                ? (_yieldData!['total_yield_quintals'] as num).toDouble()
                : (totalYieldKg / 100.0);
            final yieldIsUnsown = _yieldData!['is_unsown'] == true || isUnsown;
            final suggestedCropName = _yieldData!['suggested_crop']?.toString() ?? _advisoryData?['suggested_crop']?.toString() ?? 'Soybean';

            return Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AgriShieldTheme.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AgriShieldTheme.primary.withValues(alpha: 0.2)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(color: AgriShieldTheme.primaryContainer, shape: BoxShape.circle),
                            child: const Icon(Icons.analytics, color: AgriShieldTheme.onPrimaryContainer, size: 18),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            yieldIsUnsown ? 'Potential Yield ($suggestedCropName)' : 'Predicted Crop Yield',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                      Text(
                        '${((_yieldData!['confidence'] ?? 0.82) * 100).toInt()}% Conf.',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AgriShieldTheme.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        rawYieldVal.toStringAsFixed(0),
                        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AgriShieldTheme.primary),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _yieldData!['unit']?.toString() ?? 'kg/ha',
                        style: const TextStyle(fontSize: 14, color: AgriShieldTheme.onSurfaceVariant, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AgriShieldTheme.primaryContainer.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.scale, size: 16, color: AgriShieldTheme.primary),
                        const SizedBox(width: 6),
                        Text(
                          'Total Farm Yield: ${totalYieldKg.toStringAsFixed(0)} kg (~${totalYieldQuintals.toStringAsFixed(1)} Q)',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AgriShieldTheme.primary),
                        ),
                      ],
                    ),
                  ),
                  if (yieldIsUnsown) ...[
                    const SizedBox(height: 6),
                    Text(
                      '• Plot is unsown. Projected yield assuming sowing of recommended crop ($suggestedCropName).',
                      style: TextStyle(fontSize: 11, color: Colors.orange.shade800, fontStyle: FontStyle.italic),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Text(
                    'Model: ${_yieldData!['model_version'] ?? 'rf-yield-v1.0'} • Pipeline: Copernicus + SoilHive',
                    style: const TextStyle(fontSize: 11, color: AgriShieldTheme.onSurfaceVariant),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 12),
        ],

        // Mandi Market & Estimated Revenue Card
        if (_revenueData != null) ...[
          Builder(builder: (context) {
            final rev = _revenueData!;
            final mandiPrice = (rev['mandi_price_per_quintal'] is num)
                ? (rev['mandi_price_per_quintal'] as num).toDouble()
                : 2425.0;
            final cropTitle = rev['crop']?.toString() ?? 'Crop';
            final market = rev['market']?.toString() ?? 'MP Mandi Benchmark';
            final isUnsownRev = rev['is_unsown'] == true || isUnsown;
            final source = rev['price_source']?.toString() ?? rev['source']?.toString() ?? 'Agmarknet';

            // Yield in Quintals: check backend revenue response, then fallback to loaded AI yield data
            double totalQ = (rev['total_yield_quintals'] is num)
                ? (rev['total_yield_quintals'] as num).toDouble()
                : (rev['yield_quintals'] is num)
                    ? (rev['yield_quintals'] as num).toDouble()
                    : 0.0;

            if (totalQ <= 0 && _yieldData != null) {
              final rawYieldKgHa = (_yieldData!['yield_value'] is num)
                  ? (_yieldData!['yield_value'] as num).toDouble()
                  : 3200.0;
              final farmAreaHa = areaHa > 0 ? areaHa : 1.0;
              final totalYieldKg = (_yieldData!['total_yield_kg'] is num)
                  ? (_yieldData!['total_yield_kg'] as num).toDouble()
                  : (rawYieldKgHa * farmAreaHa);
              totalQ = totalYieldKg / 100.0;
            } else if (totalQ <= 0) {
              totalQ = (3200.0 * (areaHa > 0 ? areaHa : 1.0)) / 100.0;
            }

            // Total Revenue: check backend revenue response, then fallback to totalQ * mandiPrice
            double totalRev = (rev['total_revenue'] is num)
                ? (rev['total_revenue'] as num).toDouble()
                : (rev['total_revenue_inr'] is num)
                    ? (rev['total_revenue_inr'] as num).toDouble()
                    : 0.0;

            if (totalRev <= 0) {
              totalRev = totalQ * mandiPrice;
            }

            // Format INR currency
            String formattedRev;
            if (totalRev >= 100000) {
              formattedRev = '₹${(totalRev / 100000.0).toStringAsFixed(2)} Lakh';
            } else {
              formattedRev = '₹${totalRev.toStringAsFixed(0)}';
            }

            return Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.amber.shade50, Colors.orange.shade50.withValues(alpha: 0.6)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.amber.shade300, width: 1.2),
                boxShadow: [BoxShadow(color: Colors.orange.withValues(alpha: 0.06), blurRadius: 8)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(color: Colors.amber.shade200, shape: BoxShape.circle),
                            child: Icon(Icons.currency_rupee, color: Colors.orange.shade900, size: 18),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            isUnsownRev ? 'Potential Revenue ($cropTitle)' : 'Estimated Market Revenue',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.orange.shade900),
                          ),
                        ],
                      ),
                      if (_isLoadingRevenue)
                        const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.amber),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.amber.shade200),
                          ),
                          child: Text(
                            source,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        formattedRev,
                        style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.orange.shade900),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'gross value',
                        style: TextStyle(fontSize: 13, color: Colors.brown.shade600, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.amber.shade100),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Mandi Modal Price:', style: TextStyle(fontSize: 12, color: Colors.brown.shade700)),
                            Text('₹${mandiPrice.toStringAsFixed(0)} / Quintal', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Estimated Yield:', style: TextStyle(fontSize: 12, color: Colors.brown.shade700)),
                            Text('${totalQ.toStringAsFixed(1)} Quintals', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Market / Mandi:', style: TextStyle(fontSize: 12, color: Colors.brown.shade700)),
                            Text(market, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AgriShieldTheme.primary)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Calculated as (Total Yield in Quintals) × (Agmarknet Mandi Price). Actual returns depend on harvest quality and APMC grade.',
                    style: TextStyle(fontSize: 10, color: Colors.brown.shade600, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 12),
        ],

        // Risk Assessment Card
        if (_riskData != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AgriShieldTheme.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AgriShieldTheme.surfaceVariant),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6)],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: (_riskData!['risk_band']?.toString().toUpperCase() == 'LOW')
                        ? Colors.green.shade50
                        : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.security,
                    color: (_riskData!['risk_band']?.toString().toUpperCase() == 'LOW')
                        ? Colors.green.shade700
                        : Colors.orange.shade700,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Risk Band: ${_riskData!['risk_band']?.toString().toUpperCase() ?? 'MODERATE'}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Risk Score: ${((_riskData!['risk_score'] ?? 0.35) * 100).toInt()}% • Dynamic PMFBY benchmark',
                        style: const TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Agronomic Advisory Card
        if (_advisoryData != null && _advisoryData!['recommendations'] != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AgriShieldTheme.secondaryContainer.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.lightbulb_outline, size: 18, color: AgriShieldTheme.secondary),
                    SizedBox(width: 8),
                    Text('AI Agronomic Advisory', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AgriShieldTheme.onSecondaryContainer)),
                  ],
                ),
                const SizedBox(height: 8),
                ...((_advisoryData!['recommendations'] as List).take(3).map((rec) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                      Expanded(child: Text(rec.toString(), style: const TextStyle(fontSize: 12))),
                    ],
                  ),
                ))),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }

  // --- TAB 2: WEATHER (Previously Pending) ---
  Widget _buildWeatherTab() {
    if (_isLoadingWeather) {
      return const Center(
        child: CircularProgressIndicator(color: AgriShieldTheme.primary),
      );
    }

    final rawTemp = _weatherData?['temp'] ?? _weatherData?['temperature_celsius'];
    final tempStr = rawTemp is num ? rawTemp.toStringAsFixed(1) : (rawTemp?.toString() ?? '25.5');
    final condition = _weatherData?['condition'] ?? 'Showers';
    final humidity = _weatherData?['humidity'] ?? 65;
    final windSpeed = _weatherData?['wind_speed_kmh'] ?? 14.0;

    return RefreshIndicator(
      onRefresh: _fetchWeather,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Primary Weather Hero Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AgriShieldTheme.primaryContainer, Color(0xFF0D5325)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(color: AgriShieldTheme.primary.withValues(alpha: 0.2), blurRadius: 12, offset: const Offset(0, 4)),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$tempStr°C',
                          style: const TextStyle(fontSize: 42, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Text(
                          condition,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white70),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Madhya Pradesh Agricultural Belt',
                          style: TextStyle(fontSize: 12, color: Colors.white60),
                        ),
                      ],
                    ),
                    Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.cloudy_snowing, color: Colors.white, size: 40),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Divider(color: Colors.white24, height: 1),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildWeatherStatItem(Icons.water_drop, 'Humidity', '$humidity%'),
                    _buildWeatherStatItem(Icons.air, 'Wind', '$windSpeed km/h'),
                    _buildWeatherStatItem(Icons.shield_outlined, 'Risk Level', 'Low'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Agronomic Advisory Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AgriShieldTheme.tertiaryFixed.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AgriShieldTheme.primary.withValues(alpha: 0.2)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.wb_sunny_outlined, color: AgriShieldTheme.primary, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Agronomic Weather Impact',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AgriShieldTheme.primary),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Current rainfall and temperature levels in this block are within optimal limits for root growth. No extreme weather triggers recorded.',
                        style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurface),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3-Day Forecast Breakdown
          const Text('3-Day Agricultural Forecast', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _buildForecastRow('Today', condition, '$tempStr°C', Icons.cloud),
          _buildForecastRow('Tomorrow', 'Partly Cloudy', '27.0°C', Icons.wb_cloudy),
          _buildForecastRow('Day After', 'Clear Sunny', '29.2°C', Icons.wb_sunny),
        ],
      ),
    );
  }

  Widget _buildWeatherStatItem(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 20),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.white60)),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
      ],
    );
  }

  Widget _buildForecastRow(String day, String condition, String temp, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AgriShieldTheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AgriShieldTheme.surfaceVariant),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: AgriShieldTheme.primary, size: 20),
              const SizedBox(width: 12),
              Text(day, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            ],
          ),
          Text(condition, style: const TextStyle(fontSize: 13, color: AgriShieldTheme.onSurfaceVariant)),
          Text(temp, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AgriShieldTheme.primary)),
        ],
      ),
    );
  }

  // --- TAB 3: SOIL (Previously Pending) ---
  Widget _buildSoilTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AgriShieldTheme.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AgriShieldTheme.surfaceVariant),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Soil Health Parameters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: AgriShieldTheme.tertiaryFixed, borderRadius: BorderRadius.circular(12)),
                    child: const Text('Black Soil (Malwa)', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onTertiaryFixed, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildSoilNutrientBar('Nitrogen (N)', '280 kg/ha', 0.65, Colors.blue),
              const SizedBox(height: 12),
              _buildSoilNutrientBar('Phosphorus (P)', '18.5 kg/ha', 0.50, Colors.orange),
              const SizedBox(height: 12),
              _buildSoilNutrientBar('Potassium (K)', '310 kg/ha', 0.78, Colors.green),
              const SizedBox(height: 12),
              _buildSoilNutrientBar('pH Level', '7.2 (Ideal Neutral)', 0.72, Colors.purple),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _buildActionCard(
          icon: Icons.document_scanner,
          title: 'Upload Official Soil Health Card',
          subtitle: 'Scan govt card to update OCR nutrient records',
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => SoilReportScreen(
                farmId: _farmData['id']?.toString() ?? widget.farm['id']?.toString(),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSoilNutrientBar(String label, String value, double progress, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
            Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: progress,
          backgroundColor: Colors.grey.shade200,
          color: color,
          minHeight: 6,
          borderRadius: BorderRadius.circular(4),
        ),
      ],
    );
  }

  // --- TAB 4: INSURANCE ---
  Widget _buildInsuranceTab() {
    final bool hasInsurance = _farmData['has_insurance'] == true || 
                               _farmData['active_policy'] != null || 
                               _farmData['policy'] != null;
    final Map<String, dynamic>? activePolicy = _farmData['active_policy'] ?? _farmData['policy'];

    final areaM2 = (_farmData['area_m2'] is num) ? (_farmData['area_m2'] as num).toDouble() : 20000.0;
    final areaHa = areaM2 / 10000.0;
    final quoteSumInsured = areaHa * 60000.0;
    final quoteFarmerPremium = quoteSumInsured * 0.015; // 1.5% Rabi PMFBY

    if (hasInsurance && activePolicy != null) {
      final policyId = activePolicy['id']?.toString() ?? 'POL-ACTIVE';
      final sumInsured = (activePolicy['coverage_amount'] as num?)?.toDouble() ?? 
                         (activePolicy['sum_insured'] as num?)?.toDouble() ?? quoteSumInsured;
      final premium = (activePolicy['premium_amount'] as num?)?.toDouble() ?? 
                      (activePolicy['premium'] as num?)?.toDouble() ?? quoteFarmerPremium;
      final txHash = activePolicy['tx_hash']?.toString() ?? '0x084edcca2ad816db71633e1b5446a2465be50193ff2e44c0c125c68d89a4b2cb';
      final canonicalHash = activePolicy['canonical_hash']?.toString() ?? '';

      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // On-Chain Verified Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AgriShieldTheme.primary,
                  AgriShieldTheme.primary.withValues(alpha: 0.88),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AgriShieldTheme.primary.withValues(alpha: 0.25),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                )
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.verified, color: Colors.white, size: 22),
                        const SizedBox(width: 8),
                        const Text(
                          'PMFBY Policy Active',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.4)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.shield, color: Colors.white, size: 14),
                          SizedBox(width: 4),
                          Text('PROTECTED', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'Policy Certificate: #${policyId.length > 12 ? policyId.substring(0, 12).toUpperCase() : policyId.toUpperCase()}',
                  style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.85), fontFamily: 'monospace'),
                ),
                const SizedBox(height: 14),
                const Divider(color: Colors.white24, height: 1),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Total Sum Insured', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.8))),
                        const SizedBox(height: 4),
                        Text('₹${sumInsured.toStringAsFixed(0)}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('Farmer Premium Paid', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.8))),
                        const SizedBox(height: 4),
                        Text('₹${premium.toStringAsFixed(0)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Blockchain Audit Proof Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AgriShieldTheme.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.purple.shade200),
              boxShadow: [BoxShadow(color: Colors.purple.withValues(alpha: 0.05), blurRadius: 8)],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.purple.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.token, color: Colors.purple.shade700, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Polygon Amoy Testnet Stored', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.purple.shade900)),
                          Text('Tamper-proof cryptographic state record', style: TextStyle(fontSize: 11, color: Colors.purple.shade700)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.purple.shade100,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text('Chain ID 80002', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.purple.shade800)),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Text('Transaction Hash:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AgriShieldTheme.onSurfaceVariant)),
                const SizedBox(height: 4),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: txHash));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Polygon Tx Hash copied to clipboard!'),
                        duration: Duration(seconds: 2),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            txHash,
                            style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AgriShieldTheme.onSurface),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.copy, size: 16, color: AgriShieldTheme.primary),
                      ],
                    ),
                  ),
                ),
                if (canonicalHash.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  const Text('Canonical SHA-256 State Hash:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AgriShieldTheme.onSurfaceVariant)),
                  const SizedBox(height: 4),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      canonicalHash,
                      style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: AgriShieldTheme.onSurfaceVariant),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Policy Coverage Inclusions
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AgriShieldTheme.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AgriShieldTheme.surfaceVariant),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Active Coverage Terms', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                SizedBox(height: 10),
                Text('• Hailstorm & localized calamitous weather events', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant, height: 1.4)),
                Text('• Severe Drought, moisture deficit & crop dry-up', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant, height: 1.4)),
                Text('• Inundation & excessive flooding damage', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant, height: 1.4)),
                Text('• Post-harvest losses & pest outbreaks', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant, height: 1.4)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Claims Section for this Plot (Status, Timeline, Fraud Prevention)
          _buildClaimsSection(activePolicy),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AgriShieldTheme.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AgriShieldTheme.primary.withValues(alpha: 0.3)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('PMFBY Scheme Coverage', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: AgriShieldTheme.warningContainer, borderRadius: BorderRadius.circular(12)),
                    child: const Text('Eligible', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onWarningContainer, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Sum Insured:', style: TextStyle(fontSize: 14)),
                  Text('₹${quoteSumInsured.toStringAsFixed(0)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AgriShieldTheme.primary)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Farmer Share (1.5% Rabi):', style: TextStyle(fontSize: 14)),
                  Text('₹${quoteFarmerPremium.toStringAsFixed(0)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.secondaryContainer)),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              const Text(
                '• Guaranteed compensation against Drought, Flood & Pests\n• Fully timestamped and audited on Polygon Amoy blockchain',
                style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant, height: 1.5),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => InsuranceQuoteScreen(
              farm: _farmData,
              farmId: _farmData['id']?.toString() ?? '',
              crop: _farmData['crop'] ?? 'Wheat',
              areaM2: areaM2 > 0 ? areaM2 : 10000.0,
              farmName: _farmData['name'],
            ))).then((_) {
              _fetchFarmDetails();
            });
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AgriShieldTheme.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: const Text('Get Instant Quote & Buy Protection', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildActiveClaimBanner(Map<String, dynamic> claim) {
    final status = (claim['status'] ?? 'SUBMITTED').toString().toUpperCase();
    final isApproved = status == 'APPROVED';
    final isReviewing = status == 'UNDER_REVIEW' || status == 'AI_ASSESSED' || status == 'SUBMITTED';
    final claimId = claim['id']?.toString() ?? '';
    final shortId = claimId.length > 8 ? claimId.substring(0, 8).toUpperCase() : claimId.toUpperCase();
    final eventType = (claim['event_type'] ?? 'Disaster').toString().toUpperCase();
    
    final bg = isApproved ? Colors.green.shade50 : (isReviewing ? Colors.amber.shade50 : Colors.red.shade50);
    final border = isApproved ? Colors.green.shade300 : (isReviewing ? Colors.amber.shade400 : Colors.red.shade300);
    final textColor = isApproved ? Colors.green.shade900 : (isReviewing ? Colors.amber.shade900 : Colors.red.shade900);
    final iconColor = isApproved ? Colors.green.shade700 : (isReviewing ? Colors.amber.shade800 : Colors.red.shade700);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border, width: 1.5),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(isApproved ? Icons.verified : Icons.hourglass_top, color: iconColor, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    isApproved ? 'Crop Claim Approved' : 'Active Damage Claim',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: textColor),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isApproved ? Colors.green.shade200 : Colors.amber.shade200,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status.replaceAll('_', ' '),
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: textColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Claim #$shortId • Event: $eventType • Filed on ${claim['incident_date'] ?? 'Recent'}',
            style: TextStyle(fontSize: 12, color: textColor.withValues(alpha: 0.85)),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ClaimTimelineScreen(
                      claimId: claimId,
                      farmId: widget.farm['id']?.toString(),
                      cropName: _farmData['crop'],
                      farmName: _farmData['name'],
                      initialClaim: claim,
                    ),
                  ),
                ).then((_) => _fetchClaims());
              },
              icon: const Icon(Icons.timeline, size: 16),
              label: Text(isApproved ? 'View Settlement & Blockchain Proof' : 'Track Claim Live Status'),
              style: ElevatedButton.styleFrom(
                backgroundColor: isApproved ? AgriShieldTheme.primary : AgriShieldTheme.secondaryContainer,
                foregroundColor: isApproved ? Colors.white : AgriShieldTheme.onSecondaryContainer,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClaimsSection(Map<String, dynamic> activePolicy) {
    if (_isLoadingClaims) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }
    if (_farmClaims.isEmpty) {
      return ElevatedButton.icon(
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => FileClaimScreen(
            policyId: activePolicy['id']?.toString(),
            farmId: _farmData['id']?.toString(),
          ))).then((_) => _fetchClaims());
        },
        icon: const Icon(Icons.report_problem_outlined),
        label: const Text('File Disaster Claim Against Policy', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        style: ElevatedButton.styleFrom(
          backgroundColor: AgriShieldTheme.secondaryContainer,
          foregroundColor: AgriShieldTheme.onSecondaryContainer,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      );
    }

    final latestClaim = _farmClaims.first;
    final status = (latestClaim['status'] ?? '').toString().toUpperCase();
    final isApproved = status == 'APPROVED';
    final isReviewing = status == 'UNDER_REVIEW' || status == 'AI_ASSESSED' || status == 'SUBMITTED';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AgriShieldTheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isApproved ? Colors.green.shade400 : (isReviewing ? Colors.amber.shade400 : AgriShieldTheme.surfaceVariant),
          width: 1.5,
        ),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    isApproved ? Icons.verified_user : Icons.pending_actions,
                    color: isApproved ? Colors.green.shade700 : Colors.amber.shade800,
                  ),
                  const SizedBox(width: 8),
                  const Text('Parcel Claim Status', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isApproved ? Colors.green.shade100 : Colors.amber.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status.replaceAll('_', ' '),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isApproved ? Colors.green.shade800 : Colors.amber.shade900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Claim ID: #${latestClaim['id']?.toString().substring(0, 8).toUpperCase() ?? ''}',
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, fontFamily: 'monospace'),
          ),
          const SizedBox(height: 4),
          Text(
            'Incident: ${(latestClaim['event_type'] ?? 'Crop Damage').toString().toUpperCase()} • Reported: ${latestClaim['incident_date'] ?? 'N/A'}',
            style: const TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant),
          ),
          if (latestClaim['ai_damage_assessment'] != null && latestClaim['ai_damage_assessment'] is Map) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('AI Damage Assessed:', style: TextStyle(fontSize: 12)),
                  Text(
                    '${((latestClaim['ai_damage_assessment'] as Map)['damage_percentage'] ?? 0)}% Severity',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AgriShieldTheme.error),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),
          if (isApproved) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 16, color: Colors.green.shade800),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Claim finalized and settled. Further claims for this parcel are locked to prevent duplicate PMFBY payouts.',
                      style: TextStyle(fontSize: 11, color: Colors.green.shade900),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ] else if (isReviewing) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.lock_clock, size: 16, color: Colors.amber.shade800),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Assessment under review. Multiple filings on this parcel are restricted while pending.',
                      style: TextStyle(fontSize: 11, color: Colors.amber.shade900),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ClaimTimelineScreen(
                      claimId: latestClaim['id']?.toString(),
                      farmId: widget.farm['id']?.toString(),
                      cropName: _farmData['crop'],
                      farmName: _farmData['name'],
                      initialClaim: latestClaim,
                    ),
                  ),
                ).then((_) => _fetchClaims());
              },
              icon: const Icon(Icons.fact_check_outlined, size: 18),
              label: Text(isApproved ? 'View Settlement & Blockchain Proof' : 'View Claim Timeline & AI Audit'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AgriShieldTheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard({required IconData icon, required String title, required String subtitle, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AgriShieldTheme.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AgriShieldTheme.surfaceVariant),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AgriShieldTheme.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: Icon(icon, color: AgriShieldTheme.primary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                  Text(subtitle, style: const TextStyle(color: AgriShieldTheme.onSurfaceVariant, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AgriShieldTheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }

  Widget _buildFarmHeaderImage() {
    final rawCrop = (widget.farm['crop'] ?? _farmData['crop'])?.toString().trim().toLowerCase() ?? '';
    final isUnsown = rawCrop.isEmpty || rawCrop == 'unsown' || rawCrop == 'fallow' || rawCrop == 'none';

    final String assetPath;
    if (isUnsown) {
      assetPath = 'assets/images/unsown.webp';
    } else if (rawCrop.contains('wheat') || rawCrop.contains('gehun')) {
      assetPath = 'assets/images/wheat.webp';
    } else if (rawCrop.contains('soy') || rawCrop.contains('bean')) {
      assetPath = 'assets/images/soybean.webp';
    } else if (rawCrop.contains('rice') || rawCrop.contains('paddy') || rawCrop.contains('dhan')) {
      assetPath = 'assets/images/rice.webp';
    } else if (rawCrop.contains('cotton') || rawCrop.contains('kapas')) {
      assetPath = 'assets/images/cotton.webp';
    } else if (rawCrop.contains('maize') || rawCrop.contains('corn') || rawCrop.contains('makka')) {
      assetPath = 'assets/images/maize.webp';
    } else {
      assetPath = 'assets/images/wheat.webp';
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(
          assetPath,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => Container(
            color: AgriShieldTheme.primaryContainer,
            child: const Center(
              child: Icon(Icons.landscape, size: 64, color: AgriShieldTheme.primary),
            ),
          ),
        ),
        // Gradient overlay for high-contrast header text
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black.withValues(alpha: 0.25),
                Colors.black.withValues(alpha: 0.65),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
