import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './app/(tabs)/index';
import DetailView from './app/listing/DetailView';
import { NavigationContainer } from '@react-navigation/native';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="DetailView" component={DetailView} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 