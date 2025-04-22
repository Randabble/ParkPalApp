import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getListingById, updateListing } from '@/lib/listings';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export default function EditListingScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);

  useEffect(() => {
    if (id && user) {
      loadListing();
    }
  }, [id, user]);

  const loadListing = async () => {
    try {
      setLoading(true);
      const listingData = await getListingById(id as string);
      
      if (!listingData) {
        Alert.alert('Error', 'Listing not found');
        router.back();
        return;
      }
      
      // Check if the current user is the owner of the listing
      if (listingData.host_id !== user?.uid) {
        Alert.alert('Error', 'You do not have permission to edit this listing');
        router.back();
        return;
      }
      
      setListing(listingData);
      setTitle(listingData.title || '');
      setDescription(listingData.description || '');
      setAddress(listingData.address || '');
      setPrice(listingData.price?.toString() || '');
      setImages(listingData.images || []);
    } catch (error) {
      console.error('Error loading listing:', error);
      Alert.alert('Error', 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setNewImages([...newImages, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImages = async () => {
    if (newImages.length === 0) return images;
    
    const storage = getStorage();
    const uploadedUrls = [];
    
    for (const imageUri of newImages) {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        const filename = `${uuidv4()}.jpg`;
        const storageRef = ref(storage, `listings/${filename}`);
        
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        
        uploadedUrls.push(downloadURL);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    
    return [...images, ...uploadedUrls];
  };

  const handleSave = async () => {
    if (!title || !description || !address || !price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    try {
      setSaving(true);
      
      // Upload new images if any
      const updatedImages = await uploadImages();
      
      // Update the listing
      await updateListing(id as string, {
        title,
        description,
        address,
        price: parseFloat(price),
        images: updatedImages,
      });
      
      Alert.alert('Success', 'Listing updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating listing:', error);
      Alert.alert('Error', 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={20} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Edit Listing</ThemedText>
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Title</ThemedText>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter listing title"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter listing description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Address</ThemedText>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter listing address"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Price (per hour)</ThemedText>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Enter price per hour"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Images</ThemedText>
            <View style={styles.imageGrid}>
              {images.map((image, index) => (
                <View key={`existing-${index}`} style={styles.imageContainer}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <FontAwesome name="times-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {newImages.map((image, index) => (
                <View key={`new-${index}`} style={styles.imageContainer}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeNewImage(index)}
                  >
                    <FontAwesome name="times-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {images.length + newImages.length < 5 && (
                <TouchableOpacity 
                  style={styles.addImageButton}
                  onPress={pickImage}
                >
                  <FontAwesome name="plus" size={24} color="#007AFF" />
                  <ThemedText style={styles.addImageText}>Add Image</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  imageContainer: {
    width: '30%',
    aspectRatio: 1,
    marginRight: '3%',
    marginBottom: 12,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addImageButton: {
    width: '30%',
    aspectRatio: 1,
    marginRight: '3%',
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addImageText: {
    marginTop: 8,
    color: '#007AFF',
  },
}); 