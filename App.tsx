import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ContactSelectScreen from './screens/ContactSelectScreen';
import { NavigationContainer } from '@react-navigation/native';

export type RootStackParamList = {
  Home: { contactNumber?: string };
  SelectContact: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SelectContact" component={ContactSelectScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;