import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, ScrollView, Image, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { createListing } from '@/lib/listings';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

type ListingForm = {
  title: string;
  address: string;
  description: string;
  price: string;
  images: string[];
};

export default function CreateListingScreen() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ListingForm>({
    title: '',
    address: '',
    description: '',
    price: '',
    images: [],
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0].uri && result.assets[0].base64) {
      setForm(prev => ({
        ...prev,
        images: [...prev.images, result.assets[0].uri],
      }));
    }
  };

  const uploadImage = async (base64File: string) => {
    const filePath = `${Math.random().toString(36).substring(7)}.jpg`;
    const { error } = await supabase.storage
      .from('parking-images')
      .upload(filePath, decode(base64File), {
        contentType: 'image/jpeg',
      });

    if (error) throw error;
    
    const { data } = supabase.storage
      .from('parking-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!form.title || !form.address || !form.price) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Upload images and get their URLs
      const imageUrls = await Promise.all(
        form.images.map(async (uri) => {
          const response = await fetch(uri);
          const blob = await response.blob();
          const reader = new FileReader();
          return new Promise<string>((resolve, reject) => {
            reader.onload = async () => {
              try {
                const base64 = (reader.result as string).split(',')[1];
                const url = await uploadImage(base64);
                resolve(url);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        })
      );

      // Create the listing
      await createListing({
        title: form.title,
        address: form.address,
        description: form.description,
        price: parseFloat(form.price),
        images: imageUrls,
      });

      router.back();
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
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
            placeholder="Full address"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
            placeholder="Describe your parking space"
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText>Price per Hour ($) *</ThemedText>
          <TextInput
            style={styles.input}
            value={form.price}
            onChangeText={(text) => setForm(prev => ({ ...prev, price: text }))}
            placeholder="0.00"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <ThemedText style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Listing'}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  form: {
    padding: 20,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageContainer: {
    marginRight: 10,
    position: 'relative',
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
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    marginTop: 8,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 