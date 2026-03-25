'use client'

import { Squircle, type SquircleProps } from '@squircle-js/react'
import { ComponentPropsWithoutRef } from 'react'

type SquircleBoxProps = SquircleProps & ComponentPropsWithoutRef<'div'>

export default function SquircleBox({
  cornerRadius = 16,
  cornerSmoothing = 0.8,
  children,
  ...props
}: SquircleBoxProps) {
  return (
    <Squircle
      cornerRadius={cornerRadius}
      cornerSmoothing={cornerSmoothing}
      {...props}
    >
      {children}
    </Squircle>
  )
}
