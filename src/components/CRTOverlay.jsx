import React from 'react';

export default function CRTOverlay() {
  return (
    <div className="crt pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.8)_100%)]" />
    </div>
  );
}