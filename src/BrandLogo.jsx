import React, { useState, useEffect } from 'react';
import { BRAND } from './brand.js';
import { useStore } from './store.js';

const CACHE_KEY = 'cyc-logo-url';

/**
 * Logo de Cabrera & Consultores.
 * Orden de búsqueda: logo subido en Administración → copia en caché del navegador
 * → archivo /public/brand/logo-cyc.png → monograma tipográfico C&C.
 */
export default function BrandLogo({ size = 32, variant = 'full', showProduct = false, light = false }) {
  const orgLogo = useStore((s) => s.currentOrganization?.logo_url);
  let cached = null;
  try { cached = localStorage.getItem(CACHE_KEY); } catch { /* sin almacenamiento */ }

  const candidates = [orgLogo, cached, BRAND.logo].filter((v, i, a) => v && a.indexOf(v) === i);
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [orgLogo]);
  useEffect(() => {
    if (orgLogo) { try { localStorage.setItem(CACHE_KEY, orgLogo); } catch { /* ignore */ } }
  }, [orgLogo]);

  const src = candidates[idx];
  const imgOk = !!src;
  const ink = light ? '#E6EDF1' : 'var(--text)';
  const sub = light ? 'rgba(230,237,241,.7)' : 'var(--text3)';

  const mark = imgOk ? (
    <img
      key={src}
      src={src}
      alt={BRAND.name}
      onError={() => setIdx((i) => i + 1)}
      style={{
        height: size, width: 'auto', maxWidth: size * 5, objectFit: 'contain', display: 'block',
        ...(light ? { background: 'rgba(255,255,255,.96)', padding: size * 0.12, borderRadius: 6, boxSizing: 'content-box' } : {}),
      }}
    />
  ) : (
    <div
      aria-label={BRAND.name}
      style={{
        width: size, height: size, borderRadius: size * 0.2, flexShrink: 0,
        background: 'linear-gradient(180deg,#3A3A3C,#1D1D1F)', color: '#F5F5F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: BRAND.fonts.display, fontWeight: 600, fontSize: size * 0.38, letterSpacing: '-0.03em',
        boxShadow: '0 1px 2px rgba(0,0,0,.2)',
      }}
    >
      CC
    </div>
  );

  if (variant === 'mark') return mark;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {mark}
      {(!imgOk || size < 44) && (
        <div style={{ lineHeight: 1.15, minWidth: 0 }}>
          <div style={{ fontFamily: BRAND.fonts.display, fontWeight: 600, letterSpacing: '-0.02em', fontSize: size * 0.48, color: ink, whiteSpace: 'nowrap' }}>{BRAND.name}</div>
          {showProduct && <div style={{ fontSize: Math.max(10, size * 0.32), color: sub, whiteSpace: 'nowrap' }}>{BRAND.product}</div>}
        </div>
      )}
      {imgOk && size >= 44 && showProduct && (
        <div className="brand-product" style={{ fontSize: Math.max(10, size * 0.34), color: sub, whiteSpace: 'nowrap', borderLeft: '1px solid var(--border)', paddingLeft: 10, fontWeight: 400 }}>
          {BRAND.product}
        </div>
      )}
    </div>
  );
}
