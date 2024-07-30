import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Home: { contactNumber?: string };
  SelectContact: undefined;
};

export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
export type SelectContactScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectContact'>;

export type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;
export type SelectContactScreenRouteProp = RouteProp<RootStackParamList, 'SelectContact'>;
