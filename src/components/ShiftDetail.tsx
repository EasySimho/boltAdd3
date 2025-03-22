import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Calendar, Clock, Users, User, LogOut, ChevronLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Shift {
  id: string;
  title: string;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#E2001A]"></div>
          <span className="text-gray-600 font-medium">Caricamento turno...</span>
        </div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-12 bg-white rounded-xl shadow-md p-8 max-w-md w-full">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-xl text-gray-600 font-medium">Turno non trovato</div>
          <p className="text-gray-500 mt-2">Il turno richiesto non è disponibile</p>
          <button
            onClick={() => navigate('/shifts')}
            className="mt-6 px-4 py-2 bg-[#E2001A] text-white rounded-lg hover:bg-[#c60017] transition-colors flex items-center mx-auto"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Torna alla lista turni
          </button>
        </div>
      </div>
    );
  }

  const isShiftFull = shift.currentParticipants >= shift.maxParticipants;
  const userParticipating = shift.participants?.[auth.currentUser?.uid || ''];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#E2001A] text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <img src="/Emblema_CRI.svg" alt="CRI Logo" className="h-10 w-10 sm:h-12 sm:w-12" />
              <div className="ml-3">
                <h1 className="text-xl sm:text-2xl font-bold">Croce Rossa Italiana</h1>
                <p className="text-xs sm:text-sm text-white/80 font-medium hidden sm:block">
                  Portale Turni Adunata Alpini
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 mt-1 sm:mt-0">
              <div className="flex items-center bg-white/10 px-3 py-2 rounded-lg flex-1 sm:flex-none max-w-[65%] sm:max-w-none transition-all hover:bg-white/15">
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0 text-white/90" />
                <span className="font-medium truncate text-sm sm:text-base">{user?.firstName} {user?.lastName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium bg-white text-[#E2001A] rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 shadow-sm"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Esci</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={() => navigate('/shifts')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 mr-2" />
          <span className="font-medium">Torna alla lista turni</span>
        </button>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[#E2001A] flex items-center break-words hyphens-auto">
              {shift.title || 'Dettaglio Turno'}
            </h2>
            {userParticipating ? (
              <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 font-medium text-sm">
                <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                Iscritto come {userParticipating.role}
              </div>
            ) : isShiftFull ? (
              <div className="flex items-center bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg border border-yellow-200 font-medium text-sm">
                <Users className="h-4 w-4 mr-2 text-yellow-500" />
                Turno completo
              </div>
            ) : (
              <div className="flex items-center bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200 font-medium text-sm">
                <Users className="h-4 w-4 mr-2 text-green-500" />
                Disponibile
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[#E2001A] mr-3 flex-shrink-0" />
              <div>
                <div className="text-sm text-gray-500 mb-1">Data</div>
                <div className="font-medium text-gray-900">
                  {format(parseISO(shift.date), "EEEE d MMMM yyyy", { locale: it })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-[#E2001A] mr-3 flex-shrink-0" />
              <div>
                <div className="text-sm text-gray-500 mb-1">Orario</div>
                <div className="font-medium text-gray-900">{shift.startTime} - {shift.endTime}</div>
              </div>
            </div>
            
            <div className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-200 sm:col-span-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#E2001A] mr-3 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">Partecipanti</div>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">
                    {shift.currentParticipants}/{shift.maxParticipants}
                  </div>
                  <div className="w-1/2 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${shift.currentParticipants >= shift.maxParticipants ? 'bg-yellow-500' : 'bg-[#E2001A]'}`}
                      style={{ width: `${Math.min(100, (shift.currentParticipants / shift.maxParticipants) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mb-4">Ruoli richiesti</h3>
          
          <div className="space-y-4 mb-6">
            {Object.entries(shift.requiredRoles).map(([role, count]) => {
              const participantsInRole = Object.entries(shift.participants || {})
                .filter(([_, p]) => p.role === role);
              const isFilled = participantsInRole.length >= count;
              
              // Progress percentage for the role
              const filledPercentage = Math.min(100, (participantsInRole.length / count) * 100);

              return (
                <div key={role} className="bg-white rounded-lg border shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-800 text-lg">{role}</span>
                    <div className="flex items-center">
                      <span className={`${isFilled ? 'text-green-600' : 'text-gray-700'} font-medium`}>
                        {participantsInRole.length}/{count}
                      </span>
                      {isFilled && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div 
                      className={`h-2 rounded-full ${isFilled ? 'bg-green-500' : 'bg-[#E2001A]'}`}
                      style={{ width: `${filledPercentage}%` }}
                    ></div>
                  </div>
                  
                  {participantsInRole.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 mt-3 space-y-2">
                      <div className="text-sm text-gray-500 font-medium mb-1">Partecipanti:</div>
                      {participantsInRole.map(([_, participant]) => (
                        <div key={participant.name} className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-[#E2001A]" />
                          <span className="text-gray-700">{participant.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!userParticipating && !isShiftFull && (
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Iscriviti al turno</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleziona ruolo
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A] p-3"
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
                className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[#E2001A] hover:bg-[#c60017] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {joining ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Partecipazione in corso...
                  </div>
                ) : 'Partecipa al turno'}
              </button>
            </div>
          )}

          {userParticipating && (
            <div className="border-t pt-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-blue-700 font-medium mb-1">
                      Sei iscritto a questo turno
                    </p>
                    <p className="text-blue-600 text-sm">
                      Ruolo: <strong>{userParticipating.role}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isShiftFull && !userParticipating && (
            <div className="border-t pt-6">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-yellow-700 font-medium mb-1">
                      Questo turno è al completo
                    </p>
                    <p className="text-yellow-600 text-sm">
                      Non è possibile iscriversi. Prova a selezionare un altro turno.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-center text-gray-500 text-xs sm:text-sm py-4">
          © {new Date().getFullYear()} Croce Rossa Italiana - Comitato di Cossato
        </div>
      </div>
    </div>
  );
}