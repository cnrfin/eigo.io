const g = globalThis as any
export const supabase = {
  auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  realtime: { setAuth: async () => {} },
  channel: (name: string) => { const ch: any = { on: (_t: any, _f: any, cb: any) => { g.rtHandler = cb; return ch }, subscribe: () => ch, send: (m: any) => g.log.push('broadcast:' + JSON.stringify(m.payload)) }; g.log.push('channel:' + name); return ch },
  removeChannel: () => {},
}
