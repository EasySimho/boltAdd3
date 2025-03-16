import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, LogOut, CheckCircle, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { format, parseISO, isEqual } from 'date-fns';
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

const AVAILABLE_DATES = [
  '2025-05-09',
  '2025-05-10',
  '2025-05-11'
];

export function ShiftList() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(AVAILABLE_DATES[0]);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    const fetchShifts = async () => {
      try {
        const shiftsRef = collection(db, 'shifts');
        const q = query(shiftsRef, orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const shiftsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Shift[];
        
        setShifts(shiftsData);
      } catch (error) {
        console.error('Error fetching shifts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, [user, navigate, authLoading]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDateChange = (date: string) => {
    if (AVAILABLE_DATES.includes(date)) {
      setSelectedDate(date);
    }
  };

  const handlePreviousDay = () => {
    const currentIndex = AVAILABLE_DATES.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(AVAILABLE_DATES[currentIndex - 1]);
    }
  };

  const handleNextDay = () => {
    const currentIndex = AVAILABLE_DATES.indexOf(selectedDate);
    if (currentIndex < AVAILABLE_DATES.length - 1) {
      setSelectedDate(AVAILABLE_DATES[currentIndex + 1]);
    }
  };

  const filteredShifts = shifts.filter(shift => 
    isEqual(parseISO(shift.date), parseISO(selectedDate))
  );

  const isFirstDay = selectedDate === AVAILABLE_DATES[0];
  const isLastDay = selectedDate === AVAILABLE_DATES[AVAILABLE_DATES.length - 1];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2001A]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#E2001A] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <img src="/Emblema_CRI.svg" alt="CRI Logo" className="h-10 w-10 sm:h-12 sm:w-12" />
              <h1 className="text-xl sm:text-2xl font-bold ml-3">Croce Rossa Italiana</h1>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="flex items-center bg-white/10 px-3 py-2 rounded-lg text-sm sm:text-base">
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="font-medium truncate">{user?.firstName} {user?.lastName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium bg-white text-[#E2001A] rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Esci</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-8">
          {/* Date Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Turni Disponibili</h2>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <button
                onClick={handlePreviousDay}
                disabled={isFirstDay}
                className={`p-3 rounded-lg transition-colors ${
                  isFirstDay 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'hover:bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
                title="Giorno precedente"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <select
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2 text-base sm:text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2001A] focus:border-transparent"
              >
                {AVAILABLE_DATES.map(date => (
                  <option key={date} value={date}>
                    {format(parseISO(date), "d MMMM yyyy", { locale: it })}
                  </option>
                ))}
              </select>
              <button
                onClick={handleNextDay}
                disabled={isLastDay}
                className={`p-3 rounded-lg transition-colors ${
                  isLastDay 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'hover:bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
                title="Giorno successivo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="text-lg sm:text-xl font-medium text-gray-700 mb-6">
            {format(parseISO(selectedDate), "EEEE d MMMM yyyy", { locale: it })}
          </div>
          
          {filteredShifts.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nessun turno disponibile per questa data</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredShifts.map((shift) => {
                const isFull = shift.currentParticipants >= shift.maxParticipants;
                const isUserParticipating = shift.participants?.[auth.currentUser?.uid || ''];
                const cardClass = isUserParticipating
                  ? 'bg-blue-50 border-blue-200'
                  : isFull
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-white hover:shadow-lg';

                return (
                  <div
                    key={shift.id}
                    className={`rounded-xl shadow-sm border p-4 sm:p-6 transition-all active:scale-[0.98] ${cardClass}`}
                    onClick={() => navigate(`/shifts/${shift.id}`)}
                  >
                    <div className="flex items-center mb-4">
                      <Clock className="h-5 w-5 text-[#E2001A] mr-2 flex-shrink-0" />
                      <span className="text-lg font-medium">{shift.startTime} - {shift.endTime}</span>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.entries(shift.requiredRoles).map(([role, count]) => {
                        const participantsInRole = Object.entries(shift.participants || {})
                          .filter(([_, p]) => p.role === role);
                        const isFilled = participantsInRole.length >= count;

                        return (
                          <div key={role} className="bg-white rounded-lg border p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-base">{role}</span>
                              <div className="flex items-center">
                                <span className={`${isFilled ? 'text-green-600' : ''} text-base`}>
                                  {participantsInRole.length}/{count}
                                </span>
                                {isFilled && (
                                  <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                                )}
                              </div>
                            </div>
                            {participantsInRole.length > 0 && (
                              <div className="text-sm text-gray-600 space-y-1.5">
                                {participantsInRole.map(([_, participant]) => (
                                  <div key={participant.name} className="flex items-center">
                                    <User className="h-3 w-3 mr-1.5 text-[#E2001A]" />
                                    <span className="truncate">{participant.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Stato:</span>
                        {isUserParticipating ? (
                          <span className="text-sm font-medium text-blue-600">
                            Iscritto come {isUserParticipating.role}
                          </span>
                        ) : isFull ? (
                          <span className="text-sm font-medium text-gray-600">
                            Turno completo
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-green-600">
                            Disponibile
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}