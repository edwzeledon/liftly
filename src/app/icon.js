import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#4f46e5', // matches --color-training (globals.css)
          borderRadius: '20%',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
           <path
            d="M 75 18 H 35 C 22 18, 15 25, 15 38 V 62 C 15 75, 22 82, 35 82 H 65 C 78 82, 85 75, 85 62 V 38"
            stroke="#FFFFFF"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="56" cy="50" r="14" fill="#FFFFFF" style={{ opacity: 0.25 }} />
          <circle cx="50" cy="50" r="14" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  )
}
