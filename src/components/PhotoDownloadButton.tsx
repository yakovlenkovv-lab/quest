import { useCallback } from 'react';

interface PhotoDownloadButtonProps {
  src: string;
  filename?: string;
  className?: string;
}

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default function PhotoDownloadButton({ src, filename = 'quest-photo.jpg', className }: PhotoDownloadButtonProps) {
  const handleClick = useCallback(async () => {
    try {
      if (src.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = src;
        a.download = filename;
        a.click();
      } else {
        const res = await fetch(src);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Fallback: open in new tab
      window.open(src, '_blank');
    }
  }, [src, filename]);

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      aria-label="Скачать фото"
    >
      <DownloadIcon />
    </button>
  );
}
