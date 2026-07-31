import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#2B1416',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', width: 260, height: 260, gap: 20 }}>
          {/* Top Left */}
          <div style={{ width: 120, height: 120, backgroundColor: '#F3EFE6', borderRadius: 20 }} />
          
          {/* Top Right (Folder) */}
          <div style={{ width: 120, height: 120, display: 'flex' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Back of folder */}
              <path d="M10 20C10 14.477 14.477 10 20 10H45C48 10 50 12 52 15L60 25H100C105.523 25 110 29.477 110 35V100C110 105.523 105.523 110 100 110H20C14.477 110 10 105.523 10 100V20Z" fill="#F3EFE6"/>
              {/* Cutout to show inside */}
              <path d="M20 35H100V100H20V35Z" fill="#2B1416"/>
              {/* Front flap */}
              <path d="M15 45C15 40 18 38 22 38H110C115 38 118 42 117 47L107 102C106 107 102 110 97 110H20C15 110 12 105 13 100L15 45Z" fill="#F3EFE6"/>
            </svg>
          </div>

          {/* Bottom Left */}
          <div style={{ width: 120, height: 120, backgroundColor: '#F3EFE6', borderRadius: 20 }} />
          
          {/* Bottom Right */}
          <div style={{ width: 120, height: 120, backgroundColor: '#F3EFE6', borderRadius: 20 }} />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
