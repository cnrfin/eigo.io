'use client'

import { useRive, Layout, Fit, Alignment, type RiveFile } from '@rive-app/react-webgl2'

// Celebration dance on the lesson/level complete screen (teri-complete.riv /
// earl-complete.riv — earl for IELTS). Autoplaying State Machine 1 runs the
// "complete" animation. Pass a preloaded `file` (from useRiveFile) so the rig is
// ready before this mounts and the dance plays from frame 0 with no missed
// frames; falls back to loading `src`.
export default function MascotCelebrate({
  size = 180, src = '/rive/teri-complete.riv', file,
}: { size?: number; src?: string; file?: RiveFile | null }) {
  const { RiveComponent } = useRive({
    ...(file ? { riveFile: file } : { src }),
    stateMachines: 'State Machine 1', autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  }, { shouldUseIntersectionObserver: false })

  return <RiveComponent style={{ width: size, height: size }} />
}
