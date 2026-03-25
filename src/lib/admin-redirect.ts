const ADMIN_EMAILS = ['cnrfin93@gmail.com']

export function isAdminEmail(email: string | undefined | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}

export function getPostLoginPath(email: string | undefined | null): string {
  return isAdminEmail(email) ? '/admin' : '/dashboard'
}
