import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers.dart';
import 'dashboard_screen.dart';
import 'notifications_screen.dart';
import 'add_farm_screen.dart';
import 'file_claim_screen.dart';
import 'profile_screen.dart';
import '../../theme.dart';

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {

  final List<Widget> _screens = [
    const DashboardScreen(),
    const AddFarmScreen(),
    const FileClaimScreen(),
    const NotificationsScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = ref.watch(bottomNavIndexProvider);

    return Scaffold(
      extendBody: true, // Needed for transparent bottom nav
      body: IndexedStack(
        index: currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: BottomNavigationBar(
            elevation: 0,
            backgroundColor: AgriShieldTheme.surface.withValues(alpha: 0.9),
            type: BottomNavigationBarType.fixed,
            currentIndex: currentIndex,
            selectedItemColor: AgriShieldTheme.primaryContainer,
            unselectedItemColor: AgriShieldTheme.onSurfaceVariant,
            selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
            onTap: (index) {
              ref.read(bottomNavIndexProvider.notifier).state = index;
            },
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(icon: Icon(Icons.eco_outlined), activeIcon: Icon(Icons.eco), label: 'Farms'),
              BottomNavigationBarItem(icon: Icon(Icons.shield_outlined), activeIcon: Icon(Icons.shield), label: 'Insurance'),
              BottomNavigationBarItem(icon: Icon(Icons.notifications_outlined), activeIcon: Icon(Icons.notifications), label: 'Alerts'),
              BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
            ],
          ),
        ),
      ),
    );
  }
}
