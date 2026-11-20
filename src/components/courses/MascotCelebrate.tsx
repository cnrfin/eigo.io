'use client'

import * as RiveGL from '@rive-app/react-webgl2'
import * as RiveCanvas from '@rive-app/react-canvas'
import type { RiveFile } from '@rive-app/react-webgl2'
import { useWebGL2 } from '@/lib/riveRenderer'

// Celebration dance on the lesson/level complete screen (teri-complete.riv /
// earl-complete.riv — earl for IELTS). Autoplaying State Machine 1 runs the
// "complete" animation. Pass a preloaded `file` (from useRiveFile) so the rig is
// ready before this mounts and the dance plays from frame 0 with no missed
// frames; falls back to loading `src`. Where WebGL2 can't be used
// (lib/riveRenderer) it draws with the canvas build, loading `src` itself: a file
// preloaded by the WebGL2 runtime can't be drawn by the canvas one.
type Props = { size?: number; src?: string; file?: RiveFile | null }

export default function MascotCelebrate(props: Props) {
  const gl = useWebGL2()
  const size = props.size ?? 180
  if (gl === null) return <div style={{ width: size, height: size }} />
  return gl ? <CelebrateGL {...props} /> : <CelebrateCanvas {...props} file={null} />
}

// both packages export the same API; typed against one so TypeScript doesn't mix their classes
function makeCelebrate(R: typeof RiveCanvas) {
  const { useRive, Layout, Fit, Alignment } = R
  return function Celebrate({ size = 180, src = '/rive/teri-complete.riv', file }: Props) {
    const { RiveComponent } = useRive({
      ...(file ? { riveFile: file as never } : { src }),
      stateMachines: 'State Machine 1', autoplay: true,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    }, { shouldUseIntersectionObserver: false })

    return <RiveComponent style={{ width: size, height: size }} />
  }
}

const CelebrateGL = makeCelebrate(RiveGL as unknown as typeof RiveCanvas)
const CelebrateCanvas = makeCelebrate(RiveCanvas)
