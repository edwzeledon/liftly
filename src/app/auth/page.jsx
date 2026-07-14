import { redirect } from 'next/navigation';

// Legacy /auth entry point. Forwards to the landing route with ?auth=1 so the
// LandingPage opens its auth panel. Preserves ?next= (a deep-link destination
// captured by the (app) layout's auth gate) so post-sign-in navigation can
// honor it. searchParams is a Promise in Next 15 server components.
export default async function AuthRedirect({ searchParams }) {
  const params = await searchParams;
  const next = params?.next;
  redirect('/?auth=1' + (next ? `&next=${encodeURIComponent(next)}` : ''));
}
