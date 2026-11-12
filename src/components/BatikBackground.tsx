import React from 'react';

export const BatikKawung = ({ className = "", size = 120, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="47" y="47" width="6" height="6" transform="rotate(45 50 50)" fill={color} />
    <path d="M50 48 C42 35 42 15 50 15 C58 15 58 35 50 48 Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
    <path d="M50 52 C42 65 42 85 50 85 C58 85 58 65 50 52 Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
    <path d="M48 50 C35 42 15 42 15 50 C15 58 35 58 48 50 Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
    <path d="M52 50 C65 42 85 42 85 50 C85 58 65 58 52 50 Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
    <circle cx="50" cy="28" r="3" fill={color} />
    <circle cx="50" cy="72" r="3" fill={color} />
    <circle cx="28" cy="50" r="3" fill={color} />
    <circle cx="72" cy="50" r="3" fill={color} />
    <circle cx="50" cy="50" r="10" stroke={color} strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);

export const BatikSongket = ({ className = "", size = 120, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="15" width="70" height="70" rx="4" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.05" />
    <rect x="25" y="25" width="50" height="50" rx="2" transform="rotate(45 50 50)" stroke={color} strokeWidth="1.5" />
    <path d="M50 35 L65 50 L50 65 L35 50 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
    <circle cx="50" cy="50" r="4" fill={color} />
    <circle cx="22" cy="22" r="2" fill={color} />
    <circle cx="78" cy="22" r="2" fill={color} />
    <circle cx="22" cy="78" r="2" fill={color} />
    <circle cx="78" cy="78" r="2" fill={color} />
  </svg>
);

export const BatikDayak = ({ className = "", size = 120, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10 L50 90" stroke={color} strokeWidth="2.5" />
    <path d="M50 15 L35 35 L45 35 L50 25 L55 35 L65 35 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
    <path d="M50 40 C30 30 20 50 32 62 C40 70 50 60 42 52 C36 46 30 54 36 58" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M50 40 C70 30 80 50 68 62 C60 70 50 60 58 52 C64 46 70 54 64 58" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M50 70 L30 88 M50 70 L70 88" stroke={color} strokeWidth="2" />
    <circle cx="50" cy="40" r="4" fill={color} />
    <circle cx="50" cy="70" r="3" fill={color} />
    <polygon points="50,5 54,12 50,19 46,12" fill={color} />
  </svg>
);

export const BatikToraja = ({ className = "", size = 120, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="15" width="70" height="70" rx="3" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.05" />
    <path d="M50 15 L85 50 L50 85 L15 50 Z" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.15" />
    <path d="M25 50 C25 35 35 25 50 25 C65 25 75 35 75 50" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M25 50 C25 65 35 75 50 75 C65 75 75 65 75 50" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <rect x="42" y="42" width="16" height="16" transform="rotate(45 50 50)" fill={color} />
    <circle cx="50" cy="15" r="3" fill={color} />
    <circle cx="50" cy="85" r="3" fill={color} />
    <circle cx="15" cy="50" r="3" fill={color} />
    <circle cx="85" cy="50" r="3" fill={color} />
  </svg>
);

export const BatikAsmat = ({ className = "", size = 120, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="35" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.05" />
    <circle cx="50" cy="50" r="20" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
    <path d="M50 15 C30 15 20 35 35 50 C50 65 65 35 50 20 C42 10 25 25 30 40" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M50 85 C70 85 80 65 65 50 C50 35 35 65 50 80 C58 90 75 75 70 60" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M50 10 L50 2" stroke={color} strokeWidth="2" />
    <path d="M50 90 L50 98" stroke={color} strokeWidth="2" />
    <path d="M10 50 L2 50" stroke={color} strokeWidth="2" />
    <path d="M90 50 L98 50" stroke={color} strokeWidth="2" />
    <circle cx="50" cy="50" r="5" fill={color} />
  </svg>
);

export const BatikGunungan = ({ className = "", size = 120, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="50" y1="90" x2="50" y2="20" stroke={color} strokeWidth="3" />
    <path d="M50 15 L25 50 L35 50 L50 30 L65 50 L75 50 Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
    <path d="M50 35 L15 80 L30 80 L50 55 L70 80 L85 80 Z" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2" />
    <line x1="50" y1="40" x2="30" y2="40" stroke={color} strokeWidth="2" />
    <line x1="50" y1="40" x2="70" y2="40" stroke={color} strokeWidth="2" />
    <line x1="50" y1="60" x2="20" y2="60" stroke={color} strokeWidth="2" />
    <line x1="50" y1="60" x2="80" y2="60" stroke={color} strokeWidth="2" />
    <line x1="10" y1="90" x2="90" y2="90" stroke={color} strokeWidth="3.5" />
  </svg>
);

export const BatikStar = ({ className = "", size = 120, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10 L60 40 L50 50 L40 40 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    <path d="M50 90 L60 60 L50 50 L40 60 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    <path d="M10 50 L40 40 L50 50 L40 60 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    <path d="M90 50 L60 40 L50 50 L60 60 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    <path d="M50 50 L75 25 L65 40 Z" fill={color} stroke={color} strokeWidth="1.5" />
    <path d="M50 50 L25 75 L35 60 Z" fill={color} stroke={color} strokeWidth="1.5" />
    <path d="M50 50 L25 25 L35 40 Z" fill={color} stroke={color} strokeWidth="1.5" />
    <path d="M50 50 L75 75 L65 60 Z" fill={color} stroke={color} strokeWidth="1.5" />
    <circle cx="50" cy="50" r="6" fill="#ffffff" stroke={color} strokeWidth="2" />
    <circle cx="50" cy="50" r="2" fill={color} />
  </svg>
);

interface BatikBackgroundProps {
  themeId?: string;
}

export default function BatikBackground({ themeId = 'jawa' }: BatikBackgroundProps) {
  // Map theme to its primary color and motif rendering
  const getColorAndMotif = () => {
    switch (themeId) {
      case 'sumatera':
      case 'orchid':
        return { color: '#900C3F', motifColor: '#900C3F', motif: 'songket' };
      case 'kalimantan':
        return { color: '#0B5345', motifColor: '#0B5345', motif: 'dayak' };
      case 'sulawesi':
      case 'terracotta':
        return { color: '#A04000', motifColor: '#A04000', motif: 'toraja' };
      case 'papua':
      case 'saffron':
        return { color: '#512E5F', motifColor: '#512E5F', motif: 'asmat' };
      case 'jawa':
      case 'violet':
      default:
        return { color: '#0F2537', motifColor: '#0F2537', motif: 'kawung' };
    }
  };

  const { color, motifColor, motif } = getColorAndMotif();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Apple VisionOS Ambient Liquid Caustics & Fluid Glow Nodes tuned to regional theme */}
      <div 
        className="absolute -top-40 -left-40 w-[550px] h-[550px] rounded-full blur-[140px] pointer-events-none transition-all duration-700 opacity-25"
        style={{ backgroundColor: color }}
      />
      <div 
        className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none transition-all duration-700 opacity-20"
        style={{ backgroundColor: color }}
      />
      <div 
        className="absolute -bottom-48 left-1/4 w-[650px] h-[650px] rounded-full blur-[150px] pointer-events-none transition-all duration-700 opacity-18"
        style={{ backgroundColor: color }}
      />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-[130px] pointer-events-none bg-amber-400/10" />

      {/* Glass-Etched Cultural Vector Motifs */}
      <div className="absolute inset-0 transition-opacity duration-500 opacity-[0.24]">
      {motif === 'songket' && (
        <>
          <div className="absolute top-12 left-10 flex gap-4 rotate-6">
            <BatikSongket size={140} color={motifColor} />
            <BatikSongket size={100} color={motifColor} className="opacity-80" />
          </div>
          <div className="absolute top-1/4 right-16 flex gap-4 -rotate-12">
            <BatikSongket size={150} color={motifColor} />
            <BatikSongket size={110} color={motifColor} className="opacity-70" />
          </div>
          <div className="absolute bottom-16 left-24 flex gap-4 rotate-12">
            <BatikSongket size={130} color={motifColor} />
            <BatikSongket size={90} color={motifColor} className="opacity-80" />
          </div>
          <div className="absolute bottom-24 right-16 flex gap-4 -rotate-6">
            <BatikSongket size={160} color={motifColor} />
            <BatikSongket size={100} color={motifColor} className="opacity-80" />
            <BatikSongket size={70} color={motifColor} className="opacity-50 mt-3" />
          </div>
        </>
      )}

      {motif === 'kawung' && (
        <>
          <div className="absolute top-12 left-10 flex gap-4 rotate-12">
            <BatikKawung size={150} color={motifColor} />
            <BatikKawung size={110} color={motifColor} className="opacity-80" />
            <BatikKawung size={70} color={motifColor} className="opacity-50 mt-4" />
          </div>
          <div className="absolute top-1/3 right-1/4 flex gap-4 -rotate-12">
            <BatikKawung size={130} color={motifColor} />
            <BatikKawung size={90} color={motifColor} className="opacity-70" />
          </div>
          <div className="absolute bottom-16 left-24 flex gap-4 -rotate-6">
            <BatikKawung size={140} color={motifColor} />
            <BatikKawung size={90} color={motifColor} className="opacity-80" />
          </div>
          <div className="absolute bottom-20 right-20 flex gap-4 rotate-45">
            <BatikKawung size={160} color={motifColor} />
            <BatikKawung size={100} color={motifColor} className="opacity-80" />
            <BatikKawung size={60} color={motifColor} className="opacity-40" />
          </div>
        </>
      )}

      {motif === 'dayak' && (
        <>
          <div className="absolute top-12 left-10 flex gap-4 rotate-6">
            <BatikDayak size={150} color={motifColor} />
            <BatikDayak size={110} color={motifColor} className="opacity-80" />
          </div>
          <div className="absolute top-1/4 right-16 flex gap-4 -rotate-12">
            <BatikDayak size={140} color={motifColor} />
            <BatikDayak size={100} color={motifColor} className="opacity-70" />
          </div>
          <div className="absolute bottom-16 left-20 flex gap-4 rotate-12">
            <BatikDayak size={160} color={motifColor} />
            <BatikDayak size={110} color={motifColor} className="opacity-80" />
          </div>
          <div className="absolute bottom-20 right-20 flex gap-4 -rotate-6">
            <BatikDayak size={150} color={motifColor} />
            <BatikDayak size={90} color={motifColor} className="opacity-60 mt-2" />
          </div>
        </>
      )}

      {motif === 'toraja' && (
        <>
          <div className="absolute top-12 left-10 flex gap-4 -rotate-6">
            <BatikToraja size={140} color={motifColor} />
            <BatikToraja size={100} color={motifColor} className="opacity-80" />
          </div>
          <div className="absolute top-1/3 right-20 flex gap-4 rotate-12">
            <BatikToraja size={150} color={motifColor} />
            <BatikToraja size={100} color={motifColor} className="opacity-70" />
          </div>
          <div className="absolute bottom-16 left-24 flex gap-4 rotate-45">
            <BatikToraja size={130} color={motifColor} />
            <BatikToraja size={90} color={motifColor} className="opacity-80" />
          </div>
          <div className="absolute bottom-20 right-24 flex gap-4 -rotate-12">
            <BatikToraja size={160} color={motifColor} />
            <BatikToraja size={110} color={motifColor} className="opacity-80" />
          </div>
        </>
      )}

      {motif === 'asmat' && (
        <>
          <div className="absolute top-12 left-10 flex gap-4 rotate-12">
            <BatikAsmat size={150} color={motifColor} />
            <BatikAsmat size={110} color={motifColor} className="opacity-80" />
          </div>
          <div className="absolute top-1/4 right-16 flex gap-4 -rotate-12">
            <BatikAsmat size={140} color={motifColor} />
            <BatikAsmat size={100} color={motifColor} className="opacity-70" />
          </div>
          <div className="absolute bottom-16 left-24 flex gap-4 rotate-6">
            <BatikAsmat size={160} color={motifColor} />
            <BatikAsmat size={100} color={motifColor} className="opacity-80" />
          </div>
          <div className="absolute bottom-20 right-20 flex gap-4 -rotate-12">
            <BatikAsmat size={150} color={motifColor} />
            <BatikAsmat size={90} color={motifColor} className="opacity-60" />
          </div>
        </>
      )}
      </div>
    </div>
  );
}
