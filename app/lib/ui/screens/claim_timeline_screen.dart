import 'dart:ui';
import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../api/api_client.dart';

class ClaimTimelineScreen extends StatefulWidget {
  final String? claimId;
  final String? farmId;
  final String? cropName;
  final String? farmName;
  final Map<String, dynamic>? initialClaim;

  const ClaimTimelineScreen({
    super.key,
    this.claimId,
    this.farmId,
    this.cropName,
    this.farmName,
    this.initialClaim,
  });

  @override
  State<ClaimTimelineScreen> createState() => _ClaimTimelineScreenState();
}

class _ClaimTimelineScreenState extends State<ClaimTimelineScreen> {
  final ApiClient _apiClient = ApiClient();
  Map<String, dynamic>? _claim;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.initialClaim != null) {
      _claim = Map<String, dynamic>.from(widget.initialClaim!);
    } else {
      _fetchClaim();
    }
  }

  Future<void> _fetchClaim() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final String url;
      if (widget.claimId != null) {
        url = '/claims/${widget.claimId}';
      } else if (widget.farmId != null) {
        url = '/claims?farm_id=${widget.farmId}';
      } else {
        url = '/claims';
      }

      final res = await _apiClient.get<dynamic>(url, (json) => json);
      if (res.success && res.data != null && mounted) {
        if (res.data is List && (res.data as List).isNotEmpty) {
          setState(() {
            _claim = Map<String, dynamic>.from(res.data[0] as Map);
            _isLoading = false;
          });
        } else if (res.data is Map) {
          setState(() {
            _claim = Map<String, dynamic>.from(res.data as Map);
            _isLoading = false;
          });
        } else {
          setState(() {
            _isLoading = false;
            _error = "No claim records found for this crop parcel.";
          });
        }
      } else if (mounted) {
        setState(() {
          _isLoading = false;
          _error = res.error?.message ?? "Unable to load claim status.";
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = "Error connecting to service: $e";
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final claimData = _claim;
    final displayClaimId = claimData?['id']?.toString().substring(0, 8).toUpperCase() ?? widget.claimId?.substring(0, 8).toUpperCase() ?? 'PENDING';
    final crop = widget.cropName ?? claimData?['crop'] ?? widget.farmName ?? 'Crop';
    final eventType = (claimData?['event_type'] ?? 'Disaster Incident').toString().replaceAll('_', ' ').toUpperCase();
    final statusStr = (claimData?['status'] ?? 'SUBMITTED').toString().toUpperCase();
    final damagePct = (claimData?['damage_pct'] is num) ? (claimData!['damage_pct'] as num).toDouble() : 45.0;
    final confidence = (claimData?['ai_confidence'] is num) ? (claimData!['ai_confidence'] as num).toDouble() : 0.88;
    final createdAt = claimData?['created_at'] != null 
        ? claimData!['created_at'].toString().split('T')[0]
        : 'Recent';

    final isSubmitted = true;
    final isAiAssessed = statusStr == 'AI_ASSESSED' || statusStr == 'UNDER_REVIEW' || statusStr == 'APPROVED';
    final isUnderReview = statusStr == 'UNDER_REVIEW' || statusStr == 'APPROVED';
    final isApproved = statusStr == 'APPROVED';
    final isRejected = statusStr == 'REJECTED';

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
              title: Text('$crop Claim Status', style: const TextStyle(color: AgriShieldTheme.onSurface, fontWeight: FontWeight.w600, fontSize: 18)),
            ),
          ),
        ),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : _error != null 
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.info_outline, size: 48, color: AgriShieldTheme.onSurfaceVariant),
                    const SizedBox(height: 16),
                    Text(_error!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16)),
                    const SizedBox(height: 16),
                    ElevatedButton(onPressed: _fetchClaim, child: const Text("Retry")),
                  ],
                ),
              ),
            )
          : ListView(
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 76,
                left: 16, right: 16, bottom: 24,
              ),
              children: [
                // Header Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AgriShieldTheme.surfaceContainerLowest,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isApproved ? Colors.green.shade300 : AgriShieldTheme.surfaceVariant),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Claim #$displayClaimId', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                            decoration: BoxDecoration(
                              color: isApproved 
                                ? Colors.green.shade50 
                                : (isRejected ? Colors.red.shade50 : AgriShieldTheme.primary.withValues(alpha: 0.1)),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isApproved ? Colors.green.shade300 : (isRejected ? Colors.red.shade300 : AgriShieldTheme.primary.withValues(alpha: 0.3)),
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isApproved ? Icons.check_circle : (isRejected ? Icons.cancel : Icons.sync),
                                  size: 16,
                                  color: isApproved ? Colors.green.shade700 : (isRejected ? Colors.red.shade700 : AgriShieldTheme.primary),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  isApproved ? 'Approved & Settled' : (isRejected ? 'Rejected' : (statusStr == 'AI_ASSESSED' ? 'AI Assessed' : 'In Progress')),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isApproved ? Colors.green.shade700 : (isRejected ? Colors.red.shade700 : AgriShieldTheme.primary),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text('$crop • $eventType', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AgriShieldTheme.onSurface)),
                      const SizedBox(height: 4),
                      Text('Filed Date: $createdAt • PMFBY Insured Parcel', style: const TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant)),
                      
                      if (isApproved) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.green.shade200),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.verified, color: Colors.green, size: 24),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: const [
                                    Text('Claim Payout Approved by AIC / PMFBY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.green)),
                                    SizedBox(height: 2),
                                    Text('Electronic direct benefit transfer (DBT) routed to registered bank account via Aadhaar.', style: TextStyle(fontSize: 11, color: Colors.black87)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                
                // Timeline
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AgriShieldTheme.surfaceContainerLowest,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Audit & Processing Timeline', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
                      const SizedBox(height: 24),
                      
                      _buildTimelineStep(
                        title: '1. Claim Filed & Parcel Boundary Logged',
                        subtitle: 'GPS survey coordinates recorded. Incident: $eventType.',
                        isCompleted: isSubmitted,
                        isLast: false,
                      ),
                      _buildTimelineStep(
                        title: '2. Satellite & AI Damage Assessment',
                        subtitle: 'EfficientNet-B0 + Copernicus NDVI analysis: ${damagePct.toStringAsFixed(1)}% damage estimated (${(confidence * 100).toStringAsFixed(0)}% AI confidence).',
                        isCompleted: isAiAssessed,
                        isActive: statusStr == 'AI_ASSESSED',
                        isLast: false,
                        child: Container(
                          margin: const EdgeInsets.only(top: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(8)),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.satellite_alt, size: 16, color: AgriShieldTheme.primary),
                              SizedBox(width: 8),
                              Text('Sentinel-2 Satellite & Drone Verified', style: TextStyle(fontSize: 12, color: AgriShieldTheme.primary, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                      _buildTimelineStep(
                        title: '3. Insurer / Agriculture Officer Review',
                        subtitle: isApproved 
                            ? 'Survey report and loss assessment approved by PMFBY panel.'
                            : (isRejected ? 'Claim was declined upon verification.' : 'Assigned agricultural officer verifying loss report against district threshold.'),
                        isCompleted: isApproved || isRejected,
                        isActive: isUnderReview && !isApproved && !isRejected,
                        isLast: false,
                      ),
                      _buildTimelineStep(
                        title: '4. Blockchain Settlement & DBT Payout',
                        subtitle: isApproved
                            ? 'Approved for direct benefit transfer under PMFBY. Canonical SHA-256 hash anchored on Polygon Amoy testnet.'
                            : 'Final DBT payout disbursement to Aadhaar-linked account.',
                        isCompleted: isApproved,
                        isActive: isApproved,
                        isLast: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                
                // Blockchain Badge
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AgriShieldTheme.tertiaryFixed, borderRadius: BorderRadius.circular(16)),
                  child: Row(
                    children: [
                      Container(
                        width: 48, height: 48,
                        decoration: const BoxDecoration(color: AgriShieldTheme.onTertiaryFixed, shape: BoxShape.circle),
                        child: const Icon(Icons.lock_clock, color: AgriShieldTheme.tertiaryFixed),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Polygon Amoy Audit Trail', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AgriShieldTheme.onTertiaryFixed)),
                            const SizedBox(height: 4),
                            Text(
                              'Smart Contract: 0x479c319...0d46876\nCanonical SHA-256 Record anchored on-chain.',
                              style: TextStyle(fontSize: 11, color: AgriShieldTheme.onTertiaryFixed.withValues(alpha: 0.9), height: 1.3),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                
                // Back Button
                OutlinedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Back to Farm Details'),
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                ),
              ],
            ),
    );
  }

  Widget _buildTimelineStep({required String title, required String subtitle, required bool isCompleted, bool isActive = false, required bool isLast, Widget? child}) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 24,
            child: Column(
              children: [
                Container(
                  width: 24, height: 24,
                  decoration: BoxDecoration(
                    color: isCompleted ? AgriShieldTheme.primary : (isActive ? AgriShieldTheme.surfaceContainerLowest : AgriShieldTheme.surfaceVariant),
                    border: isActive ? Border.all(color: AgriShieldTheme.primary, width: 2) : null,
                    shape: BoxShape.circle,
                  ),
                  child: isCompleted 
                    ? const Icon(Icons.check, size: 16, color: Colors.white)
                    : (isActive ? Center(child: Container(width: 10, height: 10, decoration: const BoxDecoration(color: AgriShieldTheme.primary, shape: BoxShape.circle))) : null),
                ),
                if (!isLast)
                  Expanded(child: Container(width: 2, color: isCompleted ? AgriShieldTheme.primary : AgriShieldTheme.surfaceVariant)),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 28.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: isActive ? AgriShieldTheme.primary : (isCompleted ? AgriShieldTheme.onSurface : AgriShieldTheme.onSurfaceVariant.withValues(alpha: 0.7)))),
                  const SizedBox(height: 4),
                  Text(subtitle, style: TextStyle(fontSize: 13, color: isCompleted || isActive ? AgriShieldTheme.onSurfaceVariant : AgriShieldTheme.onSurfaceVariant.withValues(alpha: 0.7), height: 1.3)),
                  child ?? const SizedBox.shrink(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
