'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeSvg({ value, size = 180, className = '' }: QRCodeSvgProps) {
  const [svgXml, setSvgXml] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#1c1917',
        light: '#ffffff',
      },
    })
      .then((svg) => setSvgXml(svg))
      .catch(() => setSvgXml(''));
  }, [value]);

  if (!svgXml) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-100 rounded-xl text-stone-400 font-mono text-xs ${className}`}
        style={{ width: size, height: size }}
      >
        Loading QR...
      </div>
    );
  }

  return (
    <div
      className={`inline-block overflow-hidden rounded-xl bg-white p-2 shadow-xs border border-stone-200 ${className}`}
      dangerouslySetInnerHTML={{ __html: svgXml }}
      style={{ width: size, height: size }}
    />
  );
}
