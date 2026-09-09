import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'main_screen.dart';
import '../../theme.dart';
import '../../api/api_client.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final List<TextEditingController> _otpControllers = List.generate(6, (index) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = List.generate(6, (index) => FocusNode());
  bool _otpSent = false;
  bool _isLoading = false;
  String _phoneNumber = '';
  final _storage = const FlutterSecureStorage();

  @override
  void dispose() {
    _phoneController.dispose();
    for (var c in _otpControllers) { c.dispose(); }
    for (var n in _otpFocusNodes) { n.dispose(); }
    super.dispose();
  }

  void _sendOtp() {
    if (_phoneController.text.length == 10) {
      setState(() {
        _phoneNumber = _phoneController.text;
        _otpSent = true;
      });
      Future.delayed(const Duration(milliseconds: 100), () {
        _otpFocusNodes[0].requestFocus();
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid 10-digit number.')));
    }
  }

  Future<void> _verifyOtp() async {
    String otp = _otpControllers.map((c) => c.text).join();
    if (otp.length == 6) {
      setState(() => _isLoading = true);
      
      final client = ApiClient();
      final response = await client.post<Map<String, dynamic>>(
        '/auth/register-or-login',
        {'phone': _phoneNumber},
        (json) => json as Map<String, dynamic>
      );
      
      setState(() => _isLoading = false);

      if (response.success && response.data != null) {
        final token = response.data!['access_token'];
        if (token != null) {
          await _storage.write(key: 'access_token', value: token);
        }
        
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const MainScreen()),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Login failed: ${response.error?.message ?? "Unknown error"}'))
          );
        }
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid 6-digit OTP.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(),
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
            bottom: 50,
            left: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AgriShieldTheme.secondary.withValues(alpha: 0.05)),
            ),
          ),
          
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _otpSent ? _buildOtpStep() : _buildPhoneStep(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoneStep() {
    return Column(
      key: const ValueKey('phone'),
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            color: AgriShieldTheme.surfaceVariant,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Image.asset('assets/images/logo.webp', fit: BoxFit.contain),
            ),
          ),
        ),
        const SizedBox(height: 32),
        const Text('Welcome to AgriShield', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
        const SizedBox(height: 8),
        const Text('Secure your harvest, one tap at a time.', style: TextStyle(fontSize: 16, color: AgriShieldTheme.onSurfaceVariant)),
        const SizedBox(height: 48),
        
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(left: 4, bottom: 8),
              child: Text('Enter your Mobile Number', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ),
            Container(
              decoration: BoxDecoration(
                color: AgriShieldTheme.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: Row(
                children: [
                  Container(
                    margin: const EdgeInsets.all(4),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    decoration: BoxDecoration(
                      color: AgriShieldTheme.surfaceVariant.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: const [
                        Text('🇮🇳', style: TextStyle(fontSize: 18)),
                        SizedBox(width: 8),
                        Text('+91', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AgriShieldTheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      maxLength: 10,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, letterSpacing: 1.5),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        counterText: '',
                        hintText: '98765 43210',
                        contentPadding: EdgeInsets.symmetric(horizontal: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _sendOtp,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Text('Send OTP'),
              SizedBox(width: 8),
              Icon(Icons.arrow_forward),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOtpStep() {
    return Column(
      key: const ValueKey('otp'),
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: const BoxDecoration(
            color: AgriShieldTheme.secondaryContainer,
            shape: BoxShape.circle,
          ),
          child: const Center(
            child: Icon(Icons.sms, size: 32, color: AgriShieldTheme.onSecondaryContainer),
          ),
        ),
        const SizedBox(height: 16),
        const Text('Verify Number', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AgriShieldTheme.onSurface)),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('OTP sent to ', style: TextStyle(fontSize: 16, color: AgriShieldTheme.onSurfaceVariant)),
            Text('+91 $_phoneNumber', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AgriShieldTheme.onSurface)),
            IconButton(
              icon: const Icon(Icons.edit, size: 16, color: AgriShieldTheme.primary),
              onPressed: () => setState(() => _otpSent = false),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            )
          ],
        ),
        const SizedBox(height: 32),
        
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(6, (index) {
            return SizedBox(
              width: 45,
              height: 56,
              child: TextField(
                controller: _otpControllers[index],
                focusNode: _otpFocusNodes[index],
                textAlign: TextAlign.center,
                keyboardType: TextInputType.number,
                maxLength: 1,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  counterText: '',
                  filled: true,
                  fillColor: AgriShieldTheme.surfaceContainerLowest,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                ),
                onChanged: (value) {
                  if (value.isNotEmpty && index < 5) {
                    _otpFocusNodes[index + 1].requestFocus();
                  } else if (value.isEmpty && index > 0) {
                    _otpFocusNodes[index - 1].requestFocus();
                  }
                },
              ),
            );
          }),
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: _isLoading ? null : _verifyOtp,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_isLoading)
                const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              else ...[
                const Text('Verify & Login'),
                const SizedBox(width: 8),
                const Icon(Icons.check_circle),
              ]
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Didn\'t receive code? ', style: TextStyle(color: AgriShieldTheme.onSurfaceVariant)),
            TextButton(
              onPressed: () {},
              child: const Text('Resend Now'),
            )
          ],
        )
      ],
    );
  }
}
