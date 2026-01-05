import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { User, Lock, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '@/common/hooks/useAppDispatch';
import { useAppSelector } from '@/common/hooks/useAppSelector';
import { login, checkAuth } from '@/features/auth/authSlice';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, router]);

  // Show error alert if login fails
  useEffect(() => {
    if (error && !isLoading) {
      Alert.alert('Login Failed', error);
    }
  }, [error, isLoading]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    const result = await dispatch(login({ username: username.trim(), password }));
      
    if (login.fulfilled.match(result)) {
      // Navigation handled by useEffect watching isAuthenticated
      router.replace('/(tabs)/home');
    }
  };

  // Show loading while checking authentication
  if (isLoading && !isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient
          colors={['#7EC8C6', '#B8E6E4']}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator size="large" color="#423491" />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#7EC8C6', '#B8E6E4']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.cardContainer}>
          {/* White Card */}
          <View style={styles.card}>
            
            {/* Logo Area */}
            <View style={styles.logoContainer}>
               <Image 
                source={require('@/assets/images/rent2own_logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Input Fields */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <User color="#000000" size={20} style={styles.icon} />
                <TextInput
                  placeholder="User Name"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock color="#000000" size={20} style={styles.icon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}>
                  {showPassword ? (
                    <EyeOff color="#000000" size={20} />
                  ) : (
                    <Eye color="#000000" size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: width * 0.85,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    // Elevation for Android
    elevation: 10,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 50,
    alignItems: 'center',
    overflow: 'hidden',
  },
  
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 100,
  },
  inputWrapper: {
    width: '100%',
    gap: 15,
    marginBottom: 35,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000000',
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#423491',
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
export default LoginScreen;
