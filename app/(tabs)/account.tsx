import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AccountScreen() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return 'Loading...';
    return role === 'host' ? 'Parking Space Host' : 'Driver';
  };

  const viewPublicProfile = () => {
    if (user?.uid) {
      router.push(`/profile/${user.uid}`);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="user-circle" size={80} color="#007AFF" />
        <ThemedText type="title" style={styles.email}>{user?.email}</ThemedText>
        <ThemedText type="subtitle" style={styles.role}>
          {getRoleDisplay(user?.role)}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">Account Settings</ThemedText>
        <TouchableOpacity style={styles.button} onPress={viewPublicProfile}>
          <FontAwesome name="user" size={20} color="white" style={styles.buttonIcon} />
          <ThemedText style={styles.buttonText}>View Public Profile</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/profile/edit')}
        >
          <FontAwesome name="edit" size={20} color="white" style={styles.buttonIcon} />
          <ThemedText style={styles.buttonText}>Edit Profile</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={20} color="white" style={styles.buttonIcon} />
          <ThemedText style={styles.buttonText}>Log Out</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  email: {
    marginTop: 20,
  },
  role: {
    marginTop: 10,
    opacity: 0.7,
  },
  section: {
    marginTop: 40,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 10,
  },
}); 