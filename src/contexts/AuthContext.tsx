import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { NetworkBackground } from '@/components/layout/NetworkBackground';
import { Bot } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mockUser, setMockUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setMockUser(null);
      } else {
        setAccessToken(null);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    setErrorMsg(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Add Scopes for requested services
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/calendar');
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    provider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');
    provider.addScope('https://www.googleapis.com/auth/drive.readonly');
    provider.addScope('https://www.googleapis.com/auth/keep');

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        setErrorMsg(null);
      }
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      setErrorMsg(error.message || 'Error al iniciar sesión con Google.');
    }
  };

  const signInAsGuest = async () => {
    setErrorMsg(null);
    try {
      const { signInAnonymously } = await import('firebase/auth');
      await signInAnonymously(auth);
    } catch (error: any) {
      console.warn('Firebase anonymous Auth failed/not enabled, falling back to mock guest session:', error);
      const tempUser = {
        uid: 'demo_guest_user_123',
        email: 'demo@omnirecruit.ai',
        displayName: 'Demo Guest',
        emailVerified: true,
        isAnonymous: true,
        providerData: []
      };
      
      try {
        Object.defineProperty(auth, 'currentUser', {
          get: () => tempUser,
          configurable: true
        });
      } catch (e) {
        console.error('Error defining mock currentUser', e);
      }
      
      setMockUser(tempUser);
    }
  };

  const logout = async () => {
    try {
      setMockUser(null);
      try {
        delete (auth as any).currentUser;
      } catch (e) {}
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const activeUser = mockUser || user;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <NetworkBackground />
        <div className="z-10 animate-pulse text-cyan-500 flex flex-col items-center">
          <Bot className="w-12 h-12 mb-4" />
          <p>Cargando perfil de usuario...</p>
        </div>
      </div>
    );
  }

  if (!activeUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <NetworkBackground />
        <div className="z-10 bg-slate-900/80 p-8 rounded-2xl border border-slate-700/50 glass-panel flex flex-col items-center max-w-sm w-full">
          <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30">
            <Bot className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">OmniRecruit AI</h2>
          <p className="text-slate-400 text-center mb-8">Inicia sesión con Google de forma segura para gestionar los agentes de IA y la base de datos de recursos humanos.</p>
          
          {errorMsg && (
            <div className="w-full bg-rose-500/10 border border-rose-500/50 text-rose-500 text-sm p-3 rounded-lg flex items-start gap-2 mb-6">
              <span className="shrink-0 pt-0.5">⚠️</span>
              <p className="text-xs">{errorMsg}</p>
            </div>
          )}

          <button 
            onClick={signInWithGoogle}
            className="w-full bg-white text-slate-900 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-current">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center my-4 w-full text-slate-500 text-xs">
            <div className="flex-1 border-t border-slate-800"></div>
            <span className="px-3 uppercase tracking-wider text-[10px]">O</span>
            <div className="flex-1 border-t border-slate-800"></div>
          </div>

          <button 
            onClick={signInAsGuest}
            className="w-full bg-slate-800/80 hover:bg-slate-800 text-cyan-300 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700/50 hover:border-cyan-500/30 transition-all shadow-[0_0_15px_rgba(34,211,238,0.05)] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] cursor-pointer"
          >
            <Bot className="w-5 h-5 text-cyan-400" />
            Acceso Rápido / Demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: activeUser, loading, accessToken, signInWithGoogle, signInAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
