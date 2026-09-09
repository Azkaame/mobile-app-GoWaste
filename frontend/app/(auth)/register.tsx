import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'masyarakat' as 'masyarakat' | 'pembudidaya',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register } = useAuth();
  const router = useRouter();

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nama wajib diisi';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor telepon wajib diisi';
    } else if (!/^[0-9]{10,13}$/.test(formData.phone.replace(/[^0-9]/g, ''))) {
      newErrors.phone = 'Nomor telepon tidak valid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password wajib diisi';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak sama';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Registrasi Gagal',
        error.response?.data?.detail || 'Terjadi kesalahan saat mendaftar'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Ionicons name="leaf" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Daftar GoWaste</Text>
            <Text style={styles.subtitle}>Buat akun baru</Text>
          </View>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>Daftar sebagai:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'masyarakat' && styles.roleButtonActive,
                ]}
                onPress={() => updateField('role', 'masyarakat')}
              >
                <Ionicons
                  name="people"
                  size={24}
                  color={formData.role === 'masyarakat' ? '#FFFFFF' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === 'masyarakat' && styles.roleButtonTextActive,
                  ]}
                >
                  Masyarakat
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'pembudidaya' && styles.roleButtonActive,
                ]}
                onPress={() => updateField('role', 'pembudidaya')}
              >
                <Ionicons
                  name="bug"
                  size={24}
                  color={formData.role === 'pembudidaya' ? '#FFFFFF' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === 'pembudidaya' && styles.roleButtonTextActive,
                  ]}
                >
                  Pembudidaya
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              value={formData.name}
              onChangeText={(v) => updateField('name', v)}
              error={errors.name}
            />

            <Input
              label="Email"
              placeholder="Masukkan email"
              value={formData.email}
              onChangeText={(v) => updateField('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <Input
              label="Nomor Telepon"
              placeholder="Contoh: 08123456789"
              value={formData.phone}
              onChangeText={(v) => updateField('phone', v)}
              keyboardType="phone-pad"
              error={errors.phone}
            />

            <View style={styles.passwordContainer}>
              <Input
                label="Password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChangeText={(v) => updateField('password', v)}
                secureTextEntry={!showPassword}
                error={errors.password}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            <Input
              label="Konfirmasi Password"
              placeholder="Ulangi password"
              value={formData.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              secureTextEntry={!showPassword}
              error={errors.confirmPassword}
            />

            <Button
              title="Daftar"
              onPress={handleRegister}
              loading={loading}
              size="large"
              style={styles.registerButton}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Sudah punya akun? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>Masuk</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  roleContainer: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  roleButtonActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  form: {
    flex: 1,
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 42,
  },
  registerButton: {
    marginTop: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
  },
});
