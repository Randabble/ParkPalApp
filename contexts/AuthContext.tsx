import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type User = {
  id: string;
  email: string;
  role: 'host' | 'driver';
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: 'host' | 'driver') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      console.log('Could not fetch role from database, checking auth metadata');
      // If we can't get the role from the database, check auth metadata
      const { data: { user } } = await supabase.auth.getUser();
      return user?.user_metadata?.role || 'driver';
    }
    
    return data.role;
  };

  const updateUserState = async (sessionUser: any) => {
    if (!sessionUser) {
      setUser(null);
      return;
    }

    try {
      const role = await fetchUserRole(sessionUser.id);
      setUser({
        id: sessionUser.id,
        email: sessionUser.email!,
        role,
      });
    } catch (error) {
      console.error('Error updating user state:', error);
      // If there's an error, we'll just set the role to driver instead of signing out
      setUser({
        id: sessionUser.id,
        email: sessionUser.email!,
        role: 'driver',
      });
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await updateUserState(session.user);
      }
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await updateUserState(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, role: 'host' | 'driver') => {
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    });
    if (signUpError) throw signUpError;

    if (!data.user) throw new Error('User not found after signup');

    // Insert into users table
    const { error: insertError } = await supabase
      .from('users')
      .insert([{ id: data.user.id, email, role }]);
    
    // If insert fails, we'll still let the user register
    if (insertError) {
      console.error('Error inserting user into users table:', insertError);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 