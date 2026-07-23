import { useEffect } from 'react';
import { useAuthStore } from '../../store/index.js';
import { authAPI } from '../../services/api.js';
import { auth } from '../../config/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

// Initializes auth state from Firebase & localStorage on app start
export default function AuthInitializer({ children }) {
  const { user, setUser, setToken, setAuth } = useAuthStore();

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const names = (fbUser.displayName || fbUser.email?.split('@')[0] || 'User').split(' ');
        const authUser = {
          id: fbUser.uid,
          email: fbUser.email,
          firstName: names[0] || 'User',
          lastName: names.slice(1).join(' ') || '',
          role: fbUser.email === 'admin@cinemax.com' ? 'SUPER_ADMIN' : 'CUSTOMER',
          avatarUrl: fbUser.photoURL,
          isEmailVerified: fbUser.emailVerified,
          status: 'ACTIVE',
        };
        try {
          const token = await fbUser.getIdToken();
          setAuth(authUser, token);
        } catch (e) {
          console.error("Error getting id token:", e);
        }
      }
    });

    // Validate backend session token if present
    const token = localStorage.getItem('accessToken');
    if (token && !user) {
      authAPI.getMe()
        .then(({ data }) => {
          setUser(data.data.user);
          setToken(token);
        })
        .catch(() => {
          // Ignore backend failure if user state is already present locally or managed by Firebase
        });
    }

    return () => unsubscribe();
  }, []);

  return children;
}
