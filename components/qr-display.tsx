"use client";

import QRCode from "react-qr-code";

interface QRDisplayProps {
  value: string;
  size?: number;
}

export function QRDisplay({ value, size = 200 }: QRDisplayProps) {
  return (
    <div className="inline-flex rounded-xl bg-white p-4">
      <QRCode value={value} size={size} level="M" />
    </div>
  );
}
