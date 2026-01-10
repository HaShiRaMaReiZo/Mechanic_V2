import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '@/common/hooks/useAppDispatch';
import { useAppSelector } from '@/common/hooks/useAppSelector';
import { logout } from '@/features/auth/authSlice';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AppBackground from '@/components/AppBackground';
import { apiService } from '@/services/api';

interface UserProfile {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export default function SettingScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user: authUser } = useAppSelector((state) => state.auth);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount] = useState(1); // Placeholder for notification count

  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getCurrentUser();
      
      if (response.success && response.data?.user) {
        setUserProfile(response.data.user);
      } else {
        // Fallback to auth user if API fails
        if (authUser) {
          setUserProfile({
            id: authUser.id,
            username: authUser.username,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to auth user
      if (authUser) {
        setUserProfile({
          id: authUser.id,
          username: authUser.username,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logout());
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleNotificationPress = () => {
    // TODO: Navigate to notification screen
    Alert.alert('Notifications', 'Notification screen coming soon');
  };

  const handleHelpPress = () => {
    // TODO: Navigate to help & support screen
    Alert.alert('Help & Support', 'Help & Support screen coming soon');
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName} ${userProfile.lastName}`;
    }
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    return userProfile?.username || 'User';
  };

  // Get user phone
  const getUserPhone = () => {
    return userProfile?.phone || 'N/A';
  };

  return (
    <AppBackground>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#423491" />
          </View>
        ) : (
          <>
            {/* User Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.profileIconContainer}>
                <IconSymbol name="person.fill" size={40} color="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{getUserDisplayName()}</Text>
                <Text style={styles.profilePhone}>{getUserPhone()}</Text>
              </View>
            </View>

            {/* Navigation Options */}
            <View style={styles.navigationSection}>
              {/* Notification Card */}
              <TouchableOpacity
                style={styles.navCard}
                onPress={handleNotificationPress}
                activeOpacity={0.7}
              >
                <View style={styles.navCardLeft}>
                  <View style={styles.bellIconContainer}>
                    <IconSymbol name="bell" size={24} color="#FF0000" />
                    {notificationCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{notificationCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.navCardText}>Notification</Text>
                </View>
                <IconSymbol name="chevron.right" size={24} color="#000000" />
              </TouchableOpacity>

              {/* Help & Support Card */}
              <TouchableOpacity
                style={styles.navCard}
                onPress={handleHelpPress}
                activeOpacity={0.7}
              >
                <View style={styles.navCardLeft}>
                  <View style={styles.helpIconContainer}>
                    <IconSymbol name="questionmark.circle.fill" size={24} color="#000000" />
                  </View>
                  <Text style={styles.navCardText}>Help & Support</Text>
                </View>
                <IconSymbol name="chevron.right" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Log Out Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <IconSymbol name="arrow.right.square" size={24} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>

            {/* Version Number */}
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </>
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#423491',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#423491',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: '#000000',
    opacity: 0.7,
  },
  navigationSection: {
    marginBottom: 24,
    gap: 12,
  },
  navCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bellIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  helpIconContainer: {
    marginRight: 12,
  },
  navCardText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  logoutButton: {
    backgroundColor: '#FF0000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  versionText: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginTop: 8,
  },
});
