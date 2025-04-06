# Park Pal - React Native Parking Marketplace

## Project Overview
Park Pal is a mobile application built with React Native and Expo that serves as a two-sided marketplace for parking spaces. The app connects parking space hosts with drivers looking for parking spots.

## Tech Stack
- **Frontend**: React Native with Expo and TypeScript
- **Backend**: Supabase (Authentication and Database)
- **Navigation**: React Navigation
- **State Management**: React Context API

## Step-by-Step Implementation Guide

### 1. Project Setup
1. Initialize a new Expo project with TypeScript:
   ```bash
   npx create-expo-app ParkPal --template expo-template-blank-typescript
   cd ParkPal
   ```

2. Install required dependencies:
   ```bash
   npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
   npm install @supabase/supabase-js
   npm install react-native-safe-area-context react-native-screens
   ```

### 2. Supabase Setup
1. Create a new Supabase project
2. Set up authentication tables:
   - Create a `users` table with columns:
     - `id` (uuid, primary key)
     - `email` (text, unique)
     - `role` (text, enum: 'host' | 'driver')
     - `created_at` (timestamp)

3. Create a `listings` table with columns:
   - `id` (uuid, primary key)
   - `host_id` (uuid, foreign key to users)
   - `title` (text)
   - `description` (text)
   - `location` (text)
   - `price` (numeric)
   - `created_at` (timestamp)
   - `is_available` (boolean)

### 3. Authentication Implementation
1. Create a `src/lib/supabase.ts` file:
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

2. Create authentication context (`src/contexts/AuthContext.tsx`):
   ```typescript
   import { createContext, useContext, useState, useEffect } from 'react';
   import { supabase } from '../lib/supabase';
   
   type User = {
     id: string;
     email: string;
     role: 'host' | 'driver';
   };
   
   type AuthContextType = {
     user: User | null;
     loading: boolean;
     signIn: (email: string, password: string) => Promise<void>;
     signUp: (email: string, password: string, role: 'host' | 'driver') => Promise<void>;
     signOut: () => Promise<void>;
   };
   
   export const AuthContext = createContext<AuthContextType | undefined>(undefined);
   ```

### 4. Navigation Setup
1. Create navigation types (`src/types/navigation.ts`):
   ```typescript
   export type RootStackParamList = {
     Auth: undefined;
     Main: undefined;
   };
   
   export type AuthStackParamList = {
     Login: undefined;
     Register: undefined;
   };
   
   export type MainTabParamList = {
     Home: undefined;
     Map: undefined;
     MyListings: undefined;
     Account: undefined;
   };
   ```

2. Set up navigation structure in `App.tsx`:
   ```typescript
   import { NavigationContainer } from '@react-navigation/native';
   import { createNativeStackNavigator } from '@react-navigation/native-stack';
   import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
   ```

### 5. Screen Implementation

#### Authentication Screens
1. Create `src/screens/auth/LoginScreen.tsx`:
   - Email and password input fields
   - Login button
   - Link to registration screen

2. Create `src/screens/auth/RegisterScreen.tsx`:
   - Email and password input fields
   - Role selection (host/driver)
   - Register button
   - Link to login screen

#### Main Screens
1. Create `src/screens/main/HomeScreen.tsx`:
   - List of available parking spots
   - Search functionality
   - Filter options

2. Create `src/screens/main/MapScreen.tsx`:
   - Map view placeholder
   - Will implement actual map functionality later

3. Create `src/screens/main/MyListingsScreen.tsx`:
   - List of host's parking spots
   - Add new listing button
   - Edit/delete functionality

4. Create `src/screens/main/AccountScreen.tsx`:
   - User profile information
   - Logout button

### 6. Listing Management
1. Create `src/components/ListingForm.tsx`:
   - Form for adding/editing listings
   - Fields for title, description, location, price
   - Submit button

2. Create `src/components/ListingCard.tsx`:
   - Reusable component for displaying listing information
   - Book button for drivers
   - Edit/delete buttons for hosts

### 7. Testing and Deployment
1. Test the authentication flow
2. Test role-based access control
3. Test listing creation and management
4. Deploy to Expo:
   ```bash
   expo build:android
   expo build:ios
   ```

## Next Steps
1. Implement real-time updates for listing availability
2. Add booking functionality
3. Implement payment processing
4. Add user reviews and ratings
5. Implement push notifications
6. Add advanced search and filtering
7. Implement map view with actual parking spot locations

## Best Practices
1. Use TypeScript for type safety
2. Implement proper error handling
3. Follow React Native performance optimization guidelines
4. Use proper state management
5. Implement proper security measures
6. Follow accessibility guidelines
7. Write unit tests for critical functionality

## Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation Documentation](https://reactnavigation.org/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
