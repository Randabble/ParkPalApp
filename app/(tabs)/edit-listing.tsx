import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getListingById, updateListing, Listing } from '@/lib/listings';
import { useAuth } from '../../contexts/AuthContext';

const VEHICLE_TYPES = [
  { label: 'Any', value: '' },
  { label: 'Car', value: 'car' },
  { label: 'SUV', value: 'suv' },
  { label: 'Truck', value: 'truck' },
  { label: 'Motorcycle', value: 'motorcycle' },
];

export default function EditListingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Listing>>({
    title: '',
    description: '',
    price: 0,
    location: '',
    vehicle_type: '',
    availability: {
      start_time: '',
      end_time: '',
    },
    rules: '',
  });

  useEffect(() => {
    loadListing();
  }, [id]);

  const loadListing = async () => {
    try {
      if (!id || typeof id !== 'string') {
        Alert.alert('Error', 'Invalid listing ID');
        router.back();
        return;
      }

      const listing = await getListingById(id);
      if (!listing) {
        Alert.alert('Error', 'Listing not found');
        router.back();
        return;
      }

      if (listing.user_id !== user?.uid) {
        Alert.alert('Error', 'You can only edit your own listings');
        router.back();
        return;
      }

      setFormData(listing);
    } catch (error) {
      console.error('Error loading listing:', error);
      Alert.alert('Error', 'Failed to load listing');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Validate form data
      if (!formData.title?.trim()) {
        Alert.alert('Error', 'Title is required');
        return;
      }
      if (!formData.description?.trim()) {
        Alert.alert('Error', 'Description is required');
        return;
      }
      if (!formData.price || formData.price <= 0) {
        Alert.alert('Error', 'Price must be greater than 0');
        return;
      }
      if (!formData.location?.trim()) {
        Alert.alert('Error', 'Location is required');
        return;
      }
      if (!formData.vehicle_type?.trim()) {
        Alert.alert('Error', 'Vehicle type is required');
        return;
      }
      if (!formData.availability?.start_time || !formData.availability?.end_time) {
        Alert.alert('Error', 'Availability times are required');
        return;
      }

      await updateListing(id as string, formData);
      Alert.alert('Success', 'Listing updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating listing:', error);
      Alert.alert('Error', 'Failed to update listing');
    } finally {
      setSubmitting(false);
    }
  };

  const renderVehicleTypeModal = () => (
    <Modal
      visible={showVehicleTypeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowVehicleTypeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Vehicle Type</Text>
          {VEHICLE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={styles.modalOption}
              onPress={() => {
                setFormData({ ...formData, vehicle_type: type.value });
                setShowVehicleTypeModal(false);
              }}
            >
              <Text style={styles.modalOptionText}>{type.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowVehicleTypeModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          placeholder="Enter listing title"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Enter listing description"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Price (per hour)</Text>
        <TextInput
          style={styles.input}
          value={formData.price?.toString()}
          onChangeText={(text) => setFormData({ ...formData, price: parseFloat(text) || 0 })}
          placeholder="Enter price per hour"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
          placeholder="Enter location"
        />

        <Text style={styles.label}>Vehicle Type</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowVehicleTypeModal(true)}
        >
          <Text style={styles.vehicleTypeText}>
            {VEHICLE_TYPES.find(type => type.value === formData.vehicle_type)?.label || 'Select vehicle type'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Availability</Text>
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.sublabel}>Start Time</Text>
            <TextInput
              style={styles.input}
              value={formData.availability?.start_time}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  availability: { 
                    ...formData.availability, 
                    start_time: text,
                    end_time: formData.availability?.end_time || '' 
                  },
                })
              }
              placeholder="HH:MM"
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.sublabel}>End Time</Text>
            <TextInput
              style={styles.input}
              value={formData.availability?.end_time}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  availability: { 
                    ...formData.availability, 
                    end_time: text,
                    start_time: formData.availability?.start_time || '' 
                  },
                })
              }
              placeholder="HH:MM"
            />
          </View>
        </View>

        <Text style={styles.label}>Rules</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.rules}
          onChangeText={(text) => setFormData({ ...formData, rules: text })}
          placeholder="Enter parking rules"
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Update Listing</Text>
          )}
        </TouchableOpacity>
      </View>
      {renderVehicleTypeModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sublabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  column: {
    flex: 1,
    marginHorizontal: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  vehicleTypeText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
}); 