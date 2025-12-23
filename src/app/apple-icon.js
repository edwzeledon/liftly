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
        {/* Snapshot Frame Concept */}
        <svg
          width="600"
          height="600"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Soft Frame - Open at top right to suggest "capture now" / imperfection */}
          <path
            d="M 75 18 
               H 35 
               C 22 18, 15 25, 15 38 
               V 62 
               C 15 75, 22 82, 35 82 
               H 65 
               C 78 82, 85 75, 85 62 
               V 38"
            stroke="#EBE9E4" // Bone / Off-white
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Minimal Internal Mark - Geometric Glyph (Nutrition + Training) */}
          {/* Echo - Temporal Continuity */}
          <circle 
            cx="56" 
            cy="50" 
            r="14" 
            fill="#EBE9E4" 
            style={{ opacity: 0.25 }}
          />
          {/* A balanced circle representing the "whole" or "focus" */}
          <circle 
            cx="50" 
            cy="50" 
            r="14" 
            fill="#EBE9E4" 
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
