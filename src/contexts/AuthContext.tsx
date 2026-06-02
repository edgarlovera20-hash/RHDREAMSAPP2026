import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { NetworkBackground } from '@/components/layout/NetworkBackground';
import { Sparkles } from 'lucide-react';
import { ALLOWED_GOOGLE_WORKSPACE_EMAILS, GOOGLE_WORKSPACE_SCOPES } from '@/config/googleWorkspace';
import { API_TOKEN_STORAGE_KEY, apiUrl, readApiJson } from '@/lib/api';

interface AuthContextType {
  user: User | LocalUser | null;
  loading: boolean;
  accessToken: string | null;
  loginWithPassword: (username: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: (roleDisplayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

type LocalUser = {
  uid: string;
  email: string;
  displayName: string;
  role?: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerData: unknown[];
};

const LOCAL_SESSION_KEY = 'rhdreams_local_session';
const LOCAL_SESSION_USER_KEY = 'rhdreams_local_session_user';

const createLocalUser = (account: { uid: string; email: string; displayName: string; role?: string }): LocalUser => ({
  uid: account.uid,
  email: account.email,
  displayName: account.displayName,
  role: account.role,
  emailVerified: true,
  isAnonymous: false,
  providerData: []
});

const isAllowedGoogleEmail = (email?: string | null) => (
  Boolean(email && ALLOWED_GOOGLE_WORKSPACE_EMAILS.includes(email.trim().toLowerCase()))
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | LocalUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      const hasLocalSession = localStorage.getItem(LOCAL_SESSION_KEY) === 'true';
      if (hasLocalSession && !firebaseUser) {
        const sessionUser = localStorage.getItem(LOCAL_SESSION_USER_KEY);
        const apiToken = localStorage.getItem(API_TOKEN_STORAGE_KEY);
        if (sessionUser && apiToken) {
          try {
            setUser(createLocalUser(JSON.parse(sessionUser)));
            setLoading(false);
            return;
          } catch (_error) {
            localStorage.removeItem(LOCAL_SESSION_KEY);
            localStorage.removeItem(LOCAL_SESSION_USER_KEY);
            localStorage.removeItem(API_TOKEN_STORAGE_KEY);
          }
        }
      }

      if (!firebaseUser) {
        setAccessToken(null);
      } else if (firebaseUser.providerData.some((provider) => provider.providerId === 'google.com') && !isAllowedGoogleEmail(firebaseUser.email)) {
        setAccessToken(null);
        setUser(null);
        setLoading(false);
        signOut(auth).catch((error) => console.error('Error signing out unauthorized Google user', error));
        setErrorMsg('Este correo no tiene acceso a RHDreams.');
        return;
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithPassword = async (username: string, password: string) => {
    setErrorMsg(null);
    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const payload = await readApiJson<{ data?: { token: string; user: { uid: string; email: string; displayName: string; role?: string } } }>(response);
      const data = payload.data;
      if (!data?.token || !data.user) {
        throw new Error('La API no devolvio una sesion valida.');
      }

      localStorage.setItem(LOCAL_SESSION_KEY, 'true');
      localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(API_TOKEN_STORAGE_KEY, data.token);
      setAccessToken(null);
      setUser(createLocalUser(data.user));
      return true;
    } catch (error: any) {
      const message = error.message || 'Usuario o contraseña incorrectos.';
      setErrorMsg(message);
      return false;
    }
  };

  const signInWithGoogle = async () => {
    setErrorMsg(null);
    const provider = new GoogleAuthProvider();
    GOOGLE_WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({
      prompt: 'consent select_account'
    });

    try {
      const result = await signInWithPopup(auth, provider);
      if (!isAllowedGoogleEmail(result.user.email)) {
        await signOut(auth);
        setAccessToken(null);
        setUser(null);
        throw new Error('Este correo no tiene acceso a RHDreams. Usa una cuenta autorizada.');
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        setErrorMsg(null);
      }
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      setErrorMsg(error.message || 'Error al iniciar sesión con Google.');
      window.alert(error.message || 'Error al iniciar sesión con Google.');
    }
  };

  const signInAsGuest = async (roleDisplayName: string = 'Gerente / Admin') => {
    setErrorMsg(null);
    try {
      const { signInAnonymously } = await import('firebase/auth');
      const result = await signInAnonymously(auth);
      
      // Update profile displayName using Firebase auth if available
      try {
        const { updateProfile } = await import('firebase/auth');
        if (result.user) {
          await updateProfile(result.user, { displayName: roleDisplayName });
        }
      } catch (updateErr) {
        console.warn('Error updating profile display name, continuing...', updateErr);
      }
    } catch (error: any) {
      console.error('Firebase anonymous Auth failed/not enabled:', error);
      setErrorMsg(error.message || 'No se pudo iniciar sesión como invitado.');
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      localStorage.removeItem(LOCAL_SESSION_USER_KEY);
      localStorage.removeItem(API_TOKEN_STORAGE_KEY);
      setAccessToken(null);
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1d31] flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'radial-gradient(circle at center, #123659 0%, #0f2843 55%, #0c1d31 100%)' }}>
        <div className="opacity-15 absolute inset-0 pointer-events-none z-0">
          <NetworkBackground />
        </div>
        <div className="z-10 text-cyan-400 flex flex-col items-center">
          <div className="relative w-16 h-16 flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-[ping_1.5s_ease-in-out_infinite]" />
            <div className="absolute w-12 h-12 rounded-full border border-cyan-400/35 border-t-cyan-400 animate-spin" />
            <Sparkles className="w-5 h-5 text-[#00AFFF] animate-pulse" />
          </div>
          <span className="font-extrabold text-xs tracking-[0.2em] text-white uppercase opacity-90">Iniciando Red Neuronal</span>
          <span className="text-[10px] text-slate-500 mt-1 uppercase font-mono">Conectando a Heavenly Dreams Enterprise...</span>
        </div>
      </div>
    );
  }



  return (
    <AuthContext.Provider value={{ user, loading, accessToken, loginWithPassword, signInWithGoogle, signInAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
