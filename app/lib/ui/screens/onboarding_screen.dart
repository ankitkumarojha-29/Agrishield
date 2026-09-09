import 'package:flutter/material.dart';
import 'login_screen.dart';
import '../../theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> with SingleTickerProviderStateMixin {
  String _selectedLang = 'en';
  late AnimationController _pulseController;

  final Map<String, Map<String, String>> _languages = {
    'hi': {'title': 'हिंदी', 'subtitle': 'Hindi', 'icon': 'translate', 'btn': 'आगे बढ़ें'},
    'en': {'title': 'English', 'subtitle': 'English', 'icon': 'language', 'btn': 'Continue'},
    'mr': {'title': 'मराठी', 'subtitle': 'Marathi', 'icon': 'chat', 'btn': 'पुढे जा'},
    'te': {'title': 'తెలుగు', 'subtitle': 'Telugu', 'icon': 'record_voice_over', 'btn': 'కొనసాగించు'},
    'ta': {'title': 'தமிழ்', 'subtitle': 'Tamil', 'icon': 'forum', 'btn': 'தொடரவும்', 'span': '2'},
  };

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background blobs
          Positioned(
            top: -50,
            right: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AgriShieldTheme.primary.withValues(alpha: 0.05)),
            ),
          ),
          Positioned(
            bottom: -50,
            left: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AgriShieldTheme.secondary.withValues(alpha: 0.05)),
            ),
          ),
          
          SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                    child: Column(
                      children: [
                        // Graphic
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            AnimatedBuilder(
                              animation: _pulseController,
                              builder: (context, child) {
                                return Transform.scale(
                                  scale: 1.0 + (_pulseController.value * 0.1),
                                  child: Container(
                                    width: 130,
                                    height: 130,
                                    decoration: BoxDecoration(shape: BoxShape.circle, color: AgriShieldTheme.primary.withValues(alpha: 0.1)),
                                  ),
                                );
                              },
                            ),
                            Container(
                              width: 100,
                              height: 100,
                              decoration: const BoxDecoration(shape: BoxShape.circle, color: AgriShieldTheme.surfaceVariant),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Image.asset('assets/images/logo.webp', fit: BoxFit.contain),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        const Text('Welcome to AgriShield', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
                        const SizedBox(height: 8),
                        const Text(
                          'Select your preferred language to continue. You can change this later in settings.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 16, color: AgriShieldTheme.onSurfaceVariant),
                        ),
                        const SizedBox(height: 32),
                        
                        // Grid
                        Wrap(
                          spacing: 16,
                          runSpacing: 16,
                          children: _languages.entries.map((entry) {
                            final isSelected = _selectedLang == entry.key;
                            final isFullWidth = entry.value['span'] == '2';
                            return _buildLangCard(entry.key, entry.value, isSelected, isFullWidth);
                          }).toList(),
                        ),
                        const SizedBox(height: 100), // padding for bottom bar
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Bottom Bar
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AgriShieldTheme.surface.withValues(alpha: 0.9),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, -4))],
              ),
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (context) => const LoginScreen()));
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(_languages[_selectedLang]!['btn']!, style: const TextStyle(fontSize: 18)),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIconData(String iconName) {
    switch(iconName) {
      case 'translate': return Icons.translate;
      case 'language': return Icons.language;
      case 'chat': return Icons.chat;
      case 'record_voice_over': return Icons.record_voice_over;
      case 'forum': return Icons.forum;
      default: return Icons.language;
    }
  }

  Widget _buildLangCard(String code, Map<String, String> data, bool isSelected, bool isFullWidth) {
    return GestureDetector(
      onTap: () => setState(() => _selectedLang = code),
      child: Container(
        width: isFullWidth ? double.infinity : (MediaQuery.of(context).size.width - 48 - 16) / 2,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected ? AgriShieldTheme.primary.withValues(alpha: 0.05) : AgriShieldTheme.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? AgriShieldTheme.primary : Colors.transparent, width: 2),
          boxShadow: isSelected ? [] : [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8)],
        ),
        child: Stack(
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5)),
                  child: Icon(_getIconData(data['icon']!), color: AgriShieldTheme.primary),
                ),
                const SizedBox(height: 12),
                Text(data['title']!, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
                const SizedBox(height: 4),
                Text(data['subtitle']!, style: const TextStyle(fontSize: 12, color: AgriShieldTheme.onSurfaceVariant)),
              ],
            ),
            if (isSelected)
              const Positioned(
                top: 0,
                right: 0,
                child: Icon(Icons.check_circle, color: AgriShieldTheme.primary, size: 24),
              ),
          ],
        ),
      ),
    );
  }
}
