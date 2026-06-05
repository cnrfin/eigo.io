import { redirect } from 'next/navigation'

// Settings now lives inside the dashboard chrome.
export default function SettingsRedirect() {
  redirect('/dashboard/settings')
}
