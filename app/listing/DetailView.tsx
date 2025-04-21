import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, Platform, Linking } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

type RouteParams = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  address: string;
  price: string;
  images: string;
  rating?: string;
  host_name?: string;
  host_image?: string;
};

export default function DetailView() {
  const params = useLocalSearchParams<RouteParams>();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<{[key: string]: string}>({});
  const [imageErrors, setImageErrors] = useState<{[key: string]: string}>({});
  const [parsedImages, setParsedImages] = useState<string[]>([]);
  
  // Parse the images array once when params change
  useEffect(() => {
    try {
      const parsed = JSON.parse(params.images);
      console.log('Raw params.images:', params.images);
      console.log('Parsed images array:', parsed);
      setParsedImages(parsed);
    } catch (error) {
      console.error('Error parsing images:', error, 'Raw images string:', params.images);
      setParsedImages([]);
    }
  }, [params.images]);

  // Load images only when parsedImages changes
  useEffect(() => {
    const loadImages = async () => {
      // Reset states
      const newLoadedImages: {[key: string]: string} = {};
      const newErrors: {[key: string]: string} = {};

      // Process each image URL
      for (let index = 0; index < parsedImages.length; index++) {
        const imageUrl = parsedImages[index];
        if (!imageUrl) {
          console.error(`Missing image URL at index ${index}`);
          newErrors[index] = 'Missing image URL';
          continue;
        }

        try {
          // For Firebase Storage URLs, try to get a fresh download URL
          if (imageUrl.includes('firebasestorage.googleapis.com')) {
            const pathArray = imageUrl.split('/');
            const fileName = pathArray[pathArray.length - 1].split('?')[0];
            const imageRef = ref(storage, `images/${fileName}`);
            const freshUrl = await getDownloadURL(imageRef);
            console.log(`Got fresh URL for image ${index}:`, freshUrl);
            newLoadedImages[index] = freshUrl;
          } else {
            newLoadedImages[index] = imageUrl;
          }
        } catch (error: any) {
          const errorMessage = error?.message || 'Unknown error occurred';
          console.error(`Error processing image ${index}:`, errorMessage);
          newErrors[index] = errorMessage;
        }
      }

      // Update state once for all images
      setLoadedImages(newLoadedImages);
      setImageErrors(newErrors);
    };

    loadImages();
  }, [parsedImages]);

  const handleImageError = React.useCallback((index: number, error: any) => {
    const errorMessage = error?.nativeEvent?.error || 'Failed to load image';
    console.error(`Image ${index} loading error:`, errorMessage);
    setImageErrors(prev => ({
      ...prev,
      [index]: errorMessage
    }));
  }, []);

  const rating = params.rating ? parseFloat(params.rating) : undefined;

  const openInMaps = () => {
    const address = encodeURIComponent(params.address);
    const url = Platform.select({
      ios: `maps://app?daddr=${address}`,
      android: `google.navigation:q=${address}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${address}`
    });
    Linking.openURL(url);
  };

  const renderImagePagination = () => (
    <View style={styles.paginationContainer}>
      {parsedImages.map((_: string, index: number) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            index === activeImageIndex && styles.paginationDotActive
          ]}
        />
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setActiveImageIndex(newIndex);
            }}
            style={styles.imageScrollView}
          >
            {parsedImages.map((_, index: number) => {
              const imageUrl = loadedImages[index];
              const hasError = !!imageErrors[index];
              
              return (
                <View key={index} style={styles.imageWrapper}>
                  {hasError ? (
                    <View style={styles.errorOverlay}>
                      <FontAwesome name="exclamation-circle" size={24} color="#FF385C" />
                      <ThemedText style={styles.errorText}>Failed to load image</ThemedText>
                      <ThemedText style={styles.errorSubtext}>Please try again later</ThemedText>
                    </View>
                  ) : !imageUrl ? (
                    <View style={styles.loadingOverlay}>
                      <ThemedText>Loading...</ThemedText>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                      onError={(error) => handleImageError(index, error)}
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>
          {renderImagePagination()}
        </View>

        {/* Back Button - Move it after the carousel container */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ThemedText style={styles.title}>{params.title}</ThemedText>
          
          {/* Host Info */}
          <TouchableOpacity 
            style={styles.hostContainer}
            onPress={() => router.push(`/profile/${params.host_id}`)}
          >
            {params.host_image ? (
              <Image source={{ uri: params.host_image }} style={styles.hostImage} />
            ) : (
              <View style={[styles.hostImage, styles.hostImagePlaceholder]}>
                <FontAwesome name="user" size={20} color="#666" />
              </View>
            )}
            <ThemedText style={styles.hostName}>
              {params.host_name || 'Host'}
            </ThemedText>
            <FontAwesome name="chevron-right" size={12} color="#666" style={styles.hostArrow} />
          </TouchableOpacity>

          <TouchableOpacity onPress={openInMaps} style={styles.addressContainer}>
            <FontAwesome name="map-marker" size={16} color="#666" />
            <ThemedText style={styles.address}>{params.address}</ThemedText>
            <FontAwesome name="chevron-right" size={12} color="#666" style={styles.addressArrow} />
          </TouchableOpacity>

          {rating && (
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" size={16} color="#FFD700" />
              <ThemedText style={styles.rating}>{rating.toFixed(1)}</ThemedText>
            </View>
          )}

          <View style={styles.priceContainer}>
            <ThemedText style={styles.price}>${params.price}</ThemedText>
            <ThemedText style={styles.priceUnit}>/hour</ThemedText>
          </View>

          <View style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>About this spot</ThemedText>
          <ThemedText style={styles.description}>{params.description}</ThemedText>
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bookButton}>
          <ThemedText style={styles.bookButtonText}>Book Now</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  carouselContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  imageScrollView: {
    flex: 1,
  },
  imageWrapper: {
    width: screenWidth,
    height: 300,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: Platform.OS === 'ios' ? 100 : 70,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  hostImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  hostImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostName: {
    fontSize: 16,
    fontWeight: '500',
  },
  hostArrow: {
    marginLeft: 'auto',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  address: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  addressArrow: {
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  rating: {
    fontSize: 16,
    marginLeft: 5,
    color: '#333',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  priceUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  bottomBar: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  bookButton: {
    backgroundColor: '#FF385C',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingOverlay: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF385C',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
}); 