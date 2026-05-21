interface IconProps {
  size?: number;
  className?: string;
}

const stroke = { stroke: 'currentColor', strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const FullscreenIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const ExitFullscreenIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </svg>
);

export const DownloadIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" />
  </svg>
);

export const ShareIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <circle cx="6" cy="12" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M8 11l8-4M8 13l8 4" />
  </svg>
);

export const ChevronIcon = ({ size = 12, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const RecordDotIcon = ({ size = 10, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 10 10" className={className}>
    <circle cx="5" cy="5" r="4" fill="#ff3636" />
  </svg>
);

export const EyeIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...stroke}>
    <path d="M2 12s3.5-7 10-7c2 0 3.7.5 5.2 1.3M22 12s-3.5 7-10 7c-2 0-3.7-.5-5.2-1.3M3 3l18 18" />
  </svg>
);
