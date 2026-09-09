import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'theme.dart';
import 'ui/screens/onboarding_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: AgriShieldApp(),
    ),
  );
}

class AgriShieldApp extends StatelessWidget {
  const AgriShieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AgriShield',
      theme: AgriShieldTheme.lightTheme,
      home: const OnboardingScreen(),
    );
  }
}
