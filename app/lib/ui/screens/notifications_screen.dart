import 'dart:ui';
import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../api/api_client.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final ApiClient _apiClient = ApiClient();
  List<dynamic> _notifications = [];
  bool _isLoading = true;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _pollingTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      _loadNotifications(silent: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadNotifications({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    
    final response = await _apiClient.get<List<dynamic>>(
      '/notifications',
      (json) => json as List<dynamic>,
    );

    if (mounted) {
      if (response.success && response.data != null) {
        setState(() {
          _notifications = response.data!;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
              title: const Text('Alerts', style: TextStyle(color: AgriShieldTheme.onSurface, fontWeight: FontWeight.w600, fontSize: 20)),
            ),
          ),
        ),
      ),
      body: _isLoading && _notifications.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(child: Text("No alerts to show."))
              : ListView.builder(
                  padding: EdgeInsets.only(
                    top: MediaQuery.of(context).padding.top + 76,
                    left: 16, right: 16, bottom: 100,
                  ),
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    final notif = _notifications[index];
                    String title = notif['title'] ?? 'Alert';
                    if (title == 'policy_status' && notif['message'].toString().contains('Welcome')) {
                      title = 'Welcome';
                    } else {
                      title = title.replaceAll('_', ' ').split(' ').map((str) => str.isNotEmpty ? '${str[0].toUpperCase()}${str.substring(1)}' : '').join(' ');
                    }
                    
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
                      child: _buildNotificationCard(
                        icon: Icons.notifications,
                        iconBg: AgriShieldTheme.secondaryContainer,
                        iconFg: AgriShieldTheme.onSecondaryContainer,
                        cardBg: notif['is_read'] == true 
                            ? AgriShieldTheme.surfaceVariant.withValues(alpha: 0.3)
                            : AgriShieldTheme.secondaryContainer.withValues(alpha: 0.2),
                        title: title,
                        titleColor: AgriShieldTheme.onSurface,
                        subtitle: notif['message'] ?? '',
                        subtitleColor: AgriShieldTheme.onSurfaceVariant,
                        metadata: notif['created_at']?.toString().substring(0, 10) ?? 'Just now',
                        metadataColor: AgriShieldTheme.secondaryContainer,
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildNotificationCard({
    required IconData icon,
    required Color iconBg,
    required Color iconFg,
    required Color cardBg,
    required String title,
    required Color titleColor,
    required String subtitle,
    required Color subtitleColor,
    required String metadata,
    required Color metadataColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4)],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, color: iconFg, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: titleColor)),
                const SizedBox(height: 4),
                Text(subtitle, style: TextStyle(fontSize: 14, color: subtitleColor)),
                const SizedBox(height: 8),
                Text(metadata, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: metadataColor)),
              ],
            ),
          )
        ],
      ),
    );
  }
}
