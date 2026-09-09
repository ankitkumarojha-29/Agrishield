import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers.dart';
import '../../theme.dart';
import 'farm_detail_screen.dart';
import 'add_farm_screen.dart';
import 'insurance_quote_screen.dart';
import 'crop_photo_scan_screen.dart';
import 'soil_report_screen.dart';
import 'file_claim_screen.dart';
import 'claim_timeline_screen.dart';

import 'dart:async';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _pollingTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      ref.invalidate(farmsProvider);
      ref.invalidate(userProvider);
      ref.invalidate(claimsProvider);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final farmsAsync = ref.watch(farmsProvider);

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
              title: Row(
                children: [
                  Image.asset('assets/images/logo.webp', height: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Home',
                    style: TextStyle(
                      color: AgriShieldTheme.onSurface,
                      fontWeight: FontWeight.w600,
                      fontSize: 20,
                    ),
                  ),
                ],
              ),
              actions: [
                PopupMenuButton<String>(
                  icon: const Icon(Icons.translate, color: AgriShieldTheme.onSurfaceVariant),
                  onSelected: (value) {
                    // Language logic
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(value: 'en', child: Text('English')),
                    const PopupMenuItem(value: 'hi', child: Text('Hindi')),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: InkWell(
                    onTap: () {
                      ref.read(bottomNavIndexProvider.notifier).state = 4; // Navigate to Profile
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: CircleAvatar(
                      radius: 16,
                      backgroundColor: AgriShieldTheme.primaryContainer,
                      child: const Icon(Icons.person, size: 20, color: Colors.white),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.logout, color: AgriShieldTheme.error),
                  onPressed: () {
                    // Sign out logic
                    Navigator.of(context).pushReplacementNamed('/'); // or back to login
                  },
                ),
                const SizedBox(width: 8),
              ],
            ),
          ),
        ),
      ),
      body: farmsAsync.when(
        data: (farms) {
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(farmsProvider);
              ref.invalidate(userProvider);
              ref.invalidate(weatherProvider);
              ref.invalidate(claimsProvider);
            },
            color: AgriShieldTheme.primary,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 76, // Safe area + appbar + spacing
                bottom: 100, // Space for bottom nav and fab
                left: 16,
                right: 16,
              ),
              children: [
                _buildWelcomeHeader(ref.watch(userProvider)),
                const SizedBox(height: 24),
                _buildWeatherBanner(ref.watch(weatherProvider)),
                const SizedBox(height: 20),
                _buildQuickActionsRow(context),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Your Farms',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onBackground),
                    ),
                    Text(
                      '${farms.length} Registered',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AgriShieldTheme.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (farms.isEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                    decoration: BoxDecoration(
                      color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5)),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.landscape_outlined, size: 48, color: AgriShieldTheme.onSurfaceVariant),
                        const SizedBox(height: 12),
                        const Text(
                          'No farms added yet',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Tap the "+" button below to draw your plot boundary on the map and enroll for PMFBY protection.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: AgriShieldTheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  )
                else
                  ...farms.map((farm) => _buildFarmCard(context, farm)),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AgriShieldTheme.primary)),
        error: (err, stack) => Center(child: Text('Error loading farms: $err')),
      ),
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 72.0),
        child: FloatingActionButton(
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (context) => const AddFarmScreen()),
            );
          },
          backgroundColor: AgriShieldTheme.primary,
          foregroundColor: AgriShieldTheme.onPrimary,
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: const Icon(Icons.add, size: 28),
        ),
      ),
    );
  }

  Widget _buildQuickActionsRow(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _buildQuickActionItem(
            icon: Icons.camera_alt,
            label: 'Scan Crop',
            color: AgriShieldTheme.primary,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CropPhotoScanScreen())),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildQuickActionItem(
            icon: Icons.document_scanner,
            label: 'Soil Card',
            color: AgriShieldTheme.secondary,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SoilReportScreen())),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildQuickActionItem(
            icon: Icons.shield,
            label: 'Claim',
            color: Colors.deepOrange,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FileClaimScreen())),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildQuickActionItem(
            icon: Icons.add_location_alt,
            label: 'Add Plot',
            color: Colors.teal,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AddFarmScreen())),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionItem({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: AgriShieldTheme.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.8)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4)],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeHeader(AsyncValue<Map<String, dynamic>> userAsync) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        userAsync.when(
          data: (user) {
            final name = user['name']?.toString().split(' ').first ?? 'Farmer';
            return Text(
              'Hello, $name 👋',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.5,
                color: AgriShieldTheme.onBackground,
              ),
            );
          },
          loading: () => const Text(
            'Hello, Farmer 👋',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.5,
              color: AgriShieldTheme.onBackground,
            ),
          ),
          error: (err, stack) => const Text(
            'Hello, Farmer 👋',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.5,
              color: AgriShieldTheme.onBackground,
            ),
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Here is the status of your farms today.',
          style: TextStyle(
            fontSize: 16,
            color: AgriShieldTheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildWeatherBanner(AsyncValue<Map<String, dynamic>> weatherAsync) {
    return Container(
      decoration: BoxDecoration(
        color: AgriShieldTheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(16),
      child: weatherAsync.when(
        data: (weather) {
          final rawTemp = weather['temp'] ?? weather['temperature_celsius'];
          final String temp = rawTemp is num 
              ? rawTemp.toStringAsFixed(0) 
              : (rawTemp?.toString() ?? '26');
          final condition = weather['condition'] ?? 'Clear';
          
          return Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.cloud, color: AgriShieldTheme.onPrimaryContainer, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$temp°C, $condition',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AgriShieldTheme.onPrimary,
                      ),
                    ),
                    Text(
                      'Weather data fetched successfully.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AgriShieldTheme.onPrimary.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AgriShieldTheme.onPrimaryContainer)),
        error: (err, stack) => const Text('Failed to load weather data', style: TextStyle(color: AgriShieldTheme.onPrimaryContainer)),
      ),
    );
  }

  Widget _buildFarmCard(BuildContext context, Map<String, dynamic> farm) {
    bool hasInsurance = farm['has_insurance'] == true || farm['active_policy'] != null || farm['policy'] != null;
    String status = farm['status'] ?? (hasInsurance ? 'VERIFIED' : 'PENDING');
    
    num areaM2 = farm['area_m2'] ?? 0;
    double areaHa = (areaM2 / 10000.0);
    double areaAcres = (areaM2 / 4046.86);
    String areaStr = areaHa > 0 ? '${areaHa.toStringAsFixed(2)} ha (${areaAcres.toStringAsFixed(1)} ac)' : 'Surveyed Area';

    // Determine colors based on status
    Color topBarColor = AgriShieldTheme.primary;
    Color riskBg = const Color(0xFFE8F5E9);
    Color riskFg = const Color(0xFF2E7D32);
    Color riskDot = const Color(0xFF4CAF50);
    String riskText = 'Low Risk • Good Health';

    if (status == 'REJECTED') {
      topBarColor = AgriShieldTheme.error;
      riskBg = AgriShieldTheme.errorContainer;
      riskFg = AgriShieldTheme.onErrorContainer;
      riskDot = AgriShieldTheme.error;
      riskText = 'High Risk';
    } else if (status == 'PENDING') {
      topBarColor = AgriShieldTheme.primary;
      riskBg = const Color(0xFFE8F5E9);
      riskFg = const Color(0xFF1B5E20);
      riskDot = const Color(0xFF2E7D32);
      riskText = 'Registered • Low Risk';
    }

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(MaterialPageRoute(builder: (context) => FarmDetailScreen(farm: farm)));
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: AgriShieldTheme.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 1),
            )
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Column(
            children: [
              // Top Color Bar
              Container(height: 6, width: double.infinity, color: topBarColor),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Row with Image
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              (farm['crop'] == null || farm['crop'].toString().trim().isEmpty || farm['crop'].toString().toLowerCase() == 'unsown' || farm['crop'].toString().toLowerCase() == 'fallow')
                                  ? 'Fallow / Unsown'
                                  : farm['crop'].toString(),
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: (farm['crop'] == null || farm['crop'].toString().trim().isEmpty || farm['crop'].toString().toLowerCase() == 'unsown')
                                    ? Colors.orange.shade800
                                    : AgriShieldTheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.location_on, size: 16, color: AgriShieldTheme.onSurfaceVariant),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    farm['name'] ?? 'Plot',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AgriShieldTheme.onSurfaceVariant),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: _buildCropVectorThumbnail(farm['crop']),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Status & Area Row
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: riskBg,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: riskDot,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(color: riskDot.withValues(alpha: 0.4), blurRadius: 4),
                                  ]
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                riskText,
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: riskFg),
                              ),
                            ],
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.straighten, size: 16, color: AgriShieldTheme.onSurfaceVariant),
                            const SizedBox(width: 4),
                            Text(areaStr, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AgriShieldTheme.onSurfaceVariant)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Divider(height: 1, color: AgriShieldTheme.surfaceVariant),
                    
                    // Claim Status Pill (if filed for this farm)
                    () {
                      final claimsAsync = ref.watch(claimsProvider);
                      Map<String, dynamic>? farmClaim;
                      claimsAsync.whenData((claims) {
                        for (final c in claims) {
                          if (c['farm_id']?.toString() == farm['id']?.toString()) {
                            farmClaim = c;
                            break;
                          }
                        }
                      });

                      if (farmClaim == null) return const SizedBox.shrink();

                      final claimStatus = (farmClaim!['status'] ?? '').toString().toUpperCase();
                      final isClaimApproved = claimStatus == 'APPROVED';
                      final claimShortId = (farmClaim!['id']?.toString() ?? '').substring(0, 6).toUpperCase();

                      return Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: InkWell(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ClaimTimelineScreen(
                                  claimId: farmClaim!['id']?.toString(),
                                  farmId: farm['id']?.toString(),
                                  cropName: farm['crop'],
                                  farmName: farm['name'],
                                  initialClaim: farmClaim,
                                ),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: isClaimApproved ? Colors.green.shade50 : Colors.amber.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isClaimApproved ? Colors.green.shade300 : Colors.amber.shade400,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isClaimApproved ? Icons.verified : Icons.pending_actions,
                                  size: 16,
                                  color: isClaimApproved ? Colors.green.shade800 : Colors.amber.shade900,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    isClaimApproved
                                        ? 'PMFBY Claim Settled (#$claimShortId)'
                                        : 'Claim Under Review (#$claimShortId)',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: isClaimApproved ? Colors.green.shade900 : Colors.amber.shade900,
                                    ),
                                  ),
                                ),
                                Text(
                                  'Track',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isClaimApproved ? Colors.green.shade800 : Colors.amber.shade900,
                                  ),
                                ),
                                const SizedBox(width: 2),
                                Icon(
                                  Icons.chevron_right,
                                  size: 14,
                                  color: isClaimApproved ? Colors.green.shade800 : Colors.amber.shade900,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }(),

                    const SizedBox(height: 12),
                    // Bottom Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (hasInsurance)
                          Row(
                            children: [
                              const Icon(Icons.verified, size: 20, color: AgriShieldTheme.primary),
                              const SizedBox(width: 6),
                              const Text('Insured (PMFBY)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AgriShieldTheme.primary)),
                            ],
                          )
                        else
                          Row(
                            children: [
                              const Icon(Icons.gpp_bad, size: 20, color: AgriShieldTheme.onSurfaceVariant),
                              const SizedBox(width: 6),
                              const Text('Not Insured', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AgriShieldTheme.onSurfaceVariant)),
                            ],
                          ),
                        if (!hasInsurance)
                          InkWell(
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => InsuranceQuoteScreen(
                                    farm: farm,
                                    farmId: farm['id']?.toString() ?? '',
                                    crop: farm['crop'] ?? 'Wheat',
                                    areaM2: (farm['area_m2'] is num) ? (farm['area_m2'] as num).toDouble() : 10000.0,
                                    farmName: farm['name'],
                                  ),
                                ),
                              ).then((_) {
                                ref.invalidate(farmsProvider);
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: AgriShieldTheme.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text('Protect Now', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AgriShieldTheme.primary)),
                            ),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AgriShieldTheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AgriShieldTheme.primary.withValues(alpha: 0.3)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.link, size: 14, color: AgriShieldTheme.primary),
                                SizedBox(width: 4),
                                Text('Polygon Stored', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AgriShieldTheme.primary)),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCropVectorThumbnail(dynamic rawCrop) {
    final cropStr = (rawCrop ?? '').toString().trim().toLowerCase();
    final bool isUnsown = cropStr.isEmpty || cropStr == 'unsown' || cropStr == 'fallow' || cropStr == 'none';

    final String assetPath;
    if (isUnsown) {
      assetPath = 'assets/images/unsown.webp';
    } else if (cropStr.contains('wheat') || cropStr.contains('gehun')) {
      assetPath = 'assets/images/wheat.webp';
    } else if (cropStr.contains('soy') || cropStr.contains('bean')) {
      assetPath = 'assets/images/soybean.webp';
    } else if (cropStr.contains('rice') || cropStr.contains('paddy') || cropStr.contains('dhan')) {
      assetPath = 'assets/images/rice.webp';
    } else if (cropStr.contains('cotton') || cropStr.contains('kapas')) {
      assetPath = 'assets/images/cotton.webp';
    } else if (cropStr.contains('maize') || cropStr.contains('corn') || cropStr.contains('makka')) {
      assetPath = 'assets/images/maize.webp';
    } else {
      assetPath = 'assets/images/wheat.webp';
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Image.asset(
        assetPath,
        width: 68,
        height: 68,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: 68,
            height: 68,
            color: AgriShieldTheme.surfaceVariant,
            child: Icon(
              isUnsown ? Icons.landscape : Icons.grass,
              color: AgriShieldTheme.primary,
              size: 28,
            ),
          );
        },
      ),
    );
  }
}
