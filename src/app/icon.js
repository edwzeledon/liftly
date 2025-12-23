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
          background: '#3B3042', // Deep desaturated purple
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
            d="M50 20 
               C 75 20, 85 40, 85 60
               C 85 85, 65 90, 50 90
               C 35 90, 15 85, 15 60
               C 15 40, 25 20, 50 20
               Z"
            fill="#EBE9E4" // Bone
          />
        </svg>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  )
}
