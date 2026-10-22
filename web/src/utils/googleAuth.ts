/**
 * Google Identity Services (GIS) Web Integration Utility for AgriShield.
 * Provides official Google OAuth 2.0 Sign-In and account-linking callbacks.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          revoke: (hint: string, done: () => void) => void;
        };
      };
    };
  }
}

export interface GoogleCredentialResponse {
  credential: string; // The signed Google ID Token (JWT)
  select_by?: string;
  clientId?: string;
}

export function getGoogleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
}

/**
 * Initializes and renders the official Google Sign-In button into a container element.
 */
export function initGoogleSignIn(
  buttonContainer: HTMLElement,
  onSuccess: (credentialResponse: GoogleCredentialResponse) => void,
  onError?: (err: Error) => void,
  textType: 'continue_with' | 'signin_with' | 'signup_with' = 'continue_with'
): boolean {
  const clientId = getGoogleClientId();

  if (!clientId || clientId.includes('your_google_client_id')) {
    if (onError) {
      onError(
        new Error(
          'Google Client ID is not configured yet. Please set VITE_GOOGLE_CLIENT_ID in your web/.env file.'
        )
      );
    }
    return false;
  }

  if (typeof window === 'undefined' || !window.google?.accounts?.id) {
    if (onError) {
      onError(new Error('Google Identity Services library is still loading. Please try again.'));
    }
    return false;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => {
        if (response?.credential) {
          onSuccess(response);
        } else if (onError) {
          onError(new Error('No Google credentials returned.'));
        }
      },
      cancel_on_tap_outside: true,
    });

    buttonContainer.innerHTML = '';
    const containerWidth = buttonContainer.clientWidth || 360;
    const buttonWidth = Math.min(Math.max(containerWidth, 200), 400);

    window.google.accounts.id.renderButton(buttonContainer, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: textType,
      shape: 'rectangular',
      logo_alignment: 'left',
      width: buttonWidth,
    });

    return true;
  } catch (err: any) {
    if (onError) onError(err);
    return false;
  }
}
