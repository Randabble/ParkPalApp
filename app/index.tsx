import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [user, loading]);

  return null;
} 