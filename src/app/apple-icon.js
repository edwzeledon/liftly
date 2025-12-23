import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 1024,
  height: 1024,
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
          background: '#3B3042', // Deep desaturated purple (Aubergine)
        }}
      >
        {/* Ritual Mark / Knot Symbol */}
        <svg
          width="600"
          height="600"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main grounded shape - abstract knot/seal */}
          <path
            d="M50 20 
               C 75 20, 85 40, 85 60
               C 85 85, 65 90, 50 90
               C 35 90, 15 85, 15 60
               C 15 40, 25 20, 50 20
               Z"
            fill="#EBE9E4" // Bone / Off-white
            style={{ opacity: 0.95 }}
          />
          {/* Inner negative space to suggest breath/body */}
          <path
            d="M50 35
               C 60 35, 65 45, 65 55
               C 65 70, 55 75, 50 75
               C 45 75, 35 70, 35 55
               C 35 45, 40 35, 50 35
               Z"
            fill="#3B3042" // Matches background
          />
          {/* Bottom weight detail */}
          <circle cx="50" cy="82" r="4" fill="#3B3042" />
        </svg>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  )
}
