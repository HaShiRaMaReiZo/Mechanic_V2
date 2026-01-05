import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppDispatch } from '@/common/hooks/useAppDispatch';
import { useAppSelector } from '@/common/hooks/useAppSelector';
import { searchContract, clearSearchResults, clearError } from '@/features/contracts/contractsSlice';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { searchResults, isLoading, error } = useAppSelector((state) => state.contracts);
  
  const [contractNo, setContractNo] = useState('');

  // Clear search results when screen comes into focus (when navigating back)
  useFocusEffect(
    useCallback(() => {
      // Clear search results when screen is focused
      dispatch(clearSearchResults());
    }, [dispatch])
  );

  // Show error alert if search fails
  useEffect(() => {
    if (error) {
      Alert.alert('Not Found', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Navigate to maintenance data page when search is successful
  useEffect(() => {
    if (searchResults && !isLoading) {
      router.push('/(tabs)/maintenance-data');
    }
  }, [searchResults, isLoading, router]);

  const handleSearch = () => {
    if (!contractNo.trim()) {
      Alert.alert('Error', 'Please enter a contract number');
      return;
    }

    dispatch(searchContract(contractNo.trim()));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#7EC8C6', '#B8E6E4', '#E0F4F3']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContentCentered}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Card */}
          <View style={styles.searchCard}>
            <Text style={styles.searchLabel}>Search By Contract No.</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="eg. 281447-WCSV1"
                placeholderTextColor="#999"
                style={styles.input}
                value={contractNo}
                onChangeText={setContractNo}
                autoCapitalize="characters"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.searchButton, isLoading && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                  <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7EC8C6',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
    padding: 20,
    paddingTop: 100,
  },
  searchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: 'transparent',
  },
  searchButton: {
    backgroundColor: '#423491',
    borderRadius: 40,
    height: 50,
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    minWidth: 120,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
