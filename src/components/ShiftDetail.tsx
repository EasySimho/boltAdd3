import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Calendar, Clock, Users, User, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredRoles: {
    [key: string]: number;
  };
  currentParticipants: number;
  maxParticipants: number;
  participants?: {
    [userId: string]: {
      role: string;
      name: string;
    };
  };
}

export function ShiftDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('');
  const [joining, setJoining] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    const fetchShift = async () => {
      if (!id) return;

      try {
        const shiftDoc = await getDoc(doc(db, 'shifts', id));
        if (shiftDoc.exists()) {
          setShift({
            id: shiftDoc.id,
            ...shiftDoc.data()
          } as Shift);
        }
      } catch (error) {
        console.error('Error fetching shifts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShift();
  }, [id, user, navigate, authLoading]);

  const handleJoinShift = async () => {
    if (!shift || !selectedRole || !auth.currentUser) return;

    setJoining(true);
    try {
      const shiftRef = doc(db, 'shifts', shift.id);
      const userRef = doc(db, 'profiles', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      await updateDoc(shiftRef, {
        [`participants.${auth.currentUser.uid}`]: {
          role: selectedRole,
          name: `${userData?.firstName} ${userData?.lastName}`,
        },
        currentParticipants: (shift.currentParticipants || 0) + 1
      });

      navigate('/shifts', { replace: true });
    } catch (error) {
      console.error('Error joining shift:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2001A]"></div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Turno non trovato</div>
      </div>
    );
  }

  const isShiftFull = shift.currentParticipants >= shift.maxParticipants;
  const userParticipating = shift.participants?.[auth.currentUser?.uid || ''];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-[#E2001A] text-white shadow-md">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <img src="/Emblema_CRI.svg" alt="CRI Logo" className="h-12 w-12" />
              <h1 className="text-2xl font-bold">Croce Rossa Italiana</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white/10 px-4 py-2 rounded-lg">
                <User className="h-5 w-5 mr-2" />
                <span className="font-medium">{user?.firstName} {user?.lastName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium bg-white text-[#E2001A] rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => navigate('/shifts')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Torna alla lista
        </button>

        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex items-center mb-8">
            <Calendar className="h-8 w-8 text-[#E2001A] mr-4" />
            <div>
              <h2 className="text-2xl font-bold">
                {format(parseISO(shift.date), "EEEE d MMMM yyyy", { locale: it })}
              </h2>
              <div className="text-gray-600 mt-1">
                {shift.startTime} - {shift.endTime}
              </div>
            </div>
          </div>

          <div className="grid gap-6 mb-8">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-[#E2001A] mr-3" />
                <span className="text-lg">Partecipanti</span>
              </div>
              <span className="text-lg font-medium">
                {shift.currentParticipants}/{shift.maxParticipants}
              </span>
            </div>

            <div className="space-y-4">
              {Object.entries(shift.requiredRoles).map(([role, count]) => {
                const participantsInRole = Object.entries(shift.participants || {})
                  .filter(([_, p]) => p.role === role);
                const isFilled = participantsInRole.length >= count;

                return (
                  <div key={role} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-medium">{role}</span>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        isFilled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {participantsInRole.length}/{count}
                      </span>
                    </div>
                    {participantsInRole.length > 0 && (
                      <div className="space-y-2">
                        {participantsInRole.map(([_, participant]) => (
                          <div key={participant.name} className="flex items-center text-gray-600">
                            <User className="h-4 w-4 mr-2 text-[#E2001A]" />
                            {participant.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!userParticipating && !isShiftFull && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleziona ruolo
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A]"
                >
                  <option value="">Seleziona un ruolo...</option>
                  {Object.entries(shift.requiredRoles).map(([role, count]) => {
                    const participantsInRole = Object.entries(shift.participants || {})
                      .filter(([_, p]) => p.role === role).length;
                    if (participantsInRole < count) {
                      return (
                        <option key={role} value={role}>
                          {role} ({participantsInRole}/{count})
                        </option>
                      );
                    }
                    return null;
                  })}
                </select>
              </div>

              <button
                onClick={handleJoinShift}
                disabled={!selectedRole || joining}
                className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#E2001A] hover:bg-[#c60017] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E2001A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joining ? 'Partecipazione...' : 'Partecipa al turno'}
              </button>
            </div>
          )}

          {userParticipating && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-700 font-medium">
                Sei iscritto a questo turno come: <strong>{userParticipating.role}</strong>
              </p>
            </div>
          )}

          {isShiftFull && !userParticipating && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-700 font-medium">
                Questo turno è al completo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}