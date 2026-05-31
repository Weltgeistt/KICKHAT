import React, { useRef, useState, useLayoutEffect } from 'react';
import { useChatStore } from '../store/chatStore';

const SPEED = 95; // px/sn — kayma hızı

const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14l-1.7-3.4a2 2 0 0 1-.3-1V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v7.6a2 2 0 0 1-.3 1L5 17z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function PinnedMessageBar() {
  const { pinnedMessage, clearPinnedMessage, featuredMessages, clearFeatured } = useChatStore();
  const trackRef = useRef(null);
  const groupRef = useRef(null);
  const [layout, setLayout] = useState({ copies: 2, shift: 0, duration: 10 });

  // Sabit mesaj + öne çıkarılanları tek listede topla (boş içerikliler hariç)
  const hasText = (m) => (m?.content || '').trim().length > 0;
  const items = [];
  if (pinnedMessage && hasText(pinnedMessage)) items.push({ ...pinnedMessage, pin: true });
  featuredMessages.forEach((m) => { if (hasText(m)) items.push(m); });

  const key = items.map((m) => m.id).join(',');

  // Tek grup genişliğini ölç → şeridi dolduracak kadar kopya üret (boşluksuz akış)
  useLayoutEffect(() => {
    const track = trackRef.current;
    const group = groupRef.current;
    if (!track || !group) return;
    const measure = () => {
      const trackW = track.clientWidth;
      const groupW = group.getBoundingClientRect().width;
      if (groupW < 1) return;
      const copies = Math.ceil(trackW / groupW) + 2; // en az ekranı + 1 grup doldur
      setLayout({ copies: Math.max(2, copies), shift: groupW, duration: Math.max(4, groupW / SPEED) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [key]);

  if (items.length === 0) return null;

  const renderGroup = (idx) => (
    <div className="pinned-group" key={idx} ref={idx === 0 ? groupRef : undefined} aria-hidden={idx > 0 || undefined}>
      {items.map((m, i) => (
        <span className="pinned-item" key={`${m.id}-${i}`}>
          {m.pin && <span className="pinned-item-pin"><PinIcon /></span>}
          <b style={{ color: m.color }}>{m.displayName || m.username}:</b> {m.content}
        </span>
      ))}
    </div>
  );

  const handleClose = () => { clearFeatured(); clearPinnedMessage(); };

  return (
    <div className="pinned-bar">
      <span className="pinned-icon"><PinIcon /></span>
      <div className="pinned-track" ref={trackRef}>
        <div
          className="pinned-scroll"
          style={{ '--shift': `${layout.shift}px`, animationDuration: `${layout.duration}s` }}
        >
          {Array.from({ length: layout.copies }, (_, i) => renderGroup(i))}
        </div>
      </div>
      <button className="pinned-close" onClick={handleClose} title="Şeridi temizle">
        <CloseIcon />
      </button>
    </div>
  );
}
