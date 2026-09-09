import 'dart:ui';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../../theme.dart';
import 'farm_details_form_screen.dart';

class AddFarmScreen extends ConsumerStatefulWidget {
  const AddFarmScreen({super.key});

  @override
  ConsumerState<AddFarmScreen> createState() => _AddFarmScreenState();
}

class _AddFarmScreenState extends ConsumerState<AddFarmScreen> {
  final List<LatLng> _polygonPoints = [];
  final MapController _mapController = MapController();
  bool _isSatellite = false;
  bool _isLocating = false;

  Future<void> _locateCurrentPosition() async {
    setState(() => _isLocating = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enable GPS / Location service on your device')),
          );
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Location permission denied')),
            );
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permissions are permanently denied, please enable in App Settings')),
          );
        }
        return;
      }

      final Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 10)),
      );

      final userLatLng = LatLng(position.latitude, position.longitude);
      _mapController.move(userLatLng, 17.0);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.my_location, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Text('GPS: ${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}'),
              ],
            ),
            backgroundColor: AgriShieldTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('GPS fix error: $e. Centered on MP.'), backgroundColor: AgriShieldTheme.error),
        );
        _mapController.move(_mpCenter, 12.0);
      }
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  // Madhya Pradesh coordinates (Central MP / Bhopal & Sehore belt)
  static const LatLng _mpCenter = LatLng(23.2599, 77.4126);

  // Notable MP agricultural districts for quick jump
  final List<Map<String, dynamic>> _mpDistricts = [
    {'name': 'Bhopal', 'center': const LatLng(23.2599, 77.4126)},
    {'name': 'Sehore', 'center': const LatLng(23.2032, 77.0844)},
    {'name': 'Indore', 'center': const LatLng(22.7196, 75.8577)},
    {'name': 'Ujjain', 'center': const LatLng(23.1765, 75.7885)},
    {'name': 'Vidisha', 'center': const LatLng(23.5251, 77.8081)},
    {'name': 'Hoshangabad', 'center': const LatLng(22.7519, 77.7289)},
    {'name': 'Dewas', 'center': const LatLng(22.9676, 76.0534)},
  ];

  @override
  Widget build(BuildContext context) {
    final areaHectares = _calculateArea(_polygonPoints);
    final areaAcres = areaHectares * 2.47105;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: AppBar(
              backgroundColor: AgriShieldTheme.surface.withValues(alpha: 0.85),
              elevation: 0,
              iconTheme: const IconThemeData(color: AgriShieldTheme.onSurface),
              title: const Text(
                'Draw Farm Boundary',
                style: TextStyle(
                  color: AgriShieldTheme.onSurface,
                  fontWeight: FontWeight.w600,
                  fontSize: 18,
                ),
              ),
              actions: [
                if (_polygonPoints.isNotEmpty)
                  TextButton.icon(
                    icon: const Icon(Icons.delete_sweep, size: 18, color: AgriShieldTheme.error),
                    label: const Text('Clear', style: TextStyle(color: AgriShieldTheme.error, fontWeight: FontWeight.w600)),
                    onPressed: () {
                      setState(() => _polygonPoints.clear());
                    },
                  ),
                const SizedBox(width: 8),
              ],
            ),
          ),
        ),
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _mpCenter, // Centered on Madhya Pradesh
              initialZoom: 12.0, // Zoomed in to agricultural fields
              minZoom: 6.0,
              maxZoom: 19.0,
              onTap: (tapPosition, point) {
                setState(() {
                  _polygonPoints.add(point);
                });
              },
            ),
            children: [
              TileLayer(
                urlTemplate: _isSatellite
                    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'dev.mayankanand.agrishield',
                maxZoom: 19.0,
              ),
              if (_polygonPoints.isNotEmpty)
                PolygonLayer(
                  polygons: <Polygon<Object>>[
                    Polygon<Object>(
                      points: _polygonPoints,
                      color: _isSatellite
                          ? AgriShieldTheme.secondaryContainer.withValues(alpha: 0.35)
                          : AgriShieldTheme.primary.withValues(alpha: 0.3),
                      borderColor: _isSatellite ? AgriShieldTheme.secondaryContainer : AgriShieldTheme.primary,
                      borderStrokeWidth: 3,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: _polygonPoints.asMap().entries.map((entry) {
                  int idx = entry.key;
                  LatLng point = entry.value;
                  final markerColor = _isSatellite ? AgriShieldTheme.secondaryContainer : AgriShieldTheme.primary;
                  return Marker(
                    point: point,
                    width: 24,
                    height: 24,
                    child: Container(
                      decoration: BoxDecoration(
                        color: AgriShieldTheme.surfaceContainerLowest,
                        shape: BoxShape.circle,
                        border: Border.all(color: markerColor, width: 3),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 4),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          '${idx + 1}',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: markerColor),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),

          // Top Bar: Instructions, Layer Switcher Pill & MP District Quick-Pills
          Positioned(
            top: MediaQuery.of(context).padding.top + 68,
            left: 16,
            right: 16,
            child: Column(
              children: [
                // Top Row: Instruction Banner + Map Layer Switcher (Street / Satellite)
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(30),
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: AgriShieldTheme.surface.withValues(alpha: 0.95),
                              borderRadius: BorderRadius.circular(30),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4, offset: const Offset(0, 2)),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.touch_app, color: AgriShieldTheme.primary, size: 18),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    _polygonPoints.isEmpty
                                        ? 'Tap corners to mark boundary'
                                        : '${_polygonPoints.length} points marked',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AgriShieldTheme.onSurface),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Street / Satellite Layer Switcher Pill
                    Container(
                      height: 38,
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        color: AgriShieldTheme.surface.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4, offset: const Offset(0, 2)),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          GestureDetector(
                            onTap: () {
                              if (_isSatellite) setState(() => _isSatellite = false);
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: !_isSatellite ? AgriShieldTheme.primary : Colors.transparent,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.map, size: 13, color: !_isSatellite ? Colors.white : AgriShieldTheme.onSurfaceVariant),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Street',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: !_isSatellite ? Colors.white : AgriShieldTheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              if (!_isSatellite) setState(() => _isSatellite = true);
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: _isSatellite ? AgriShieldTheme.primary : Colors.transparent,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.satellite_alt, size: 13, color: _isSatellite ? Colors.white : AgriShieldTheme.onSurfaceVariant),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Satellite',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: _isSatellite ? Colors.white : AgriShieldTheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // MP District Selector Horizontal List
                SizedBox(
                  height: 34,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _mpDistricts.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final d = _mpDistricts[index];
                      return ActionChip(
                        label: Text(d['name'] as String),
                        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AgriShieldTheme.primary),
                        backgroundColor: AgriShieldTheme.surface.withValues(alpha: 0.95),
                        side: BorderSide(color: AgriShieldTheme.primary.withValues(alpha: 0.3)),
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        onPressed: () {
                          _mapController.move(d['center'] as LatLng, 13.0);
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // Right Map Control Floating Buttons
          Positioned(
            right: 16,
            top: MediaQuery.of(context).padding.top + 170,
            child: Column(
              children: [
                _buildMapFloatingBtn(
                  icon: _isSatellite ? Icons.map_outlined : Icons.satellite_alt,
                  tooltip: _isSatellite ? 'Switch to Street Map' : 'Switch to Satellite View',
                  isActive: _isSatellite,
                  onTap: () {
                    setState(() {
                      _isSatellite = !_isSatellite;
                    });
                  },
                ),
                const SizedBox(height: 8),
                _buildMapFloatingBtn(
                  icon: Icons.add,
                  tooltip: 'Zoom In',
                  onTap: () {
                    final currentZoom = _mapController.camera.zoom;
                    _mapController.move(_mapController.camera.center, currentZoom + 1);
                  },
                ),
                const SizedBox(height: 8),
                _buildMapFloatingBtn(
                  icon: Icons.remove,
                  tooltip: 'Zoom Out',
                  onTap: () {
                    final currentZoom = _mapController.camera.zoom;
                    _mapController.move(_mapController.camera.center, currentZoom - 1);
                  },
                ),
                const SizedBox(height: 8),
                _buildMapFloatingBtn(
                  icon: _isLocating ? Icons.hourglass_top : Icons.my_location,
                  tooltip: 'Locate My Farm (GPS)',
                  isActive: _isLocating,
                  onTap: _isLocating ? null : () => _locateCurrentPosition(),
                ),
              ],
            ),
          ),

          // Center Crosshair for precision alignment
          const Center(
            child: IgnorePointer(
              child: Icon(Icons.crop_free, size: 36, color: AgriShieldTheme.primary),
            ),
          ),

          // Floating Bottom Action Card
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AgriShieldTheme.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 20, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.straighten, size: 16, color: AgriShieldTheme.onSurfaceVariant),
                              SizedBox(width: 4),
                              Text(
                                'Boundary Area (मध्य प्रदेश)',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AgriShieldTheme.onSurfaceVariant),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          RichText(
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text: areaHectares.toStringAsFixed(2),
                                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AgriShieldTheme.primary, fontFamily: 'Inter'),
                                ),
                                const TextSpan(
                                  text: ' Hectares',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AgriShieldTheme.onSurfaceVariant, fontFamily: 'Inter'),
                                ),
                                TextSpan(
                                  text: ' (${areaAcres.toStringAsFixed(2)} Acres)',
                                  style: const TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant, fontFamily: 'Inter'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      // Undo Last Point
                      InkWell(
                        onTap: () {
                          if (_polygonPoints.isNotEmpty) {
                            setState(() => _polygonPoints.removeLast());
                          }
                        },
                        borderRadius: BorderRadius.circular(24),
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: AgriShieldTheme.secondaryContainer.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.undo, color: AgriShieldTheme.secondaryContainer),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Continue to Farm Details Button
                  ElevatedButton(
                    onPressed: _polygonPoints.length >= 3
                        ? () {
                            if (_hasSelfIntersection(_polygonPoints)) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  backgroundColor: AgriShieldTheme.error,
                                  content: Text('Invalid boundary: Polygon edges self-intersect. Please undo and adjust.'),
                                ),
                              );
                              return;
                            }

                            final area = _calculateArea(_polygonPoints);
                            if (area <= 0.001) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  backgroundColor: AgriShieldTheme.error,
                                  content: Text('Boundary area is too small. Please mark a realistic farm plot.'),
                                ),
                              );
                              return;
                            }

                            // Navigate to the Farm Details Form
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (context) => FarmDetailsFormScreen(
                                  polygonPoints: List.from(_polygonPoints),
                                  areaHectares: area,
                                  areaM2: area * 10000,
                                ),
                              ),
                            );
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AgriShieldTheme.primary,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey.shade300,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _polygonPoints.length < 3
                              ? 'Tap at least 3 points (${_polygonPoints.length}/3)'
                              : 'Next: Farm Details & Crop →',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildMapFloatingBtn({
    required IconData icon,
    required String tooltip,
    VoidCallback? onTap,
    bool isActive = false,
  }) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: isActive ? AgriShieldTheme.primary : AgriShieldTheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: IconButton(
        icon: Icon(icon, color: isActive ? Colors.white : AgriShieldTheme.primary, size: 20),
        tooltip: tooltip,
        padding: EdgeInsets.zero,
        onPressed: onTap,
      ),
    );
  }

  double _calculateArea(List<LatLng> points) {
    if (points.length < 3) return 0.0;
    const double radius = 6378137.0; // Earth radius in meters
    double latSum = 0;
    for (var p in points) {
      latSum += p.latitude;
    }
    double latMean = (latSum / points.length) * math.pi / 180.0;
    double cosLatMean = math.cos(latMean);

    List<math.Point<double>> projected = [];
    for (var p in points) {
      double x = radius * (p.longitude * math.pi / 180.0) * cosLatMean;
      double y = radius * (p.latitude * math.pi / 180.0);
      projected.add(math.Point<double>(x, y));
    }

    double area = 0.0;
    for (int i = 0; i < projected.length; i++) {
      int j = (i + 1) % projected.length;
      area += projected[i].x * projected[j].y;
      area -= projected[j].x * projected[i].y;
    }
    area = area.abs() / 2.0;
    return area / 10000.0; // Return in hectares
  }

  bool _hasSelfIntersection(List<LatLng> points) {
    if (points.length < 4) return false;
    for (int i = 0; i < points.length; i++) {
      int nextI = (i + 1) % points.length;
      for (int j = i + 1; j < points.length; j++) {
        int nextJ = (j + 1) % points.length;
        if (i == j || i == nextJ || nextI == j || nextI == nextJ) continue;
        if (_linesIntersect(points[i], points[nextI], points[j], points[nextJ])) {
          return true;
        }
      }
    }
    return false;
  }

  bool _linesIntersect(LatLng p1, LatLng p2, LatLng p3, LatLng p4) {
    double ccw(LatLng a, LatLng b, LatLng c) {
      return (c.latitude - a.latitude) * (b.longitude - a.longitude) -
             (b.latitude - a.latitude) * (c.longitude - a.longitude);
    }
    return (ccw(p1, p3, p4) * ccw(p2, p3, p4) < 0) &&
           (ccw(p1, p2, p3) * ccw(p1, p2, p4) < 0);
  }
}
