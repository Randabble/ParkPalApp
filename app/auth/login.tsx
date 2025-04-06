import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    try {
      setError(null);
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="car" size={60} color="#007AFF" />
        <ThemedText type="title">Welcome to Park Pal</ThemedText>
        <ThemedText type="subtitle">Find your perfect parking spot</ThemedText>
      </View>
      
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <FontAwesome name="envelope" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: '#000' }]}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: '#000' }]}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <ThemedText style={styles.buttonText}>Login</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <ThemedText style={styles.link}>Don't have an account? Register</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  form: {
    gap: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
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