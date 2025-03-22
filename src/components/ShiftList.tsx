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

interface ShiftGroup {
  startTime: string;
  shifts: Shift[];
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

  // Filter shifts by selected date and group by startTime
  const filteredAndGroupedShifts = React.useMemo(() => {
    // First filter by date
    const filteredShifts = shifts.filter(shift => 
      isEqual(parseISO(shift.date), parseISO(selectedDate))
    );
    
    // Group shifts by startTime
    const shiftsByTime: Record<string, Shift[]> = {};
    
    filteredShifts.forEach(shift => {
      if (!shiftsByTime[shift.startTime]) {
        shiftsByTime[shift.startTime] = [];
      }
      shiftsByTime[shift.startTime].push(shift);
    });
    
    // Convert to array and sort by startTime
    return Object.entries(shiftsByTime)
      .map(([startTime, shifts]) => ({ startTime, shifts }))
      .sort((a, b) => {
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        
        // Compare hours first
        if (timeA[0] !== timeB[0]) {
          return timeA[0] - timeB[0];
        }
        
        // If hours are equal, compare minutes
        return timeA[1] - timeB[1];
      });
  }, [shifts, selectedDate]);

  const isFirstDay = selectedDate === AVAILABLE_DATES[0];
  const isLastDay = selectedDate === AVAILABLE_DATES[AVAILABLE_DATES.length - 1];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#E2001A]"></div>
          <span className="text-gray-600 font-medium">Caricamento turni...</span>
        </div>
      </div>
    );
  }

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
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          {/* Date Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[#E2001A] mr-2 hidden sm:inline" />
              Turni Disponibili
            </h2>
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <button
                onClick={handlePreviousDay}
                disabled={isFirstDay}
                className={`p-2 sm:p-3 rounded-lg transition-colors border ${
                  isFirstDay 
                    ? 'text-gray-300 border-gray-200 cursor-not-allowed' 
                    : 'hover:bg-gray-50 text-gray-700 border-gray-300 active:bg-gray-100'
                }`}
                title="Giorno precedente"
                aria-label="Giorno precedente"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <select
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-base sm:text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2001A] focus:border-transparent bg-white shadow-sm"
                aria-label="Seleziona data"
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
                className={`p-2 sm:p-3 rounded-lg transition-colors border ${
                  isLastDay 
                    ? 'text-gray-300 border-gray-200 cursor-not-allowed' 
                    : 'hover:bg-gray-50 text-gray-700 border-gray-300 active:bg-gray-100'
                }`}
                title="Giorno successivo"
                aria-label="Giorno successivo"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>

          <div className="text-base sm:text-xl font-medium text-gray-700 mb-4 sm:mb-6 flex items-center">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#E2001A] mr-2" />
            {format(parseISO(selectedDate), "EEEE d MMMM yyyy", { locale: it })}
          </div>
          
          {filteredAndGroupedShifts.length === 0 ? (
            <div className="text-center py-12 sm:py-16 bg-gray-50 rounded-xl border border-gray-200">
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg sm:text-xl">Nessun turno disponibile per questa data</p>
              <p className="text-gray-400 text-sm sm:text-base mt-2">Seleziona un'altra data per visualizzare i turni disponibili</p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredAndGroupedShifts.map((group) => (
                <div key={group.startTime} className="space-y-4">
                  <div className="flex items-center mb-3">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-[#E2001A] mr-2 flex-shrink-0" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 break-words">
                      Turni con inizio ore {group.startTime}
                    </h3>
                    <div className="flex-1 ml-4 border-t border-gray-200"></div>
                  </div>
                  
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {group.shifts.map((shift) => {
                      const isFull = shift.currentParticipants >= shift.maxParticipants;
                      const isUserParticipating = shift.participants?.[auth.currentUser?.uid || ''];
                      
                      // Card styling based on status
                      let cardClass = 'bg-white hover:shadow-lg';
                      let statusBadgeClass = 'text-green-600 bg-green-50 border-green-100';
                      let statusText = 'Disponibile';
                      
                      if (isUserParticipating) {
                        cardClass = 'bg-blue-50 border-blue-200';
                        statusBadgeClass = 'text-blue-600 bg-blue-50 border-blue-200';
                        statusText = `Iscritto come ${isUserParticipating.role}`;
                      } else if (isFull) {
                        cardClass = 'bg-gray-50 border-gray-200';
                        statusBadgeClass = 'text-gray-600 bg-gray-50 border-gray-200';
                        statusText = 'Turno completo';
                      }

                      return (
                        <div
                          key={shift.id}
                          className={`rounded-xl shadow-sm border p-4 sm:p-5 transition-all active:scale-[0.98] cursor-pointer ${cardClass}`}
                          onClick={() => navigate(`/shifts/${shift.id}`)}
                        >
                          {/* Modified order: Status badge first, then title */}
                          <div className="flex flex-col mb-3">
                            <div className="mb-2">
                              <span className={`text-xs font-medium py-1 px-2 rounded-full border ${statusBadgeClass} whitespace-nowrap`}>
                                {statusText}
                              </span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold text-[#E2001A] break-words hyphens-auto">
                              {shift.title}
                            </h3>
                          </div>
                          
                          <div className="flex items-center mb-4 bg-gray-50 p-2 rounded-lg">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[#E2001A] mr-2 flex-shrink-0" />
                            <span className="text-base font-medium">{shift.startTime} - {shift.endTime}</span>
                          </div>
                          
                          <div className="space-y-3">
                            {Object.entries(shift.requiredRoles).map(([role, count]) => {
                              const participantsInRole = Object.entries(shift.participants || {})
                                .filter(([_, p]) => p.role === role);
                              const isFilled = participantsInRole.length >= count;
                              
                              // Progress percentage for the role
                              const filledPercentage = Math.min(100, (participantsInRole.length / count) * 100);

                              return (
                                <div key={role} className="bg-white rounded-lg border p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-sm sm:text-base break-words mr-2 flex-1">{role}</span>
                                    <div className="flex items-center flex-shrink-0">
                                      <span className={`${isFilled ? 'text-green-600' : 'text-gray-700'} text-sm sm:text-base font-medium`}>
                                        {participantsInRole.length}/{count}
                                      </span>
                                      {isFilled && (
                                        <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Progress bar */}
                                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                                    <div 
                                      className={`h-2 rounded-full ${isFilled ? 'bg-green-500' : 'bg-[#E2001A]'}`}
                                      style={{ width: `${filledPercentage}%` }}
                                    ></div>
                                  </div>
                                  
                                  {participantsInRole.length > 0 && (
                                    <div className="text-xs sm:text-sm text-gray-600 space-y-1 mt-2">
                                      {participantsInRole.map(([_, participant]) => (
                                        <div key={participant.name} className="flex items-center">
                                          <User className="h-3 w-3 mr-1.5 text-[#E2001A] flex-shrink-0" />
                                          <span className="truncate">{participant.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="mt-4 pt-3 border-t flex justify-end">
                            <button 
                              className="text-sm font-medium text-[#E2001A] hover:text-[#c10016] transition-colors flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/shifts/${shift.id}`);
                              }}
                            >
                              Visualizza dettagli
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
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