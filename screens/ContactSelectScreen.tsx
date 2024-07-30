import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, TextInput, Alert } from 'react-native';
import * as Contacts from 'expo-contacts';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from './types'; // Assurez-vous que types.ts est correctement importé
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

type ContactSelectNavigationProp = StackNavigationProp<RootStackParamList, 'SelectContact'>;

type Contact = {
  id: string;
  name: string;
  phoneNumbers?: { number: string }[];
};

export default function ContactSelectScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState<string>('');
  const navigation = useNavigation<ContactSelectNavigationProp>();

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });
        if (data.length > 0) {
          setContacts(data as Contact[]);
        }
      } else {
        Alert.alert('Permission to access contacts was denied');
      }
    })();
  }, []);

  const handleContactSelect = (contact: Contact) => {
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const contactNumber = contact.phoneNumbers[0].number;
      navigation.navigate('Home', { contactNumber });
    }
  };

  const filteredContacts = contacts.filter(contact =>
    (contact.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.contactListTitle}>Select a Contact</Text>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
        <TextInput
          style={styles.searchBar}
          placeholder="Search contacts"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleContactSelect(item)}
          >
            <Text style={styles.contactName}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={20} color="#aaa" />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  contactListTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  contactName: {
    fontSize: 18,
    color: '#333',
  },
});
