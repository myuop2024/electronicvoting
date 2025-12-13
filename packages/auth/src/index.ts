// ObserverNet Authentication Package
// Comprehensive auth with multiple access levels, MFA, and WebAuthn

export * from './types';
export * from './config';
export * from './permissions';
export * from './utils';
export * from './email';

// Re-export server and client modules for convenience
// Note: Use '@electronicvoting/auth/server' for server-side imports
// Note: Use '@electronicvoting/auth/client' for client-side imports
export { auth, handlers, signIn, signOut } from './server';
export { useSession, SessionProvider } from './client';
