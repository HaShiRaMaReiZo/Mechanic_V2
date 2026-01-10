import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '@/common/hooks/useAppDispatch';
import { useAppSelector } from '@/common/hooks/useAppSelector';
import { clearSearchResults } from '@/features/contracts/contractsSlice';
import { StatusBanner } from '@/common/components/StatusBanner';
import AppBackground from '@/components/AppBackground';

export default function MaintenanceDataScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { searchResults } = useAppSelector((state) => state.contracts);

  // If no search results, redirect to home (use useEffect to avoid render-time navigation)
  useEffect(() => {
    if (!searchResults) {
      router.replace('/(tabs)/home');
    }
  }, [searchResults, router]);

  // Show loading or nothing while redirecting
  if (!searchResults) {
    return (
      <AppBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#423491" />
        </View>
      </AppBackground>
    );
  }

  const handleBack = () => {
    // Clear search results when going back
    dispatch(clearSearchResults());
    router.replace('/(tabs)/home');
  };

  const handleContinue = () => {
    router.push('/(tabs)/services');
  };

  return (
    <AppBackground>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Maintenance Data</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contract Info Section */}
        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contract Info</Text>
            <View style={styles.sectionContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Client Name</Text>
                <Text style={styles.infoValue}>
                  {searchResults.contract.customerFullName || 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contract No.</Text>
                <Text style={styles.infoValue}>{searchResults.contract.contractNo}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Maintenance Code</Text>
                <Text style={styles.infoValue}>
                  {searchResults.maintenanceStatus?.maintenanceCode || 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Date</Text>
                <Text style={styles.infoValue}>
                  {searchResults.contract.contractDate
                    ? (() => {
                        const date = new Date(searchResults.contract.contractDate);
                        const year = date.getFullYear();
                        const month = date.getMonth() + 1;
                        const day = date.getDate();
                        return `${year}-${month}-${day}`;
                      })()
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Due Date</Text>
                <Text style={styles.infoValue}>
                  {searchResults.maintenanceStatus?.maintDueDate
                    ? (() => {
                        const date = new Date(searchResults.maintenanceStatus.maintDueDate);
                        const year = date.getFullYear();
                        const month = date.getMonth() + 1;
                        const day = date.getDate();
                        return `${year}-${month}-${day}`;
                      })()
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone 1</Text>
                <Text style={styles.infoValue}>
                  {searchResults.contract.phoneNo1 || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Product Info Section */}
          {searchResults.assets && searchResults.assets.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Info</Text>
              <View style={styles.sectionContent}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Product Name</Text>
                  <Text style={styles.infoValue}>
                    {searchResults.assets[0].productName || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Product Color</Text>
                  <Text style={styles.infoValue}>
                    {searchResults.assets[0].productColor || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Engine No.</Text>
                  <Text style={styles.infoValue}>
                    {searchResults.assets[0].engineNo || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Chassis No.</Text>
                  <Text style={styles.infoValue}>
                    {searchResults.assets[0].chassisNo || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Plate No.</Text>
                  <Text style={styles.infoValue}>
                    {searchResults.assets[0].plateNo || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Condition Section */}
          {searchResults.assets &&
            searchResults.assets.length > 0 &&
            searchResults.assets[0].maintenances &&
            searchResults.assets[0].maintenances.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Condition</Text>
                <View style={styles.sectionContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Chain Sprocket Changed</Text>
                    <Text style={styles.infoValue}>
                      {searchResults.assets[0].maintenances[0].chainSprocketChanged === 1
                        ? 'Yes'
                        : 'No'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Chain Tightened</Text>
                    <Text style={styles.infoValue}>
                      {searchResults.assets[0].maintenances[0].chainTightened === 1
                        ? 'Yes'
                        : 'No'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Engine Oil Refilled</Text>
                    <Text style={styles.infoValue}>
                      {searchResults.assets[0].maintenances[0].engineOilRefilled === 1
                        ? 'Yes'
                        : 'No'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

          {/* Status Banner */}
          <StatusBanner maintenanceStatus={searchResults.maintenanceStatus} />

          {/* Continue Button - Only show when status is DUE */}
          {searchResults.maintenanceStatus?.status === 'DUE' && (
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
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
    width: 40, // Same width as back button to center title
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textDecorationLine: 'underline',
  },
  sectionContent: {
    paddingLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  continueButton: {
    backgroundColor: '#423491',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

