import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, getDocs, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Plus, Save, LogOut, Calendar, Clock, Users, Trash2, Edit, X, ChevronLeft, User, ChevronRight, UserMinus, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { format, parseISO, isEqual } from 'date-fns';
import { it } from 'date-fns/locale';

interface Role {
  name: string;
  count: number;
}

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

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
}

const AVAILABLE_DATES = [
  '2025-05-09',
  '2025-05-10',
  '2025-05-11'
];

export function AdminDashboard() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [roles, setRoles] = useState<Role[]>([{ name: '', count: 1 }]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(AVAILABLE_DATES[0]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<string | null>(null);
  const [addingParticipant, setAddingParticipant] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState('');
  const [removingParticipant, setRemovingParticipant] = useState<{ shiftId: string; userId: string } | null>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/', { replace: true });
      return;
    }

    const fetchData = async () => {
      if (authLoading || !user) return;
      
      try {
        // Fetch shifts
        const shiftsRef = collection(db, 'shifts');
        const q = query(shiftsRef, orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const shiftsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Shift[];
        
        setShifts(shiftsData);

        // Fetch users
        const usersRef = collection(db, 'profiles');
        const usersSnapshot = await getDocs(usersRef);
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserProfile[];

        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [success, user, navigate, authLoading]);

  const handleAddRole = () => {
    setRoles([...roles, { name: '', count: 1 }]);
  };

  const handleRoleChange = (index: number, field: 'name' | 'count', value: string | number) => {
    const newRoles = [...roles];
    newRoles[index][field] = value;
    setRoles(newRoles);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const requiredRoles = roles.reduce((acc, role) => {
        if (role.name) {
          acc[role.name] = role.count;
        }
        return acc;
      }, {} as Record<string, number>);

      const maxParticipants = roles.reduce((sum, role) => sum + role.count, 0);

      if (isEditing && editingShift) {
        await updateDoc(doc(db, 'shifts', editingShift.id), {
          title,
          date,
          startTime,
          endTime,
          requiredRoles,
          maxParticipants,
          updatedAt: new Date().toISOString()
        });
        setIsEditing(false);
        setEditingShift(null);
      } else {
        await addDoc(collection(db, 'shifts'), {
          title,
          date,
          startTime,
          endTime,
          requiredRoles,
          maxParticipants,
          currentParticipants: 0,
          participants: {},
          createdAt: new Date().toISOString()
        });
      }

      setSuccess(true);
      setTitle('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setRoles([{ name: '', count: 1 }]);
    } catch (error) {
      console.error('Error managing shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setIsEditing(true);
    setTitle(shift.title || '');
    setDate(shift.date);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setRoles(Object.entries(shift.requiredRoles).map(([name, count]) => ({ name, count })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (shiftId: string) => {
    try {
      await deleteDoc(doc(db, 'shifts', shiftId));
      setShifts(shifts.filter(shift => shift.id !== shiftId));
      setDeleteConfirm(null);
      setSuccess(true);
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'profiles', userId));
      setUsers(users.filter(u => u.id !== userId));
      setDeleteUserConfirm(null);
      setSuccess(true);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingShift(null);
    setTitle('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setRoles([{ name: '', count: 1 }]);
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

  const handleAddParticipant = async (shiftId: string) => {
    if (!selectedUser || !selectedUserRole) return;

    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      const selectedUserData = users.find(u => u.id === selectedUser);
      if (!selectedUserData) return;

      const shiftRef = doc(db, 'shifts', shiftId);
      await updateDoc(shiftRef, {
        [`participants.${selectedUser}`]: {
          role: selectedUserRole,
          name: `${selectedUserData.firstName} ${selectedUserData.lastName}`,
        },
        currentParticipants: (shift.currentParticipants || 0) + 1
      });

      // Update local state
      const updatedShifts = shifts.map(s => {
        if (s.id === shiftId) {
          return {
            ...s,
            participants: {
              ...s.participants,
              [selectedUser]: {
                role: selectedUserRole,
                name: `${selectedUserData.firstName} ${selectedUserData.lastName}`,
              }
            },
            currentParticipants: (s.currentParticipants || 0) + 1
          };
        }
        return s;
      });

      setShifts(updatedShifts);
      setAddingParticipant(null);
      setSelectedUser('');
      setSelectedUserRole('');
      setSuccess(true);
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  };

  const handleRemoveParticipant = async (shiftId: string, userId: string) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      const shiftRef = doc(db, 'shifts', shiftId);
      const updatedParticipants = { ...shift.participants };
      delete updatedParticipants[userId];

      await updateDoc(shiftRef, {
        participants: updatedParticipants,
        currentParticipants: (shift.currentParticipants || 0) - 1
      });

      // Update local state
      const updatedShifts = shifts.map(s => {
        if (s.id === shiftId) {
          const newParticipants = { ...s.participants };
          delete newParticipants[userId];
          return {
            ...s,
            participants: newParticipants,
            currentParticipants: (s.currentParticipants || 0) - 1
          };
        }
        return s;
      });

      setShifts(updatedShifts);
      setRemovingParticipant(null);
      setSuccess(true);
    } catch (error) {
      console.error('Error removing participant:', error);
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
      <div className="bg-[#E2001A] text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Croce Rossa Italiana</h1>
            <span className="px-3 py-1 bg-white text-[#E2001A] rounded-full text-sm font-medium">
              Admin Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUserManagement(!showUserManagement)}
              className="flex items-center px-3 py-1 text-sm font-medium bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
            >
              <Users className="h-4 w-4 mr-2" />
              Gestione Utenti
            </button>
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              <span className="font-medium">{user?.firstName} {user?.lastName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-1 text-sm font-medium bg-white text-[#E2001A] rounded hover:bg-gray-100 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {showUserManagement ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Gestione Utenti</h2>
              <button
                onClick={() => setShowUserManagement(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cognome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ruolo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ultimo Accesso
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((userProfile) => (
                    <tr key={userProfile.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {userProfile.firstName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {userProfile.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          userProfile.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {userProfile.role === 'admin' ? 'Admin' : 'Utente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userProfile.lastLoginAt 
                          ? format(parseISO(userProfile.lastLoginAt), "d MMM yyyy HH:mm", { locale: it })
                          : 'Mai'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {deleteUserConfirm === userProfile.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleDeleteUser(userProfile.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Conferma
                            </button>
                            <button
                              onClick={() => setDeleteUserConfirm(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteUserConfirm(userProfile.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Elimina
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Form Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {isEditing ? 'Modifica Turno' : 'Crea Nuovo Turno'}
                </h2>
                {isEditing && (
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center text-gray-600 hover:text-gray-800"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Annulla modifica
                  </button>
                )}
              </div>
              
              {success && (
                <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md">
                  {isEditing ? 'Turno modificato con successo!' : 'Turno creato con successo!'}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titolo del Turno
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Es: Servizio 118"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ora Inizio
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ora Fine
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Ruoli Richiesti</h3>
                    <button
                      type="button"
                      onClick={handleAddRole}
                      className="flex items-center text-sm text-[#E2001A] hover:text-[#c60017]"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Aggiungi Ruolo
                    </button>
                  </div>

                  {roles.map((role, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Nome ruolo"
                          required
                          value={role.name}
                          onChange={(e) => handleRoleChange(index, 'name', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A]"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="1"
                          required
                          value={role.count}
                          onChange={(e) => handleRoleChange(index, 'count', parseInt(e.target.value))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#E2001A] hover:bg-[#c60017] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E2001A] disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Crea Turno'}
                </button>
              </form>
            </div>

            {/* Shifts List Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-xl font-semibold">Lista Turni</h2>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <button
                      onClick={handlePreviousDay}
                      disabled={isFirstDay}
                      className={`p-2 rounded-lg transition-colors ${
                        isFirstDay 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'hover:bg-gray-100 text-gray-600 active:bg-gray-200'
                      }`}
                      title="Giorno precedente"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <select
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2001A] focus:border-transparent"
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
                      className={`p-2 rounded-lg transition-colors ${
                        isLastDay 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'hover:bg-gray-100 text-gray-600 active:bg-gray-200'
                      }`}
                      title="Giorno successivo"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {filteredShifts.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nessun turno disponibile per questa data</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="bg-white rounded-lg border p-6 relative"
                      >
                        <div className="absolute top-4 right-4 flex space-x-2">
                          <button
                            onClick={() => handleEdit(shift)}
                            className="p-2 text-gray-600 hover:text-[#E2001A] rounded-full hover:bg-gray-100"
                            title="Modifica turno"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(shift.id)}
                            className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
                            title="Elimina turno"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>

                        {deleteConfirm === shift.id && (
                          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg z-10">
                            <div className="text-center p-6">
                              <p className="text-lg font-medium mb-4">Sei sicuro di voler eliminare questo turno?</p>
                              <div className="flex justify-center space-x-4">
                                <button
                                  onClick={() => handleDelete(shift.id)}
                                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Elimina
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                                >
                                  Annulla
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <h3 className="text-xl font-semibold mb-4 text-[#E2001A]">
                          {shift.title}
                        </h3>
                        
                        <div className="flex items-center mb-4">
                          <Clock className="h-5 w-5 text-[#E2001A] mr-2" />
                          <span>{shift.startTime} - {shift.endTime}</span>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-700">Partecipanti:</h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm bg-[#E2001A] text-white px-2 py-1 rounded-full">
                                {shift.currentParticipants}/{shift.maxParticipants}
                              </span>
                              <button
                                onClick={() => setAddingParticipant(shift.id)}
                                className="p-1 text-[#E2001A] hover:bg-red-50 rounded-full"
                                title="Aggiungi partecipante"
                              >
                                <UserPlus className="h-5 w-5" />
                              </button>
                            </div>
                          </div>

                          {addingParticipant === shift.id && (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                              <h4 className="font-medium text-gray-700">Aggiungi Partecipante</h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Seleziona Utente
                                  </label>
                                  <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A]"
                                  >
                                    <option value="">Seleziona un utente...</option>
                                    {users
                                      .filter(u => !shift.participants?.[u.id])
                                
                                      .map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.firstName} {u.lastName}
                                        </option>
                                      ))
                                    }
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Seleziona Ruolo
                                  </label>
                                  <select
                                    value={selectedUserRole}
                                    onChange={(e) => setSelectedUserRole(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#E2001A] focus:ring-[#E2001A]"
                                  >
                                    <option value="">Seleziona un ruolo...</option>
                                    {Object.entries(shift.requiredRoles).map(([role, count]) => {
                                      const participantsInRole = Object.values(shift.participants || {})
                                        .filter(p => p.role === role).length;
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
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => {
                                      setAddingParticipant(null);
                                      setSelectedUser('');
                                      setSelectedUserRole('');
                                    }}
                                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                                  >
                                    Annulla
                                  </button>
                                  <button
                                    onClick={() => handleAddParticipant(shift.id)}
                                    disabled={!selectedUser || !selectedUserRole}
                                    className="px-3 py-2 text-sm font-medium text-white bg-[#E2001A] rounded hover:bg-[#c60017] disabled:opacity-50"
                                  >
                                    Aggiungi
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {Object.entries(shift.requiredRoles).map(([role, count]) => {
                            const participantsInRole = Object.entries(shift.participants || {})
                              .filter(([_, p]) => p.role === role);
                            const isFilled = participantsInRole.length >= count;

                            return (
                              <div key={role} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">{role}</span>
                                  <span className={`text-sm px-2 py-1 rounded-full ${
                                    isFilled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {participantsInRole.length}/{count}
                                  </span>
                                </div>
                                {participantsInRole.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {participantsInRole.map(([userId, participant]) => (
                                      <div key={userId} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                        <div className="flex items-center">
                                          <User className="h-4 w-4 mr-2 text-[#E2001A]" />
                                          {participant.name}
                                        </div>
                                        {removingParticipant?.shiftId === shift.id && 
                                         removingParticipant?.userId === userId ? (
                                          <div className="flex items-center space-x-2">
                                            <button
                                              onClick={() => handleRemoveParticipant(shift.id, userId)}
                                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                              Conferma
                                            </button>
                                            <button
                                              onClick={() => setRemovingParticipant(null)}
                                              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                                            >
                                              Annulla
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setRemovingParticipant({ shiftId: shift.id, userId })}
                                            className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                                            title="Rimuovi partecipante"
                                          >
                                            <UserMinus className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}