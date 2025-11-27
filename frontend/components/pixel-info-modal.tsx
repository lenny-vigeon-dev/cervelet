'use client';

import { useEffect, useState } from 'react';
import { getPixelInfo, type PixelInfo } from '@/lib/firebase/get-pixel-info';

interface PixelInfoModalProps {
  x: number;
  y: number;
  canvasId?: string;
  onClose: () => void;
}

export function PixelInfoModal({ x, y, canvasId = 'main-canvas', onClose }: PixelInfoModalProps) {
  const [pixelInfo, setPixelInfo] = useState<PixelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPixelInfo() {
      setIsLoading(true);
      setError(null);

      try {
        const info = await getPixelInfo(x, y, canvasId);

        if (!info) {
          setError('This pixel has not been placed yet');
          setPixelInfo(null);
        } else {
          setPixelInfo(info);
        }
      } catch (err) {
        console.error('Error fetching pixel info:', err);
        setError('Failed to load pixel information');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPixelInfo();
  }, [x, y, canvasId]);

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  // Get Discord avatar URL
  const getAvatarUrl = (userId: string, avatarHash?: string) => {
    if (avatarHash) {
      return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
    }
    // Default Discord avatar
    const defaultAvatarIndex = parseInt(userId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e1e] border border-brand/20 rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Pixel ({x}, {y})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-gray-400">{error}</p>
          </div>
        )}

        {pixelInfo && (
          <div className="space-y-4">
            {/* Color swatch */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded border border-brand/20 shadow-lg"
                style={{ backgroundColor: pixelInfo.color }}
              />
              <div>
                <p className="text-sm text-gray-400">Color</p>
                <p className="text-white font-mono">{pixelInfo.color.toUpperCase()}</p>
              </div>
            </div>

            {/* User info */}
            <div className="border-t border-brand/10 pt-4">
              <p className="text-sm text-gray-400 mb-3">Placed by</p>
              <div className="flex items-center gap-3">
                <img
                  src={getAvatarUrl(pixelInfo.userId, pixelInfo.avatarUrl)}
                  alt={pixelInfo.username}
                  className="w-12 h-12 rounded-full border-2 border-brand/20"
                  onError={(e) => {
                    // Fallback to default avatar on error
                    const target = e.target as HTMLImageElement;
                    const defaultAvatarIndex = parseInt(pixelInfo.userId) % 5;
                    target.src = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
                  }}
                />
                <div>
                  <p className="text-white font-semibold">{pixelInfo.username}</p>
                  <p className="text-sm text-gray-400">{formatDate(pixelInfo.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
