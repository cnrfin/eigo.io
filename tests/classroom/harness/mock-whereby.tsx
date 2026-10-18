import * as React from 'react'
const g = globalThis as any
export function WherebyProvider({ children }: any) { return <>{children}</> }
export async function getUsableCameraEffectPresets() { return ['blur', 'heavy-blur', 'cabin'] }
export async function isAudioDenoiserSupported() { return true }
export function useLocalMedia() {
  const [cam, setCam] = React.useState(true)
  const [mic, setMic] = React.useState(true)
  return { state: { localStream: g.fakeStream, isCameraEnabled: cam, isMicrophoneEnabled: mic, cameraDevices: [{ deviceId: 'c1', label: 'FaceTime HD' }], microphoneDevices: [{ deviceId: 'm1', label: 'MacBook Mic' }], speakerDevices: [{ deviceId: 'default', label: 'Speakers' }], currentCameraDeviceId: 'c1', currentMicrophoneDeviceId: 'm1', startError: null },
    actions: { toggleCameraEnabled: (v: boolean) => setCam(v), toggleMicrophoneEnabled: (v: boolean) => setMic(v), setCameraDevice() {}, setMicrophoneDevice() {}, setSpeakerDevice() {} } }
}
const handlers: Record<string, Function[]> = {}
g.emitWhereby = (type: string, e: any) => (handlers[type] || []).forEach((f) => f({ type, ...e }))
const events = { on: (t: string, f: Function) => { (handlers[t] ||= []).push(f) }, off: (t: string, f: Function) => { handlers[t] = (handlers[t] || []).filter((x) => x !== f) } }
export function useRoomConnection() {
  const [, force] = React.useState(0)
  g.forceRoom = () => force((n) => n + 1)
  const s = g.roomState
  const log = (n: string) => (...a: any[]) => { g.log.push(n + (a.length ? ':' + JSON.stringify(a) : '')) }
  return { state: s, actions: { joinRoom: async () => { g.log.push('joinRoom'); s.connectionStatus = 'connected'; force((n) => n + 1) }, leaveRoom: () => g.log.push('leaveRoom'), endMeeting: () => g.log.push('endMeeting'),
    toggleCamera: log('toggleCamera'), toggleMicrophone: log('toggleMicrophone'), stopCloudRecording: () => g.log.push('stopCloudRecording'),
    startScreenshare: log('startScreenshare'), stopScreenshare: log('stopScreenshare'), muteParticipants: log('muteParticipants'), askToSpeak: log('askToSpeak'),
    askToTurnOnScreenshare: log('askToTurnOnScreenshare'), stopParticipantScreenshare: log('stopParticipantScreenshare'),
    switchCameraEffect: async (id: string) => g.log.push('switchCameraEffect:' + id), clearCameraEffect: async () => g.log.push('clearCameraEffect'),
    enableAudioDenoiser: async () => g.log.push('enableAudioDenoiser'), disableAudioDenoiser: async () => g.log.push('disableAudioDenoiser'),
    toggleHdMode: log('toggleHdMode'), toggleLowDataMode: log('toggleLowDataMode') }, events }
}
export const VideoView = React.forwardRef(function VV(p: any, ref: any) { return <video ref={ref} data-stream={p.stream?.id} /> })
