import 'package:flutter/material.dart';

class AgriShieldTheme {
  // Stitch extracted colors
  static const Color primary = Color(0xFF00602B);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFF1B7A3D);
  static const Color onPrimaryContainer = Color(0xFFABFFB8);

  static const Color secondary = Color(0xFF964900);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color secondaryContainer = Color(0xFFFF8927);
  static const Color onSecondaryContainer = Color(0xFF642F00);

  static const Color tertiaryFixed = Color(0xFFC7ECCA);
  static const Color onTertiaryFixed = Color(0xFF02210C);

  static const Color error = Color(0xFFBA1A1A);
  static const Color onError = Color(0xFFFFFFFF);
  static const Color errorContainer = Color(0xFFFFDAD6);
  static const Color onErrorContainer = Color(0xFF93000A);

  static const Color background = Color(0xFFF9F9F7);
  static const Color onBackground = Color(0xFF1A1C1B);
  
  static const Color surface = Color(0xFFF9F9F7);
  static const Color onSurface = Color(0xFF1A1C1B);
  static const Color surfaceVariant = Color(0xFFE2E3E1);
  static const Color onSurfaceVariant = Color(0xFF3F493F);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);

  // Custom warning/pending colors from code
  static const Color warningContainer = Color(0xFFFFF4E5);
  static const Color onWarningContainer = Color(0xFF8F5A00);
  static const Color warningDot = Color(0xFFE58F00);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme.light(
        primary: primary,
        onPrimary: onPrimary,
        primaryContainer: primaryContainer,
        onPrimaryContainer: onPrimaryContainer,
        secondary: secondary,
        onSecondary: onSecondary,
        secondaryContainer: secondaryContainer,
        onSecondaryContainer: onSecondaryContainer,
        error: error,
        onError: onError,
        errorContainer: errorContainer,
        onErrorContainer: onErrorContainer,
        surface: surface,
        onSurface: onSurface,
      ),
      scaffoldBackgroundColor: background,
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: onSurface,
        elevation: 0,
        centerTitle: false,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16.0),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: surfaceContainerLowest,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12.0),
          side: const BorderSide(color: surfaceVariant, width: 1),
        ),
      ),
    );
  }
}
