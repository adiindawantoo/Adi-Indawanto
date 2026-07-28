import React from 'react';

interface TmiiLogoProps {
  className?: string;
  height?: number | string;
  color?: string;
}

export default function TmiiLogo({ className = "", height = "2.5rem", color = "#00d4ff" }: TmiiLogoProps) {
  return (
    <svg
      viewBox="0 0 1920 775"
      className={`select-none ${className}`}
      style={{ height }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      id="tmii-svg-logo"
    >
      <path
        d="M 1656.504,188 H 1503 v 537.5 c 0,0 -1.375,50.021 81.5,49 h 72.004 z m 263.494,0 h -153.504 v 537.5 c 0,0 -1.375,50.021 81.5,49 h 72.004 z M 1383,284 c -18,-72.5 -85.177,-110.5 -161.5,-110.5 -106.25,0 -189,77.75 -189,77.75 C 1024,238.5 991.5,173.5 881.75,173.5 772,173.5 708,244.75 708,244.75 L 603,173.5 C 487.25,173.5 430,254 430,254 v 53 h 133.333 v 418.5 c 0,0 -2.375,50.021 80.5,49 h 72.004 V 307 h 186.496 v 418.5 c 0,0 -2.375,50.021 80.5,49 h 72.004 V 307 h 185.496 v 418.5 c 0,0 -2.375,50.021 80.5,49 h 72.004 V 532 c 0,-83.353 6.183,-183.478 -9.837,-248 z M 291,173.5 V 0 H 139 V 175.173 C 113.374,180.537 39.281,200.352 0,256 v 51 h 139 v 269 c 0,0 -0.5,89.5 26,128 35.79,51.996 80.911,70.516 156.5,70.516 C 420.5,774.516 485,703 485,703 V 660.176 H 291 V 301 c 0,0 67,-14 114,-73 v -54.5 z"
        fill={color}
      />
    </svg>
  );
}
