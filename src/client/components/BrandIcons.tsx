import React from 'react';

interface IconProps {
  className?: string;
}

/**
 * High-End Minimalist Monogram Emblem for OpenHouse:
 * Pure geometric architectural gable with modern archway portal.
 */
export function JuraganKosLogo({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer Modern Architectural House Shell */}
      <path
        d="M3 10.25L12 3.5L21 10.25V19.25C21 19.9404 20.4404 20.5 19.75 20.5H4.25C3.55964 20.5 3 19.9404 3 19.25V10.25Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path
        d="M2.5 10.5L12 3.25L21.5 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 9.5V19.25C4.5 19.9404 5.05964 20.5 5.75 20.5H18.25C18.9404 20.5 19.5 19.9404 19.5 19.25V9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner Minimalist Keyhole Arch Door */}
      <path
        d="M9.5 20.5V13.75C9.5 12.3693 10.6193 11.25 12 11.25C13.3807 11.25 14.5 12.3693 14.5 13.75V20.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="14.25" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Solid/Duotone Native Navigation Icons (iOS / Android Native Tab Bar Style)
 */
export function NavBerandaIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="8" height="9" rx="2.2" fill="currentColor" />
      <rect
        x="13"
        y="3"
        width="8"
        height="5.5"
        rx="2"
        fill="currentColor"
        fillOpacity="0.55"
      />
      <rect
        x="13"
        y="10.5"
        width="8"
        height="10.5"
        rx="2.2"
        fill="currentColor"
      />
      <rect
        x="3"
        y="14"
        width="8"
        height="7"
        rx="2"
        fill="currentColor"
        fillOpacity="0.55"
      />
    </svg>
  );
}

export function NavKamarIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 4.5C5 3.67157 5.67157 3 6.5 3H16.5C17.3284 3 18 3.67157 18 4.5V20H5V4.5Z"
        fill="currentColor"
      />
      <circle cx="14.75" cy="12" r="1.25" fill="#FFF" fillOpacity="0.85" />
      <rect
        x="3"
        y="19.5"
        width="18"
        height="1.75"
        rx="0.875"
        fill="currentColor"
      />
    </svg>
  );
}

export function NavTagihanIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 4.5C5 3.67157 5.67157 3 6.5 3H17.5C18.3284 3 19 3.67157 19 4.5V20.25L16.25 18.5L13.5 20.25L12 19.25L10.5 20.25L7.75 18.5L5 20.25V4.5Z"
        fill="currentColor"
      />
      <rect
        x="8.25"
        y="7.25"
        width="7.5"
        height="1.6"
        rx="0.8"
        fill="#FFF"
        fillOpacity="0.85"
      />
      <rect
        x="8.25"
        y="11"
        width="5"
        height="1.6"
        rx="0.8"
        fill="#FFF"
        fillOpacity="0.85"
      />
    </svg>
  );
}

export function NavKasIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5.5"
        width="18"
        height="13.5"
        rx="3"
        fill="currentColor"
      />
      <path
        d="M15 10.25H21V14.25H15C13.8954 14.25 13 13.3546 13 12.25C13 11.1454 13.8954 10.25 15 10.25Z"
        fill="#FFF"
        fillOpacity="0.3"
      />
      <circle cx="15.25" cy="12.25" r="1.1" fill="#FFF" />
    </svg>
  );
}

export function NavTimIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9.5" cy="8" r="3.5" fill="currentColor" />
      <path
        d="M3.5 18.25C3.5 15.3505 5.85051 13 8.75 13H10.25C13.1495 13 15.5 15.3505 15.5 18.25V19.5H3.5V18.25Z"
        fill="currentColor"
      />
      <circle
        cx="16.5"
        cy="9"
        r="2.5"
        fill="currentColor"
        fillOpacity="0.55"
      />
      <path
        d="M16.5 13.5C18.7091 13.5 20.5 15.2909 20.5 17.5V19.5H17V18C17 16.25 16.1 14.7 14.8 13.75C15.33 13.58 15.9 13.5 16.5 13.5Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
    </svg>
  );
}

export function NavPaketIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 8.5L12 4L20 8.5V15.5L12 20L4 15.5V8.5Z"
        fill="currentColor"
      />
      <path
        d="M12 12L19.5 8M12 12V19.5M12 12L4.5 8"
        stroke="#FFF"
        strokeOpacity="0.65"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function NavLainnyaIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6.5" cy="6.5" r="2.5" fill="currentColor" />
      <circle
        cx="17.5"
        cy="6.5"
        r="2.5"
        fill="currentColor"
        fillOpacity="0.6"
      />
      <circle
        cx="6.5"
        cy="17.5"
        r="2.5"
        fill="currentColor"
        fillOpacity="0.6"
      />
      <circle cx="17.5" cy="17.5" r="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Authentic WhatsApp Icon for WA Billing & Tenant Contact
 */
export function WhatsAppIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.03 2C6.5 2 2.02 6.48 2.02 12c0 1.77.46 3.49 1.34 5.01L2 22l5.13-1.34c1.47.8 3.14 1.22 4.89 1.22 5.53 0 10.01-4.48 10.01-10S17.56 2 12.03 2zm5.84 14.14c-.24.68-1.4 1.3-1.95 1.38-.51.08-1.16.11-1.88-.12-.44-.14-1-.33-1.71-.64-2.99-1.29-4.94-4.32-5.09-4.52-.15-.2-1.22-1.62-1.22-3.09 0-1.47.77-2.19 1.04-2.49.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.43-.07.67.51.24.58.82 2.01.89 2.16.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.17-.31.38-.45.51-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.05 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.13.65-.08.17-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.02.96.3.15.5.22.57.35.07.12.07.72-.17 1.4z" />
    </svg>
  );
}
