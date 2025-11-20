'use client';

import { PixelCanvas } from "@/components/pixel-canvas";
import Link from "next/link";
import { useEffect } from "react";

export default function CanvaPage() {
  

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    
    document.body.style.overflow = 'hidden';
    
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('wheel', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventPinchZoom, { passive: false });
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('wheel', preventZoom);
      document.removeEventListener('touchmove', preventPinchZoom);
    };
  }, []);

  return (
    <main className="min-h-screen touch-none">
      <div className="absolute top-4 right-4 z-10">
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-brand/20 hover:border-brand/40 transition-colors"
          aria-label="Retour à la page d'accueil">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Link>
      </div>
      <div className="max-w">
        <PixelCanvas />
      </div>
    </main>
  );
}
