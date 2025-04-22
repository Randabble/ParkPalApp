import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, ScrollView, Image, Alert, Modal } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { db, storage, auth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Calendar } from '@/components/Calendar';

type ListingForm = {
  title: string;
  address: string;
  description: string;
  price: string;
  images: string[];
  availability: {
    [date: string]: {
      startTime: string;
      endTime: string;
    }[];
  };
};

type TimeSlot = {
  startTime: string;
  endTime: string;
};

export default function CreateListingScreen() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [form, setForm] = useState<ListingForm>({
    title: '',
    address: '',
    description: '',
    price: '',
    images: [],
    availability: {},
  });
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot>({
    startTime: '09:00',
    endTime: '17:00',
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setForm(prev => ({
        ...prev,
        images: [...prev.images, result.assets[0].uri],
      }));
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const storageRef = ref(storage, `listings/${filename}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleTimeSlotSelect = (date: Date, timeSlot: TimeSlot) => {
    setSelectedDate(date);
    setCurrentTimeSlot(timeSlot);
    setShowAvailabilityModal(true);
  };

  const addTimeSlot = () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    
    setForm(prev => {
      const updatedAvailability = { ...prev.availability };
      
      if (!updatedAvailability[dateKey]) {
        updatedAvailability[dateKey] = [];
      }
      
      updatedAvailability[dateKey].push({
        startTime: currentTimeSlot.startTime,
        endTime: currentTimeSlot.endTime,
      });
      
      return {
        ...prev,
        availability: updatedAvailability,
      };
    });
    
    setShowAvailabilityModal(false);
  };

  const removeTimeSlot = (dateKey: string, index: number) => {
    setForm(prev => {
      const updatedAvailability = { ...prev.availability };
      
      if (updatedAvailability[dateKey]) {
        updatedAvailability[dateKey].splice(index, 1);
        
        if (updatedAvailability[dateKey].length === 0) {
          delete updatedAvailability[dateKey];
        }
      }
      
      return {
        ...prev,
        availability: updatedAvailability,
      };
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Upload images to Firebase Storage
      const imageUrls = await Promise.all(
        form.images.map(async (uri) => {
          const response = await fetch(uri);
          const blob = await response.blob();
          const filename = uri.substring(uri.lastIndexOf('/') + 1);
          const storageRef = ref(storage, `listings/${filename}`);
          await uploadBytes(storageRef, blob);
          return getDownloadURL(storageRef);
        })
      );

      // Create listing document in Firestore
      const listingData = {
        ...form,
        price: parseFloat(form.price),
        images: imageUrls,
        host_id: user?.uid,
        host_email: user?.email,
        created_at: new Date(),
        status: 'available'
      };

      console.log('Current user:', user);
      console.log('Listing data being sent:', listingData);

      const docRef = await addDoc(collection(db, 'listings'), listingData);
      console.log('Listing created with ID:', docRef.id);
      // Redirect to home screen instead of listing detail
      router.push('/(tabs)');
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.title || !form.address || !form.price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (Object.keys(form.availability).length === 0) {
      Alert.alert('Error', 'Please add at least one availability time slot');
      return false;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return false;
    }

    return true;
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText type="title">Create Listing</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.imageSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {form.images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      images: prev.images.filter((_, i) => i !== index),
                    }));
                  }}
                >
                  <FontAwesome name="times-circle" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <FontAwesome name="camera" size={24} color="#666" />
              <ThemedText style={styles.addImageText}>Add Photos</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <ThemedText>Title *</ThemedText>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
            placeholder="e.g., Covered Parking in Downtown"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText>Address *</ThemedText>
          <TextInput
            style={styles.input}
            value={form.address}
            onChangeText={(text) => setForm(prev => ({ ...prev, address: text }))}
            placeholder="e.g., 123 Main St, City, State"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
            placeholder="Describe your parking spot..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText>Price per hour ($) *</ThemedText>
          <TextInput
            style={styles.input}
            value={form.price}
            onChangeText={(text) => setForm(prev => ({ ...prev, price: text }))}
            placeholder="e.g., 5"
            placeholderTextColor="#666"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.availabilitySection}>
          <ThemedText style={styles.sectionTitle}>Availability</ThemedText>
          
          <Calendar
            availability={form.availability}
            onSelectTimeSlot={handleTimeSlotSelect}
            selectedDate={selectedDate}
            selectedTimeSlot={undefined}
          />
          
          {Object.keys(form.availability).length > 0 ? (
            <View style={styles.availabilityList}>
              {Object.entries(form.availability).map(([date, timeSlots]) => (
                <View key={date} style={styles.dateContainer}>
                  <ThemedText style={styles.dateText}>
                    {new Date(date).toLocaleDateString()}
                  </ThemedText>
                  {timeSlots.map((slot, index) => (
                    <View key={index} style={styles.timeSlot}>
                      <ThemedText>
                        {slot.startTime} - {slot.endTime}
                      </ThemedText>
                      <TouchableOpacity
                        onPress={() => removeTimeSlot(date, index)}
                        style={styles.removeTimeSlot}
                      >
                        <FontAwesome name="times" size={16} color="#FF385C" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.emptyText}>No availability set</ThemedText>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <ThemedText style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Listing'}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>

      {/* Availability Modal */}
      <Modal
        visible={showAvailabilityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAvailabilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Add Availability</ThemedText>
              <TouchableOpacity onPress={() => setShowAvailabilityModal(false)}>
                <FontAwesome name="times" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <ThemedText style={styles.selectedDateText}>
                {format(selectedDate, 'MMMM d, yyyy')}
              </ThemedText>

              <View style={styles.timeInputContainer}>
                <View style={styles.timeInput}>
                  <ThemedText>Start Time</ThemedText>
                  <TextInput
                    style={styles.timeInputField}
                    value={currentTimeSlot.startTime}
                    onChangeText={(text) => setCurrentTimeSlot(prev => ({ ...prev, startTime: text }))}
                    placeholder="HH:MM"
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.timeInput}>
                  <ThemedText>End Time</ThemedText>
                  <TextInput
                    style={styles.timeInputField}
                    value={currentTimeSlot.endTime}
                    onChangeText={(text) => setCurrentTimeSlot(prev => ({ ...prev, endTime: text }))}
                    placeholder="HH:MM"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAvailabilityModal(false)}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={addTimeSlot}
              >
                <ThemedText style={styles.saveButtonText}>Add Time Slot</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 2,
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    marginTop: 8,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2ecc71',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  availabilitySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  availabilityList: {
    marginBottom: 16,
  },
  dateContainer: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  dateText: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  removeTimeSlot: {
    padding: 4,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  timeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  timeInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeInputField: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2ecc71',
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 