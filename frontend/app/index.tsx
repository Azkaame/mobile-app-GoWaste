import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const spinnerOpacity = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Title entrance
      Animated.parallel([
        Animated.spring(titleTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle entrance
      Animated.parallel([
        Animated.spring(subtitleTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Spinner fade in
      Animated.timing(spinnerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous spin animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Add a small delay for smooth transition
      setTimeout(() => {
        if (isAuthenticated && user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 500);
    }
  }, [isAuthenticated, isLoading, user]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.circle1]} />
      <View style={[styles.decorCircle, styles.circle2]} />
      <View style={[styles.decorCircle, styles.circle3]} />

      {/* Logo */}
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [
              { scale: Animated.multiply(logoScale, pulseValue) }
            ],
          }
        ]}
      >
        <View style={styles.iconWrapper}>
          <Ionicons name="leaf" size={56} color="#FFFFFF" />
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.Text 
        style={[
          styles.title,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          }
        ]}
      >
        GoWaste
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text 
        style={[
          styles.subtitle,
          {
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleTranslateY }],
          }
        ]}
      >
        Kelola Sampah Organik Bersama
      </Animated.Text>

      {/* Loading Spinner */}
      <Animated.View 
        style={[
          styles.spinnerContainer,
          { opacity: spinnerOpacity }
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <View style={styles.spinner}>
            <View style={styles.spinnerDot} />
          </View>
        </Animated.View>
        <Text style={styles.loadingText}>Memuat aplikasi...</Text>
      </Animated.View>

      {/* Bottom decoration */}
      <View style={styles.bottomWave}>
        <View style={styles.wave1} />
        <View style={styles.wave2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.3,
    right: -width * 0.2,
  },
  circle2: {
    width: width * 0.6,
    height: width * 0.6,
    bottom: -width * 0.2,
    left: -width * 0.3,
  },
  circle3: {
    width: width * 0.4,
    height: width * 0.4,
    bottom: height * 0.3,
    right: -width * 0.15,
  },
  logoContainer: {
    marginBottom: 24,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  spinnerContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 2,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  bottomWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    overflow: 'hidden',
  },
  wave1: {
    position: 'absolute',
    bottom: -50,
    left: -20,
    right: -20,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  wave2: {
    position: 'absolute',
    bottom: -70,
    left: -10,
    right: -10,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
  },
});
