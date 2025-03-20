import React, { useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserPlus, LogIn, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UserRegistration() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Per favore, inserisci nome e cognome');
      setLoading(false);
      return;
    }

    try {
      // Check if user already exists
      const profilesRef = collection(db, 'profiles');
      const q = query(
        profilesRef, 
        where('firstName', '==', firstName.trim()),
        where('lastName', '==', lastName.trim())
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // User exists, sign in with the existing account
        const existingProfile = querySnapshot.docs[0];
        const userCredential = await signInAnonymously(auth);
        
        await setDoc(doc(db, 'profiles', userCredential.user.uid), {
          ...existingProfile.data(),
          lastLoginAt: new Date().toISOString()
        });

        navigate(existingProfile.data().role === 'admin' ? '/admin' : '/shifts');
        return;
      }

      // New user registration
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      // Check if the user should be granted admin role
      const isAdmin = firstName.toLowerCase() === 'admin' && lastName.toLowerCase() === 'admin';

      await setDoc(doc(db, 'profiles', user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: isAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });

      // Redirect admin users to the admin dashboard
      navigate(isAdmin ? '/admin' : '/shifts');
    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore durante l\'accesso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
            <img src="/Emblema_CRI.svg" alt="CRI Logo" className="h-20 w-20" />
          </div>
          <h1 className="text-3xl font-bold text-[#E2001A]">Croce Rossa Italiana</h1>
          <p className="text-gray-800 mt-1 font-medium">Gestione Turni Adunata Alpini</p>
          <div className="mt-2 inline-block bg-[#E2001A]/10 text-[#E2001A] px-3 py-1 rounded-full text-sm font-medium">
            9-10-11 Maggio
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
            <LogIn size={22} />
            <span>Accedi</span>
          </h2>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 flex items-start">
              <div className="flex-shrink-0 mr-2">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E2001A] focus:border-transparent transition-all"
                placeholder="Inserisci il tuo nome"
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E2001A] focus:border-transparent transition-all"
                placeholder="Inserisci il tuo cognome"
                autoComplete="family-name"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#E2001A] hover:bg-[#c60017] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E2001A] disabled:opacity-50 transition-all font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin mr-2" />
                    <span>Accesso in corso...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={20} className="mr-2" />
                    <span>Accedi</span>
                  </>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Inserisci nome e cognome per accedere alla gestione turni</p>
          </div>
        </div>
        
        <div className="text-center mt-6 text-sm text-gray-500">
          © {new Date().getFullYear()} Croce Rossa Italiana
        </div>
      </div>
    </div>
  );
}