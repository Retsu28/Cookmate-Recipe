import React from 'react';

const AUTH_BACKGROUND_VIDEO =
  'https://res.cloudinary.com/drtr06hnf/video/upload/v1778771966/authformbackground_mk5gei.mp4';

export function AuthVideoBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-stone-950" aria-hidden="true">
      <video
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src={AUTH_BACKGROUND_VIDEO} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-stone-950/35" />
    </div>
  );
}

export default AuthVideoBackground;
