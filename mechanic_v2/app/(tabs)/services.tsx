import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '@/common/hooks/useAppSelector';
import { apiService } from '@/services/api';
import { CustomToggleSwitch } from '@/components/CustomToggleSwitch';

interface ServiceState {
  enabled: boolean;
  amount: string;
}

export default function ServicesScreen() {
  const router = useRouter();
  const { searchResults } = useAppSelector((state) => state.contracts);

  // Service states
  const [engineOil, setEngineOil] = useState<ServiceState>({ enabled: false, amount: '' });
  const [chainSprocket, setChainSprocket] = useState<ServiceState>({ enabled: false, amount: '' });
  const [chainTightening, setChainTightening] = useState<ServiceState>({ enabled: false, amount: '' });
  const [serviceFee, setServiceFee] = useState<ServiceState>({ enabled: false, amount: '' });

  // Required fields
  const [mileage, setMileage] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  // Image
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleImagePicker = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to take photos!');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleConfirm = async () => {
    // Validate required fields
    if (!mileage.trim()) {
      Alert.alert('Validation Error', 'Please enter mileage');
      return;
    }

    if (!totalAmount.trim()) {
      Alert.alert('Validation Error', 'Please enter total amount');
      return;
    }

    // Get maintId from search results
    // Find the maintenance record that matches the maintenanceCode from status, or use the first uncompleted one
    let maintId: number | undefined;
    
    if (searchResults?.assets && searchResults.assets.length > 0) {
      const maintenances = searchResults.assets[0].maintenances || [];
      const maintenanceCode = searchResults.maintenanceStatus?.maintenanceCode;
      
      if (maintenanceCode) {
        // Find maintenance record matching the maintenanceCode
        const matchingMaint = maintenances.find(m => m.maintenanceCode === maintenanceCode);
        if (matchingMaint && matchingMaint.maintId) {
          maintId = matchingMaint.maintId;
        }
      }
      
      // If no match found, use the first uncompleted maintenance (no dateImplemented)
      if (!maintId) {
        const uncompletedMaint = maintenances.find(m => !m.dateImplemented);
        if (uncompletedMaint && uncompletedMaint.maintId) {
          maintId = uncompletedMaint.maintId;
        } else if (maintenances.length > 0 && maintenances[0].maintId) {
          // Fallback to first maintenance record
          maintId = maintenances[0].maintId;
        }
      }
    }
    
    if (!maintId) {
      Alert.alert('Error', 'Maintenance ID not found. Please search for a contract first.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare service data
      const serviceData = {
        engineOil: engineOil.enabled ? { enabled: true, amount: engineOil.amount } : undefined,
        chainSprocket: chainSprocket.enabled ? { enabled: true, amount: chainSprocket.amount } : undefined,
        chainTightening: chainTightening.enabled ? { enabled: true, amount: chainTightening.amount } : undefined,
        serviceFee: serviceFee.enabled ? { enabled: true, amount: serviceFee.amount } : undefined,
        mileage: mileage.trim(),
        totalAmount: totalAmount.trim(),
        imageUri: imageUri,
      };

      // Submit to API
      const result = await apiService.submitMaintenanceService(maintId, serviceData);

      if (result.success) {
        Alert.alert('Success', 'Maintenance service submitted successfully!', [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to submit maintenance service');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'An error occurred while submitting the service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = mileage.trim() !== '' && totalAmount.trim() !== '';

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Background Gradient */}
        <LinearGradient
          colors={['#7EC8C6', '#B8E6E4', '#E0F4F3']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        <View style={styles.card}>
          {/* Service Options */}
          <View style={styles.serviceSection}>
            {/* Engine Oil */}
            <View style={styles.serviceItem}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceLabel}>Engine Oil</Text>
                <CustomToggleSwitch
                  value={engineOil.enabled}
                  onValueChange={(value) => setEngineOil({ ...engineOil, enabled: value })}
                  trackColor={{ false: '#D3D3D3', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {engineOil.enabled && (
                <View style={styles.amountInputContainer}>
                  <TextInput
                    placeholder="Amount MMK"
                    placeholderTextColor="#999"
                    style={styles.amountInput}
                    value={engineOil.amount}
                    onChangeText={(text) => setEngineOil({ ...engineOil, amount: text })}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            {/* Chain Sprocket */}
            <View style={styles.serviceItem}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceLabel}>Chain Sprocket</Text>
                <CustomToggleSwitch
                  value={chainSprocket.enabled}
                  onValueChange={(value) => setChainSprocket({ ...chainSprocket, enabled: value })}
                  trackColor={{ false: '#D3D3D3', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {chainSprocket.enabled && (
                <View style={styles.amountInputContainer}>
                  <TextInput
                    placeholder="Amount MMK"
                    placeholderTextColor="#999"
                    style={styles.amountInput}
                    value={chainSprocket.amount}
                    onChangeText={(text) => setChainSprocket({ ...chainSprocket, amount: text })}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            {/* Chain Tightening */}
            <View style={styles.serviceItem}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceLabel}>Chain Tightening</Text>
                <CustomToggleSwitch
                  value={chainTightening.enabled}
                  onValueChange={(value) => setChainTightening({ ...chainTightening, enabled: value })}
                  trackColor={{ false: '#D3D3D3', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {chainTightening.enabled && (
                <View style={styles.amountInputContainer}>
                  <TextInput
                    placeholder="Amount MMK"
                    placeholderTextColor="#999"
                    style={styles.amountInput}
                    value={chainTightening.amount}
                    onChangeText={(text) => setChainTightening({ ...chainTightening, amount: text })}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            {/* Service Fee */}
            <View style={styles.serviceItem}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceLabel}>Service Fee</Text>
                <CustomToggleSwitch
                  value={serviceFee.enabled}
                  onValueChange={(value) => setServiceFee({ ...serviceFee, enabled: value })}
                  trackColor={{ false: '#D3D3D3', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {serviceFee.enabled && (
                <View style={styles.amountInputContainer}>
                  <TextInput
                    placeholder="Amount MMK"
                    placeholderTextColor="#999"
                    style={styles.amountInput}
                    value={serviceFee.amount}
                    onChangeText={(text) => setServiceFee({ ...serviceFee, amount: text })}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>
          </View>

          {/* Required Input Fields */}
          <View style={styles.inputSection}>
            <View style={styles.inputItem}>
              <Text style={styles.inputLabel}>
                Mileage<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Km"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={mileage}
                  onChangeText={setMileage}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputItem}>
              <Text style={styles.inputLabel}>
                Total Amount<Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Amount MMK"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Image Upload Area */}
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imageUploadBox} onPress={handleImagePicker}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.uploadedImage} resizeMode="cover" />
              ) : (
                <Camera size={48} color="#666" />
              )}
            </TouchableOpacity>
          </View>

          {/* Confirm Button */}
          <View style={styles.confirmButtonContainer}>
            <TouchableOpacity
              style={[styles.confirmButton, (!isFormValid || isSubmitting) && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7EC8C6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#423491',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  serviceSection: {
    marginBottom: 24,
  },
  serviceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  amountInputContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  amountInput: {
    padding: 12,
    fontSize: 14,
    color: '#000',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputItem: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: '#FF0000',
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: 'transparent',
  },
  imageSection: {
    marginBottom: 24,
  },
  confirmButtonContainer: {
    marginTop: 8,
    marginBottom: 0,
  },
  imageUploadBox: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

