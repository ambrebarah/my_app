import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, SafeAreaView, Linking } from 'react-native';
import * as Location from 'expo-location';
import { CameraType, useCameraPermissions, CameraView } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { Audio } from 'expo-av';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface LocationObject {
  coords: {
    latitude: number;
    longitude: number;
  };
}

const getAddressFromCoords = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
    const data = await response.json();
    return data.display_name || 'Adresse inconnue';
  } catch (error) {
    console.error('Failed to get address:', error);
    return 'Adresse inconnue';
  }
};

const fetchRecords = async () => {
  try {
    const response = await fetch('http://localhost:3000/get_records');
    const data = await response.json();
    if (data.success) {
      console.log('Records fetched:', data.records);
    } else {
      Alert.alert('Erreur', 'Failed to fetch records.');
    }
  } catch (error) {
    console.error('Error fetching records:', error);
    Alert.alert('Erreur', 'Failed to fetch records.');
  }
};

export default function HomeScreen() {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenProps['route']>();
  const { params } = route;
  const { contactNumber } = params || {};
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      const addr = await getAddressFromCoords(loc.coords.latitude, loc.coords.longitude);
      setAddress(addr);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setMediaLibraryPermission(status);
    })();
  }, []);

  useEffect(() => {
    if (contactNumber) {
      setSelectedContact(contactNumber);
    }
  }, [contactNumber]);

  const takePicture = async () => {
    if (cameraRef.current) {
      const picture = await cameraRef.current.takePictureAsync({
        base64: false,
        imageType: 'png',
      });
      console.log('Picture saved:', picture.uri);
      setImage(picture.uri as string);
      if (mediaLibraryPermission === 'granted') {
        await MediaLibrary.createAssetAsync(picture.uri);
      } else {
        Alert.alert('Permission Denied', 'Media library permission is required to save the image.');
      }
    }
  };

  async function playSound() {
    if (recordingUri) {
      console.log('Loading Sound');
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setSound(sound);

      console.log('Playing Sound');
      await sound.playAsync();
    } else {
      Alert.alert('No recording found', 'Please record something first.');
    }
  }

  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      console.log('Recording stopped and stored at', uri);
      setRecording(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    }
  }

  const shareImageAndMessage = async (imageUri: string, audioUri: string | null) => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Erreur', 'Le partage n\'est pas disponible sur ce périphérique.');
      return;
    }

    if (!location) {
      Alert.alert('Erreur', 'La localisation n\'est pas disponible.');
      return;
    }

    const address = await getAddressFromCoords(location.coords.latitude, location.coords.longitude);
    const message = `Urgent ! Contacte la police, je me fais agresser. Voici ma localisation: ${address} (https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude})`;

    try {
      await Sharing.shareAsync(imageUri, {
        dialogTitle: 'Partager l\'image',
        UTI: 'public.image',
      });

      if (selectedContact) {
        let smsUrl = `sms:${selectedContact}?body=${encodeURIComponent(message)}`;
        if (audioUri) {
          smsUrl += `&attachment=${encodeURIComponent(audioUri)}`;
        }
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert('Erreur', 'Aucun contact sélectionné.');
      }
    } catch (error) {
      console.error('Failed to share image and message:', error);
      Alert.alert('Erreur', `Échec du partage: ${error.message}`);
    }
  };

  const uploadToServer = async () => {
    if (!image || !selectedContact || !location) {
      Alert.alert('Erreur', 'Veuillez prendre une photo, sélectionner un contact, et obtenir votre localisation.');
      return;
    }

    let formData = new FormData();
    formData.append('contactNumber', selectedContact);
    formData.append('location', JSON.stringify(location.coords));
    formData.append('address', address);

    let photoFile = {
      uri: image,
      name: 'photo.jpg',
      type: 'image/jpeg',
    };
    formData.append('photo', photoFile);

    if (recordingUri) {
      let recordingFile = {
        uri: recordingUri,
        name: 'recording.wav',
        type: 'audio/wav',
      };
      formData.append('recording', recordingFile);
    }

    console.log('FormData to be sent:', formData);

    try {
      let response = await fetch('http://localhost:3000/save_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      let result = await response.json();
      console.log('Server response:', result);
      if (result.success) {
        Alert.alert('Data saved successfully!');
      } else {
        console.log('Failed to save data:', result);
        Alert.alert('Failed to save data');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('Error saving data');
    }
  };

  const handleShare = async () => {
    if (!image || !selectedContact) {
      Alert.alert('Erreur', 'Veuillez prendre une photo et sélectionner un contact.');
      return;
    }
    try {
      await shareImageAndMessage(image, recordingUri);
      await uploadToServer();
    } catch (error) {
      Alert.alert('Erreur', `Échec du partage: ${error.message}`);
    }
  };

  const handleSelectContact = () => {
    navigation.navigate('SelectContact');
  };

  if (!cameraPermission) {
    return <View />;
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestCameraPermission} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        />
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={takePicture}
        >
          <Text style={styles.cameraButtonText}>📸</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
        >
          <Text style={styles.flipButtonText}>Flip Camera</Text>
        </TouchableOpacity>
        {image && (
          <Image
            source={{ uri: image }}
            style={styles.image}
          />
        )}
      </View>
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={recording ? stopRecording : startRecording}
        >
          <Text style={styles.primaryButtonText}>{recording ? 'Stop Recording' : 'Start Recording'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={playSound}
        >
          <Text style={styles.primaryButtonText}>Play Sound</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleShare}
        >
          <Text style={styles.primaryButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={fetchRecords}
        >
          <Text style={styles.primaryButtonText}>Fetch Records</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSelectContact}>
        <Text style={styles.primaryButtonText}>Contact</Text>
      </TouchableOpacity>
      {selectedContact && <Text style={styles.selectedContactText}>Contact: {selectedContact}</Text>}
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 2,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: '#F0F0F0',
    borderRadius: 50,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  cameraButtonText: {
    fontSize: 24,
    color: '#000',
  },
  flipButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  flipButtonText: {
    fontSize: 16,
    color: '#000',
  },
  image: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 100,
    height: 100,
    borderRadius: 10,
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  controlsContainer: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  primaryButton: {
    backgroundColor: '#F0F0F0',
    padding: 15,
    borderRadius: 25,
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 18,
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  selectedContactText: {
    fontSize: 16,
    marginTop: 10,
    color: '#333',
    textAlign: 'center',
  },
});
