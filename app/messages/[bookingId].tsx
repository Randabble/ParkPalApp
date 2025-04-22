import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  text: string;
  sender_id: string;
  receiver_id: string;
  created_at: any;
}

interface Booking {
  id: string;
  user_id: string;
  listing_id: string;
  host_id?: string;
  listing_user_id?: string;
}

interface Listing {
  id: string;
  user_id?: string;
  host_id?: string;
}

export default function MessagesScreen() {
  const { bookingId } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !bookingId) return;

    const loadChatData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get booking details
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId as string));
        if (!bookingDoc.exists()) {
          throw new Error('Booking not found');
        }
        const booking = bookingDoc.data() as Booking;

        // Get listing details
        const listingDoc = await getDoc(doc(db, 'listings', booking.listing_id));
        if (!listingDoc.exists()) {
          throw new Error('Listing not found');
        }
        const listing = listingDoc.data() as Listing;

        // Determine the other user's ID
        let otherUser = null;
        if (user.uid === booking.user_id) {
          // If current user is the booking user, other user is the host
          otherUser = booking.host_id || listing.host_id || listing.user_id;
        } else {
          // If current user is the host, other user is the booking user
          otherUser = booking.user_id;
        }

        if (!otherUser) {
          throw new Error('Could not determine chat participant');
        }

        setOtherUserId(otherUser);

        // Set up messages listener
        const messagesQuery = query(
          collection(db, 'messages'),
          where('booking_id', '==', bookingId),
          orderBy('created_at', 'asc')
        );

        const unsubscribe = onSnapshot(messagesQuery, 
          (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Message[];
            setMessages(newMessages);
            setLoading(false);
          },
          (error) => {
            console.error('Error loading messages:', error);
            setError('Error loading messages: ' + error.message);
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up chat:', error);
        setError('Error setting up chat: ' + (error as Error).message);
        setLoading(false);
      }
    };

    loadChatData();
  }, [user, bookingId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !bookingId || !otherUserId) return;

    try {
      await addDoc(collection(db, 'messages'), {
        booking_id: bookingId,
        text: newMessage.trim(),
        sender_id: user.uid,
        receiver_id: otherUserId,
        created_at: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error sending message: ' + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.messagesContainer}>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[
                styles.messageContainer,
                item.sender_id === user?.uid ? styles.sentMessage : styles.receivedMessage
              ]}>
                <Text style={[
                  styles.messageText,
                  item.sender_id === user?.uid ? styles.sentMessageText : styles.receivedMessageText
                ]}>
                  {item.text}
                </Text>
                <Text style={[
                  styles.timestamp,
                  item.sender_id === user?.uid ? styles.sentTimestamp : styles.receivedTimestamp
                ]}>
                  {item.created_at?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            contentContainerStyle={styles.messagesList}
            inverted={false}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={24} 
              color={newMessage.trim() ? '#007AFF' : '#999'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    marginHorizontal: 8,
    padding: 12,
    borderRadius: 16,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
  },
  sentMessageText: {
    color: '#fff',
  },
  receivedMessageText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  sentTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTimestamp: {
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginRight: 8,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
}); 