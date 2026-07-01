import { createContext, useContext, useState, useCallback } from 'react';
import AuthModal from '../components/AuthModal';

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [modal, setModal] = useState(null);

  const openAuth = useCallback((mode = 'login', options = {}) => {
    setModal({ mode, ...options });
  }, []);

  const closeAuth = useCallback(() => {
    setModal(null);
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuth, closeAuth }}>
      {children}
      {modal && (
        <AuthModal
          mode={modal.mode}
          pendingPrompt={modal.pendingPrompt}
          returnTo={modal.returnTo}
          onClose={closeAuth}
          onSuccess={modal.onSuccess}
        />
      )}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}
