import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../theme.dart';
import '../../providers.dart';
import '../../api/api_client.dart';
import 'claim_timeline_screen.dart';

class FileClaimScreen extends ConsumerStatefulWidget {
  final String? policyId;
  final String? farmId;
  const FileClaimScreen({super.key, this.policyId, this.farmId});

  @override
  ConsumerState<FileClaimScreen> createState() => _FileClaimScreenState();
}

class _FileClaimScreenState extends ConsumerState<FileClaimScreen> {
  String _selectedIncident = 'Pest Attack';
  DateTime _selectedDate = DateTime.now();
  bool _isSubmitting = false;
  String? _selectedFarmId;
  
  // Store picked files
  final List<File> _evidenceFiles = [];
  final ImagePicker _picker = ImagePicker();

  final List<Map<String, dynamic>> _incidentTypes = [
    {'name': 'Hailstorm', 'icon': Icons.grain, 'code': 'hailstorm'},
    {'name': 'Drought', 'icon': Icons.wb_sunny, 'code': 'drought'},
    {'name': 'Flood', 'icon': Icons.flood, 'code': 'flood'},
    {'name': 'Pest Attack', 'icon': Icons.bug_report, 'code': 'pest'},
  ];

  @override
  void initState() {
    super.initState();
    _selectedFarmId = widget.farmId;
  }

  Future<void> _pickImage() async {
    if (_evidenceFiles.length >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Maximum 3 photos allowed')));
      return;
    }
    
    final source = await showDialog<ImageSource>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Photo Source'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camera'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source != null) {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 82,
      );
      if (image != null) {
        final file = File(image.path);
        final size = await file.length();
        if (size > 10 * 1024 * 1024) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Photo too large (>10MB). Please select a smaller photo.')),
            );
          }
          return;
        }
        setState(() {
          _evidenceFiles.add(file);
        });
      }
    }
  }

  void _removeImage(int index) {
    setState(() {
      _evidenceFiles.removeAt(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    final farmsAsync = ref.watch(farmsProvider);
    final claimsAsync = ref.watch(claimsProvider);

    // Evaluate claim locking for currently selected farm
    Map<String, dynamic>? existingClaimForFarm;
    bool isApproved = false;
    bool isFarmClaimLocked = false;

    claimsAsync.whenData((claims) {
      if (_selectedFarmId != null) {
        for (final c in claims) {
          if (c['farm_id']?.toString() == _selectedFarmId) {
            final st = (c['status'] ?? '').toString().toUpperCase();
            if (st == 'APPROVED') {
              existingClaimForFarm = c;
              isApproved = true;
              isFarmClaimLocked = true;
              break;
            } else if (st == 'SUBMITTED' || st == 'AI_ASSESSED' || st == 'UNDER_REVIEW') {
              existingClaimForFarm = c;
              isApproved = false;
              isFarmClaimLocked = true;
              break;
            }
          }
        }
      }
    });

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
              title: const Text('File Claim', style: TextStyle(color: AgriShieldTheme.onSurface, fontWeight: FontWeight.w600, fontSize: 20)),
            ),
          ),
        ),
      ),
      body: ListView(
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 76,
          left: 16, right: 16, bottom: 120,
        ),
        children: [
          // Instruction
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AgriShieldTheme.primaryContainer.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.info, color: AgriShieldTheme.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('File a Crop Damage Claim', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
                      SizedBox(height: 4),
                      Text('Select the affected farm plot and incident type, then upload at least 2 clear damage photos.', style: TextStyle(fontSize: 14, color: AgriShieldTheme.onSurfaceVariant)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Plot Selection
          const Text('Select Affected Plot / Farm', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
          const SizedBox(height: 8),
          farmsAsync.when(
            loading: () => Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AgriShieldTheme.surface, borderRadius: BorderRadius.circular(12)),
              child: const Row(
                children: [
                  SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 12),
                  Text('Loading registered plots...', style: TextStyle(fontSize: 14, color: AgriShieldTheme.onSurfaceVariant)),
                ],
              ),
            ),
            error: (err, stack) => Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AgriShieldTheme.surface, borderRadius: BorderRadius.circular(12)),
              child: const Text('Could not load plots. Tap retry.', style: TextStyle(color: AgriShieldTheme.error)),
            ),
            data: (farms) {
              if (farms.isEmpty) {
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AgriShieldTheme.surface, borderRadius: BorderRadius.circular(12)),
                  child: const Text('No registered plots found. Please register a plot first.', style: TextStyle(color: AgriShieldTheme.onSurfaceVariant)),
                );
              }
              // Set initial selected farm if not set
              if (_selectedFarmId == null || !farms.any((f) => f['id']?.toString() == _selectedFarmId)) {
                _selectedFarmId = farms.first['id']?.toString();
              }

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: AgriShieldTheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AgriShieldTheme.surfaceVariant),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4)],
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedFarmId,
                    isExpanded: true,
                    icon: const Icon(Icons.arrow_drop_down, color: AgriShieldTheme.primary),
                    items: farms.map((f) {
                      final fId = f['id']?.toString() ?? '';
                      final fName = f['name']?.toString() ?? 'Plot';
                      final fCrop = f['crop']?.toString() ?? 'Fallow/Unsown';
                      final areaM2 = (f['area_m2'] is num) ? (f['area_m2'] as num).toDouble() : 0.0;
                      final areaHa = (areaM2 / 10000.0).toStringAsFixed(1);
                      return DropdownMenuItem<String>(
                        value: fId,
                        child: Row(
                          children: [
                            const Icon(Icons.landscape, size: 20, color: AgriShieldTheme.primary),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '$fName • $fCrop ($areaHa ha)',
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (newVal) {
                      if (newVal != null) {
                        setState(() => _selectedFarmId = newVal);
                      }
                    },
                  ),
                ),
              );
            },
          ),

          if (isFarmClaimLocked && existingClaimForFarm != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isApproved ? Colors.green.shade50 : Colors.amber.shade50,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isApproved ? Colors.green.shade300 : Colors.amber.shade400,
                  width: 1.5,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        isApproved ? Icons.verified : Icons.hourglass_top,
                        color: isApproved ? Colors.green.shade800 : Colors.amber.shade900,
                        size: 22,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          isApproved 
                              ? 'Claim Settled & Approved for this Plot' 
                              : 'Claim Already in Review for this Plot',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: isApproved ? Colors.green.shade900 : Colors.amber.shade900,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isApproved
                        ? 'Under PMFBY guidelines, multiple claims cannot be filed for an already approved/settled policy on the same crop parcel. (You can still select and file claims for your other farms).'
                        : 'An insurance claim (Claim #${existingClaimForFarm!['id'].toString().substring(0, 8).toUpperCase()}) is currently being assessed. Multiple submissions on the same parcel are restricted while a review is pending.',
                    style: TextStyle(
                      fontSize: 12,
                      color: isApproved ? Colors.green.shade900 : Colors.amber.shade900,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ClaimTimelineScreen(
                              initialClaim: existingClaimForFarm,
                              claimId: existingClaimForFarm!['id']?.toString(),
                              farmId: _selectedFarmId,
                            ),
                          ),
                        );
                      },
                      icon: Icon(
                        isApproved ? Icons.receipt_long : Icons.timeline,
                        size: 16,
                        color: isApproved ? Colors.green.shade800 : Colors.amber.shade900,
                      ),
                      label: Text(
                        isApproved ? 'View Claim Settlement Receipt' : 'Track Active Claim Timeline',
                        style: TextStyle(
                          color: isApproved ? Colors.green.shade800 : Colors.amber.shade900,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: isApproved ? Colors.green.shade400 : Colors.amber.shade500,
                        ),
                        backgroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),
          
          // Incident Type
          const Text('Select Incident Type', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.5),
            itemCount: _incidentTypes.length,
            itemBuilder: (context, index) {
              final incident = _incidentTypes[index];
              final isSelected = _selectedIncident == incident['name'];
              return InkWell(
                onTap: () => setState(() => _selectedIncident = incident['name']),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected ? AgriShieldTheme.primaryContainer.withValues(alpha: 0.2) : AgriShieldTheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSelected ? AgriShieldTheme.primary : AgriShieldTheme.surfaceVariant, width: isSelected ? 2 : 1),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4)],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: isSelected ? AgriShieldTheme.primary.withValues(alpha: 0.1) : AgriShieldTheme.surfaceVariant, shape: BoxShape.circle),
                        child: Icon(incident['icon'], color: isSelected ? AgriShieldTheme.primary : AgriShieldTheme.onSurfaceVariant, size: 28),
                      ),
                      const SizedBox(height: 8),
                      Text(incident['name'], style: TextStyle(fontWeight: FontWeight.w600, color: AgriShieldTheme.onSurface)),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          
          // Date Picker
          const Text('Date of Incident', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
          const SizedBox(height: 8),
          InkWell(
            onTap: () async {
              final date = await showDatePicker(context: context, initialDate: _selectedDate, firstDate: DateTime(2020), lastDate: DateTime.now());
              if (date != null) setState(() => _selectedDate = date);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: BoxDecoration(color: AgriShieldTheme.surface, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4)]),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${_selectedDate.toLocal()}'.split(' ')[0], style: const TextStyle(fontSize: 18, color: AgriShieldTheme.onSurface)),
                  const Icon(Icons.calendar_month, color: AgriShieldTheme.onSurfaceVariant),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          
          // Evidence
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text('Upload Evidence Photos', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
              Text('2 of 3 minimum', style: TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              for (int i = 0; i < 3; i++) ...[
                if (i < _evidenceFiles.length)
                  Expanded(
                    child: Container(
                      height: 100,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        image: DecorationImage(image: FileImage(_evidenceFiles[i]), fit: BoxFit.cover)
                      ),
                      child: Stack(
                        children: [
                          Positioned(
                            top: 4, right: 4,
                            child: InkWell(
                              onTap: () => _removeImage(i),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.8), shape: BoxShape.circle),
                                child: const Icon(Icons.close, size: 16, color: AgriShieldTheme.error),
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: InkWell(
                      onTap: _pickImage,
                      child: _buildAddPhotoBtn(),
                    )
                  ),
                if (i < 2) const SizedBox(width: 12),
              ]
            ],
          ),
          const SizedBox(height: 24),
          
          // Claim Verification Fee Breakdown
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AgriShieldTheme.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AgriShieldTheme.surfaceVariant),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.bolt, size: 18, color: AgriShieldTheme.primary),
                        SizedBox(width: 8),
                        Text(
                          'AI Claim Verification Fee',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Text(
                        '₹180 (Covered)',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green.shade800),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Automated Sentinel-2 NDVI spectral loss scoring + computer vision damage audit. 100% covered by the insurer under PMFBY (₹0 farmer out-of-pocket).',
                  style: TextStyle(fontSize: 11, color: AgriShieldTheme.onSurfaceVariant, height: 1.3),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Submit
          ElevatedButton(
            onPressed: _isSubmitting || isFarmClaimLocked || _evidenceFiles.length < 2 ? null : () async {
              setState(() => _isSubmitting = true);
              
              // 1. Upload files first
              final apiClient = ApiClient();
              List<String> uploadedFileIds = [];
              
              for (var file in _evidenceFiles) {
                final uploadRes = await apiClient.uploadFile<Map<String, dynamic>>(
                  '/files', 
                  file.path, 
                  (json) => json as Map<String, dynamic>
                );
                
                if (uploadRes.success && uploadRes.data != null) {
                  uploadedFileIds.add(uploadRes.data!['id']);
                } else {
                  if (mounted && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to upload photo: ${uploadRes.error?.message}')));
                    setState(() => _isSubmitting = false);
                  }
                  return;
                }
              }

              // 2. Submit Claim with file IDs
              final repo = ref.read(claimRepositoryProvider);
              String policyId = widget.policyId ?? '';
              
              if (policyId.isEmpty) {
                final policiesRes = await ref.read(insuranceRepositoryProvider).getPolicies();
                if (policiesRes.success && policiesRes.data != null && policiesRes.data!.isNotEmpty) {
                  policyId = policiesRes.data!.first['id']?.toString() ?? '';
                }
              }

              final selectedItem = _incidentTypes.firstWhere(
                (e) => e['name'] == _selectedIncident,
                orElse: () => {'code': 'pest'},
              );
              final eventCode = selectedItem['code'] ?? 'pest';

              final res = await repo.createClaim({
                "policy_id": policyId.isNotEmpty ? policyId : null,
                "farm_id": _selectedFarmId,
                "incident_date": _selectedDate.toIso8601String().split('T')[0],
                "event_type": eventCode,
                "description": "Crop damage claim filed via farmer mobile app",
                "evidence_ids": uploadedFileIds
              });
              
              if (mounted && context.mounted) {
                setState(() => _isSubmitting = false);
                if (res.success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Claim submitted and AI assessed successfully!'),
                      backgroundColor: AgriShieldTheme.primary,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  ref.invalidate(claimsProvider);
                  ref.invalidate(farmsProvider);
                  if (Navigator.canPop(context)) Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ClaimTimelineScreen(
                        claimId: res.data?['id']?.toString(),
                        farmId: _selectedFarmId,
                        initialClaim: res.data,
                      ),
                    ),
                  );
                } else {
                  final errCode = res.error?.code ?? '';
                  final errMsg = res.error?.message ?? 'Failed to submit claim';
                  
                  if (errCode == 'CLAIM_ALREADY_APPROVED' || 
                      errCode == 'CLAIM_ALREADY_ACTIVE' || 
                      errCode == 'LAND_BOUNDARY_ALREADY_CLAIMED') {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: Row(
                          children: const [
                            Icon(Icons.shield, color: AgriShieldTheme.error),
                            SizedBox(width: 8),
                            Text('PMFBY Rule Alert'),
                          ],
                        ),
                        content: Text(errMsg),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('Understood'),
                          ),
                        ],
                      ),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Failed: $errMsg'),
                        backgroundColor: AgriShieldTheme.error,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                }
              }
            },
            style: ElevatedButton.styleFrom(
              minimumSize: const Size.fromHeight(56), 
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              backgroundColor: isFarmClaimLocked ? Colors.grey.shade400 : null,
            ),
            child: _isSubmitting
              ? const CircularProgressIndicator(color: Colors.white)
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(isFarmClaimLocked ? Icons.lock : Icons.send),
                    const SizedBox(width: 8),
                    Text(
                      isFarmClaimLocked 
                          ? (isApproved ? 'Claim Already Settled' : 'Claim In Active Review')
                          : 'Submit Claim', 
                      style: const TextStyle(fontSize: 18),
                    ),
                  ],
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddPhotoBtn() {
    return Container(
      height: 100,
      decoration: BoxDecoration(color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(12), border: Border.all(color: AgriShieldTheme.surfaceVariant, style: BorderStyle.solid)),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.add_a_photo, color: AgriShieldTheme.primary, size: 28),
          SizedBox(height: 4),
          Text('Add Photo', style: TextStyle(fontSize: 12, color: AgriShieldTheme.primary, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
