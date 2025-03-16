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
    
    // Sign in anonymously regardless of whether user exists
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    if (!querySnapshot.empty) {
      // User exists, get their data but keep their ID
      const existingProfile = querySnapshot.docs[0].data();
      
      // Update the existing user's profile with the new UID
      await setDoc(doc(db, 'profiles', user.uid), {
        ...existingProfile,
        lastLoginAt: new Date().toISOString()
      });

      navigate(existingProfile.role === 'admin' ? '/admin' : '/shifts');
      return;
    }

    // Check if the user should be granted admin role
    const isAdmin = firstName.toLowerCase() === 'admin' && lastName.toLowerCase() === 'admin';

    // Create new user profile
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