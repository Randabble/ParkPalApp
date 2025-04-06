import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'host' | 'driver'>('driver');
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError(null);
      await signUp(email, password, role);
      router.replace('/(tabs)');
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Create Account</ThemedText>
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'driver' && styles.selectedRole]}
            onPress={() => setRole('driver')}
          >
            <ThemedText style={role === 'driver' && styles.selectedRoleText}>
              Driver
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.roleButton, role === 'host' && styles.selectedRole]}
            onPress={() => setRole('host')}
          >
            <ThemedText style={role === 'host' && styles.selectedRoleText}>
              Host
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <ThemedText style={styles.buttonText}>Register</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.link}>Already have an account? Login</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  form: {
    marginTop: 20,
    gap: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  roleButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  selectedRole: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectedRoleText: {
    color: 'white',
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    textAlign: 'center',
  },
  link: {
    textAlign: 'center',
    color: '#007AFF',
    marginTop: 15,
  },
}); 