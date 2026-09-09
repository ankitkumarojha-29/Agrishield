import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:intl/intl.dart';
import '../../providers.dart';
import '../../api/api_client.dart';
import '../../theme.dart';

class FarmDetailsFormScreen extends ConsumerStatefulWidget {
  final List<LatLng> polygonPoints;
  final double areaHectares;
  final double areaM2;

  const FarmDetailsFormScreen({
    super.key,
    required this.polygonPoints,
    required this.areaHectares,
    required this.areaM2,
  });

  @override
  ConsumerState<FarmDetailsFormScreen> createState() => _FarmDetailsFormScreenState();
}

class _FarmDetailsFormScreenState extends ConsumerState<FarmDetailsFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiClient _apiClient = ApiClient();

  late TextEditingController _nameController;
  late TextEditingController _khasraController;
  
  String _selectedDistrict = 'Sehore';
  String _selectedCrop = 'Wheat';
  String _selectedSoilType = 'Deep Black Soil (काली मिट्टी)';
  String _selectedIrrigation = 'Tube Well / Borewell (नलकूप / बोरवेल)';
  String _selectedOwnership = 'Owner Cultivator (स्वयं भू-स्वामी)';
  
  DateTime _sowingDate = DateTime.now().subtract(const Duration(days: 30));
  bool _isSubmitting = false;

  final List<String> _mpDistricts = [
    'Sehore',
    'Bhopal',
    'Indore',
    'Ujjain',
    'Vidisha',
    'Raisen',
    'Hoshangabad (Narmadapuram)',
    'Dewas',
    'Rajgarh',
    'Shajapur',
    'Harda',
    'Sagar',
    'Jabalpur',
    'Gwalior',
    'Dhar',
    'Khargone',
    'Khandwa',
    'Other MP District'
  ];

  final List<Map<String, String>> _cropOptions = [
    {'name': 'Wheat', 'label': 'Wheat (गेहूं) — Rabi (1.5% PMFBY)'},
    {'name': 'Soybean', 'label': 'Soybean (सोयाबीन) — Kharif (2.0% PMFBY)'},
    {'name': 'Gram (Chana)', 'label': 'Gram / Chana (चना) — Rabi (1.5% PMFBY)'},
    {'name': 'Mustard', 'label': 'Mustard (सरसों) — Rabi (1.5% PMFBY)'},
    {'name': 'Paddy (Rice)', 'label': 'Paddy (धान) — Kharif (2.0% PMFBY)'},
    {'name': 'Cotton', 'label': 'Cotton (कपास) — Commercial (5.0% PMFBY)'},
    {'name': 'Maize', 'label': 'Maize (मक्का) — Kharif (2.0% PMFBY)'},
    {'name': 'Sugarcane', 'label': 'Sugarcane (गन्ना) — Annual Commercial'},
    {'name': 'Unsown', 'label': 'Fallow / Unsown (अभी बुवाई नहीं हुई — AI Advisory)'},
  ];

  final List<String> _soilTypes = [
    'Deep Black Soil (काली मिट्टी)',
    'Medium Black Soil (मध्यम काली मिट्टी)',
    'Alluvial / Loam Soil (दोमट मिट्टी)',
    'Mixed Red & Black Soil (लाल-काली मिश्रित मिट्टी)',
  ];

  final List<String> _irrigationSources = [
    'Tube Well / Borewell (नलकूप / बोरवेल)',
    'Canal Irrigation (नहर)',
    'Rainfed / Unirrigated (वर्षा आधारित / बारानी)',
    'Drip / Sprinkler (ड्रिप / स्प्रिंकलर)',
    'River / Farm Pond (नदी / खेत तालाब)',
  ];

  final List<String> _ownershipTypes = [
    'Owner Cultivator (स्वयं भू-स्वामी)',
    'Tenant / Sharecropper (बटाईदार / किरायेदार)',
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: 'Farm Plot in $_selectedDistrict');
    _khasraController = TextEditingController(text: '142/1');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _khasraController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _sowingDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AgriShieldTheme.primary,
              onPrimary: Colors.white,
              surface: AgriShieldTheme.surface,
              onSurface: AgriShieldTheme.onSurface,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _sowingDate = picked;
      });
    }
  }

  Future<void> _submitFarm() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      // Ensure closed ring for PostGIS
      final coordinates = [
        ...widget.polygonPoints.map((p) => [p.longitude, p.latitude]),
        [widget.polygonPoints.first.longitude, widget.polygonPoints.first.latitude]
      ];

      final payload = {
        "name": _nameController.text.trim(),
        "crop": _selectedCrop == 'Unsown' ? null : _selectedCrop,
        "sowing_date": _selectedCrop == 'Unsown' ? null : DateFormat('yyyy-MM-dd').format(_sowingDate),
        "area_m2": widget.areaM2,
        "khasra_number": _khasraController.text.trim(),
        "soil_type": _selectedSoilType,
        "irrigation_type": _selectedIrrigation,
        "ownership_type": _selectedOwnership,
        "boundary": {
          "type": "Polygon",
          "coordinates": [coordinates]
        }
      };

      final response = await _apiClient.post<Map<String, dynamic>>(
        '/farms',
        payload,
        (json) => json as Map<String, dynamic>,
      );

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      if (response.success && response.data != null) {
        final farmId = response.data!['farm_id'] ?? 'Registered';
        
        // Refresh farms list in Riverpod
        ref.invalidate(farmsProvider);

        // Show confirmation dialog
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: const [
                Icon(Icons.check_circle, color: AgriShieldTheme.primary, size: 28),
                SizedBox(width: 10),
                Text('Farm Registered!'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_nameController.text.trim()} has been securely registered on PostGIS.',
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• Area: ${widget.areaHectares.toStringAsFixed(2)} ha (${(widget.areaHectares * 2.471).toStringAsFixed(2)} Acres)', style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text('• Crop: $_selectedCrop'),
                      Text('• Khasra No: ${_khasraController.text.trim()}'),
                      Text('• District: $_selectedDistrict'),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop(); // dismiss dialog
                  ref.read(bottomNavIndexProvider.notifier).state = 0; // Go to Home Dashboard
                  Navigator.of(context).popUntil((route) => route.isFirst); // Safely return to home
                },
                child: const Text('Back to Home', style: TextStyle(color: AgriShieldTheme.primary, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AgriShieldTheme.error,
            content: Text('Registration failed: ${response.error?.message ?? "Unknown error"}'),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: AgriShieldTheme.error, content: Text('Error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final acres = widget.areaHectares * 2.47105;
    final mpBighas = widget.areaHectares * 3.95368;
    
    // PMFBY Scale of Finance estimation
    final scaleOfFinance = _selectedCrop == 'Cotton' ? 70000.0 : (_selectedCrop == 'Paddy (Rice)' ? 55000.0 : 50000.0);
    final estimatedCoverage = widget.areaHectares * scaleOfFinance;
    final premiumRate = (_selectedCrop == 'Cotton') ? 0.05 : ((_selectedCrop == 'Soybean' || _selectedCrop == 'Paddy (Rice)') ? 0.02 : 0.015);
    final farmerPremium = estimatedCoverage * premiumRate;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Farm & Crop Details',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
        ),
        backgroundColor: AgriShieldTheme.surface,
        elevation: 0,
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            children: [
              // Step Progress Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AgriShieldTheme.primaryContainer.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.assignment_turned_in, size: 18, color: AgriShieldTheme.primary),
                    SizedBox(width: 8),
                    Text(
                      'Step 2 of 2: Land Records & PMFBY Crop Info',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AgriShieldTheme.primary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Boundary Area Summary Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AgriShieldTheme.surfaceContainerLowest,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AgriShieldTheme.primary.withValues(alpha: 0.2)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: AgriShieldTheme.primaryContainer.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.crop_free, color: AgriShieldTheme.primary, size: 28),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Surveyed Boundary Area',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AgriShieldTheme.onSurfaceVariant),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${widget.areaHectares.toStringAsFixed(2)} Hectares',
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AgriShieldTheme.primary),
                          ),
                          Text(
                            '≈ ${acres.toStringAsFixed(2)} Acres (${mpBighas.toStringAsFixed(1)} MP Bigha)',
                            style: const TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                    Chip(
                      label: Text('${widget.polygonPoints.length} points', style: const TextStyle(fontSize: 11)),
                      backgroundColor: AgriShieldTheme.surfaceVariant,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Section 1: Land Identification
              const Text(
                'Land Records (भू-अभिलेख)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onBackground),
              ),
              const SizedBox(height: 12),

              // Farm Name
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Farm / Plot Name (खेत का नाम) *',
                  hintText: 'e.g. उत्तर वाला खेत / Sehore Plot',
                  prefixIcon: const Icon(Icons.terrain, color: AgriShieldTheme.primary),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: AgriShieldTheme.surfaceContainerLowest,
                ),
                validator: (val) => (val == null || val.trim().isEmpty) ? 'Farm name is required' : null,
              ),
              const SizedBox(height: 16),

              // Khasra Number
              TextFormField(
                controller: _khasraController,
                decoration: InputDecoration(
                  labelText: 'Khasra / Survey Number (खसरा क्रमांक) *',
                  hintText: 'e.g. 142/1 or 89/2-B',
                  prefixIcon: const Icon(Icons.pin, color: AgriShieldTheme.primary),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: AgriShieldTheme.surfaceContainerLowest,
                ),
                validator: (val) => (val == null || val.trim().isEmpty) ? 'Khasra number is required for PMFBY' : null,
              ),
              const SizedBox(height: 16),

              // District in MP
              DropdownButtonFormField<String>(
                isExpanded: true,
                value: _selectedDistrict,
                decoration: InputDecoration(
                  labelText: 'District (जिला - मध्य प्रदेश) *',
                  prefixIcon: const Icon(Icons.location_city, color: AgriShieldTheme.primary),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: AgriShieldTheme.surfaceContainerLowest,
                ),
                items: _mpDistricts.map((d) => DropdownMenuItem(
                  value: d,
                  child: Text(d, overflow: TextOverflow.ellipsis, maxLines: 1),
                )).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _selectedDistrict = val;
                      _nameController.text = 'Farm Plot in $_selectedDistrict';
                    });
                  }
                },
              ),
              const SizedBox(height: 24),

              // Section 2: Crop & Sowing
              const Text(
                'Crop & Sowing Details (फसल और बुवाई)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onBackground),
              ),
              const SizedBox(height: 12),

              // Crop Dropdown
              DropdownButtonFormField<String>(
                isExpanded: true,
                value: _selectedCrop,
                decoration: InputDecoration(
                  labelText: 'Cultivated Crop (फसल का प्रकार) *',
                  prefixIcon: const Icon(Icons.eco, color: AgriShieldTheme.primary),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: AgriShieldTheme.surfaceContainerLowest,
                ),
                items: _cropOptions.map((c) => DropdownMenuItem(
                  value: c['name'],
                  child: Text(c['label']!, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis, maxLines: 1),
                )).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCrop = val);
                },
              ),
              const SizedBox(height: 16),

              // Sowing Date Picker
              if (_selectedCrop != 'Unsown') ...[
                InkWell(
                  onTap: _pickDate,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    decoration: BoxDecoration(
                      color: AgriShieldTheme.surfaceContainerLowest,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade400),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.calendar_month, color: AgriShieldTheme.primary),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Sowing Date (बुवाई की तारीख)', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant)),
                                const SizedBox(height: 2),
                                Text(
                                  DateFormat('dd MMMM yyyy').format(_sowingDate),
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const Icon(Icons.edit, size: 18, color: AgriShieldTheme.primary),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Section 3: Soil & Irrigation
              const Text(
                'Agronomics & Water Source (मिट्टी और सिंचाई)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onBackground),
              ),
              const SizedBox(height: 12),

              // Soil Type
              DropdownButtonFormField<String>(
                isExpanded: true,
                value: _selectedSoilType,
                decoration: InputDecoration(
                  labelText: 'Soil Classification (मिट्टी का प्रकार)',
                  prefixIcon: const Icon(Icons.layers, color: AgriShieldTheme.primary),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: AgriShieldTheme.surfaceContainerLowest,
                ),
                items: _soilTypes.map((s) => DropdownMenuItem(
                  value: s,
                  child: Text(s, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis, maxLines: 1),
                )).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedSoilType = val);
                },
              ),
              const SizedBox(height: 16),

              // Irrigation
              DropdownButtonFormField<String>(
                isExpanded: true,
                value: _selectedIrrigation,
                decoration: InputDecoration(
                  labelText: 'Irrigation Facility (सिंचाई सुविधा)',
                  prefixIcon: const Icon(Icons.water_drop, color: AgriShieldTheme.primary),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: AgriShieldTheme.surfaceContainerLowest,
                ),
                items: _irrigationSources.map((i) => DropdownMenuItem(
                  value: i,
                  child: Text(i, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis, maxLines: 1),
                )).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedIrrigation = val);
                },
              ),
              const SizedBox(height: 16),

              // Ownership
              DropdownButtonFormField<String>(
                isExpanded: true,
                value: _selectedOwnership,
                decoration: InputDecoration(
                  labelText: 'Tenure / Ownership (स्वामित्व)',
                  prefixIcon: const Icon(Icons.badge, color: AgriShieldTheme.primary),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: AgriShieldTheme.surfaceContainerLowest,
                ),
                items: _ownershipTypes.map((o) => DropdownMenuItem(
                  value: o,
                  child: Text(o, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis, maxLines: 1),
                )).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedOwnership = val);
                },
              ),
              const SizedBox(height: 24),

              // PMFBY Instant Insurance Estimation Preview Banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AgriShieldTheme.primaryContainer.withValues(alpha: 0.1),
                      AgriShieldTheme.secondaryContainer.withValues(alpha: 0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AgriShieldTheme.primary.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.shield, color: AgriShieldTheme.primary, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Estimated PMFBY Scheme Benefit',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AgriShieldTheme.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Sum Insured:', style: TextStyle(fontSize: 13)),
                        Text('₹${estimatedCoverage.toStringAsFixed(0)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Farmer Premium Share (${(premiumRate * 100).toStringAsFixed(1)}%):', style: const TextStyle(fontSize: 13)),
                        Text(
                          '₹${farmerPremium.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AgriShieldTheme.secondaryContainer),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Govt. Subsidizes up to 90% of actual actuarial premium.',
                      style: TextStyle(fontSize: 11, color: AgriShieldTheme.onSurfaceVariant, fontStyle: FontStyle.italic),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Submit Button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitFarm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AgriShieldTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.check_circle_outline, size: 22),
                          SizedBox(width: 8),
                          Text(
                            'Register Farm & View Satellite Health',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
