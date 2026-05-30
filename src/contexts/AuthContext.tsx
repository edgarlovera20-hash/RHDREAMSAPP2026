import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { NetworkBackground } from '@/components/layout/NetworkBackground';
import { Crown, Telescope, ClipboardList, UserPlus, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { seedDatabaseIfEmpty } from '@/services/db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: (roleDisplayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mockUser, setMockUser] = useState<any>({
    uid: 'demo_guest_user_admin',
    email: 'admin@omnirecruit.ai',
    displayName: 'Gerente / Admin',
    emailVerified: true,
    isAnonymous: true,
    providerData: []
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Seed database if empty directly on startup
    seedDatabaseIfEmpty();
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setMockUser(null);
        seedDatabaseIfEmpty();
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
      console.warn('Firebase anonymous Auth failed/not enabled, falling back to mock guest session:', error);
      const tempUser = {
        uid: 'demo_guest_user_' + roleDisplayName.replace(/\s+/g, '_').toLowerCase(),
        email: `${roleDisplayName.replace(/\s+/g, '.').toLowerCase()}@omnirecruit.ai`,
        displayName: roleDisplayName,
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
      seedDatabaseIfEmpty();
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
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'radial-gradient(circle at center, #0B1729 0%, #081220 55%, #050505 100%)' }}>
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
    <AuthContext.Provider value={{ user: activeUser, loading, accessToken, signInWithGoogle, signInAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
