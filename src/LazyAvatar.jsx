import React, { useState } from 'react';

const LazyAvatar = ({ user, tenantThemeColor }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const placeholder = (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${tenantThemeColor}, var(--bg2))`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      {(user.name || 'U')[0]?.toUpperCase()}
    </div>
  );

  if (user.photoUrl) {
    return (
      <div style={{ position: 'relative', width: 36, height: 36 }}>
        {!isLoaded && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            {placeholder}
          </div>
        )}
        <img
          alt={user.name || 'Avatar'}
          src={user.photoUrl}
          width={36}
          height={36}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s ease', position: 'relative', zIndex: 1 }}
        />
      </div>
    );
  }

  return placeholder;
};

export default LazyAvatar;