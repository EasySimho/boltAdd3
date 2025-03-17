import React, { useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserPlus } from 'lucide-react';
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src="/Emblema_CRI.svg" alt="CRI Logo" className="h-24 w-24 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-[#E2001A]">Croce Rossa Italiana</h1>
          <p className="text-gray-900 mt-2">Gestione Turni Adunata Alpini</p>
          <p className="text-gray-600 mt-2">9-10-11 Maggio</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-8">Accedi</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E2001A] focus:border-transparent"
                placeholder="Inserisci il tuo nome"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cognome</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E2001A] focus:border-transparent"
                placeholder="Inserisci il tuo cognome"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#E2001A] hover:bg-[#c60017] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E2001A] disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Accedi'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}