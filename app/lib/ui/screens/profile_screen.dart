import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../theme.dart';
import '../../api/api_client.dart';
import '../../providers.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final ApiClient _apiClient = ApiClient();
  final _storage = const FlutterSecureStorage();
  
  bool _isLoading = true;
  bool _isEditing = false;
  bool _isSaving = false;
  Map<String, dynamic>? _user;
  final TextEditingController _nameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    setState(() => _isLoading = true);
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/auth/me',
      (json) => json as Map<String, dynamic>,
    );

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (response.success && response.data != null) {
          _user = response.data;
          _nameController.text = _user?['name'] ?? '';
        }
      });
    }
  }

  Future<void> _saveProfile() async {
    final newName = _nameController.text.trim();
    if (newName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid name.')),
      );
      return;
    }

    setState(() => _isSaving = true);
    final response = await _apiClient.patch<Map<String, dynamic>>(
      '/auth/me',
      {'name': newName},
      (json) => json as Map<String, dynamic>,
    );

    if (mounted) {
      setState(() {
        _isSaving = false;
        _isEditing = false;
        if (response.success && response.data != null) {
          _user?['name'] = response.data!['name'];
          // Invalidate userProvider to update Dashboard greeting immediately
          ref.invalidate(userProvider);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile updated successfully')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to update: ${response.error?.message}')),
          );
        }
      });
    }
  }

  Future<void> _logout() async {
    await _storage.delete(key: 'access_token');
    ref.invalidate(userProvider);
    ref.invalidate(farmsProvider);
    if (mounted) {
      Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final name = _user?['name']?.toString().trim();
    final phone = _user?['phone']?.toString().trim();
    final displayName = (name != null && name.isNotEmpty && name != 'null' && name != 'Unknown User')
        ? name
        : (phone != null && phone.isNotEmpty ? 'Farmer ($phone)' : 'Registered Farmer');
    final avatarLetter = displayName.isNotEmpty ? displayName.substring(0, 1).toUpperCase() : 'F';

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
              title: const Text('Farmer Profile', style: TextStyle(color: AgriShieldTheme.onSurface, fontWeight: FontWeight.w600, fontSize: 20)),
              actions: [
                if (_isEditing)
                  IconButton(
                    icon: _isSaving 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AgriShieldTheme.primary))
                        : const Icon(Icons.check, color: AgriShieldTheme.primary),
                    onPressed: _isSaving ? null : _saveProfile,
                  )
                else
                  IconButton(
                    icon: const Icon(Icons.edit, color: AgriShieldTheme.onSurfaceVariant),
                    onPressed: () {
                      _nameController.text = displayName;
                      setState(() => _isEditing = true);
                    },
                  ),
                IconButton(
                  icon: const Icon(Icons.logout, color: AgriShieldTheme.error),
                  onPressed: _logout,
                )
              ],
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AgriShieldTheme.primary))
          : _user == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Failed to load profile.', style: TextStyle(color: AgriShieldTheme.onSurfaceVariant)),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _fetchProfile,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : ListView(
                  padding: EdgeInsets.only(
                    top: MediaQuery.of(context).padding.top + 76,
                    left: 16, right: 16, bottom: 100,
                  ),
                  children: [
                    Center(
                      child: CircleAvatar(
                        radius: 48,
                        backgroundColor: AgriShieldTheme.primary,
                        child: Text(
                          avatarLetter,
                          style: const TextStyle(fontSize: 34, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_isEditing)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _nameController,
                              autofocus: true,
                              decoration: InputDecoration(
                                labelText: 'Farmer Name',
                                hintText: 'Enter your full name',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                suffixIcon: IconButton(
                                  icon: const Icon(Icons.check, color: AgriShieldTheme.primary),
                                  onPressed: _isSaving ? null : _saveProfile,
                                ),
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () => setState(() => _isEditing = false),
                              child: const Text('Cancel', style: TextStyle(color: AgriShieldTheme.onSurfaceVariant)),
                            ),
                          ],
                        ),
                      )
                    else
                      Center(
                        child: InkWell(
                          onTap: () {
                            _nameController.text = displayName;
                            setState(() => _isEditing = true);
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  displayName,
                                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.edit, size: 18, color: AgriShieldTheme.primary),
                              ],
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 6),
                    Center(
                      child: Text(
                        phone != null && phone.isNotEmpty ? '+91 $phone' : '',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: AgriShieldTheme.onSurfaceVariant),
                      ),
                    ),
                    const SizedBox(height: 28),
                    _buildInfoCard("PMFBY Role", (_user?['role'] ?? 'FARMER').toString().toUpperCase()),
                    const SizedBox(height: 12),
                    _buildInfoCard("Identity Method", "Phone OTP Verified (Aadhaar Linked)"),
                    const SizedBox(height: 12),
                    _buildInfoCard("Account Status", "Active • Verified Farmer"),
                  ],
                ),
    );
  }

  Widget _buildInfoCard(String title, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AgriShieldTheme.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }
}
