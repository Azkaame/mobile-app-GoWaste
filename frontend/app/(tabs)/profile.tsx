import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { authAPI } from '../../src/services/api';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      setShowLogoutModal(true);
    } else {
      Alert.alert(
        'Keluar',
        'Apakah Anda yakin ingin keluar dari akun?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Keluar',
            style: 'destructive',
            onPress: confirmLogout,
          },
        ]
      );
    }
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
      if (currentStatus === 'granted') return true;
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status === 'granted') return true;
      
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Izin Kamera Diperlukan',
          'Untuk mengambil foto, Anda perlu mengizinkan akses kamera.\n\nBuka: Settings > Expo Go > Camera',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Izin Kamera Diperlukan', 'Izinkan akses kamera di pengaturan.');
      }
      return false;
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  };

  const requestGalleryPermission = async () => {
    try {
      const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (currentStatus === 'granted') return true;
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status === 'granted') return true;
      
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Izin Galeri Diperlukan',
          'Untuk memilih foto, Anda perlu mengizinkan akses galeri.\n\nBuka: Settings > Expo Go > Photos',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Izin Galeri Diperlukan', 'Izinkan akses galeri di pengaturan.');
      }
      return false;
    } catch (error) {
      console.error('Gallery permission error:', error);
      return false;
    }
  };

  const takePhoto = async () => {
    setShowPhotoOptions(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0] && result.assets[0].base64) {
        await uploadProfileImage(result.assets[0].base64);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Gagal Membuka Kamera',
          'Coba tutup Expo Go, pastikan izin kamera aktif di Settings, lalu buka ulang aplikasi.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Gagal membuka kamera.');
      }
    }
  };

  const pickFromGallery = async () => {
    setShowPhotoOptions(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0] && result.assets[0].base64) {
        await uploadProfileImage(result.assets[0].base64);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Gagal Membuka Galeri',
          'Coba tutup Expo Go, pastikan izin foto aktif di Settings, lalu buka ulang aplikasi.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Gagal membuka galeri.');
      }
    }
  };

  const uploadProfileImage = async (base64: string) => {
    setUploadingPhoto(true);
    try {
      await authAPI.updateProfileImage(base64);
      if (refreshUser) {
        await refreshUser();
      }
      Alert.alert('Berhasil', 'Foto profil berhasil diperbarui!');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Gagal', error.response?.data?.detail || 'Gagal mengupload foto profil');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const isMasyarakat = user?.role === 'masyarakat';
  const profileImageUrl = user?.profile_image ? `${API_URL}${user.profile_image}` : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => setShowPhotoOptions(true)}
            disabled={uploadingPhoto}
          >
            {profileImageUrl ? (
              <Image 
                source={{ uri: profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.roleTag}>
              <Ionicons
                name={isMasyarakat ? 'people' : 'bug'}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
          {uploadingPhoto && (
            <Text style={styles.uploadingText}>Mengupload foto...</Text>
          )}
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>
            {isMasyarakat ? 'Penyetor Sampah' : 'Pembudidaya BSF'}
          </Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Akun</Text>
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail" size={20} color="#22C55E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="call" size={20} color="#22C55E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Telepon</Text>
                <Text style={styles.infoValue}>{user?.phone}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Location Info (only for Masyarakat) */}
        {isMasyarakat && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lokasi</Text>
            <Card style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location" size={20} color="#22C55E" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Alamat</Text>
                  <Text style={styles.infoValue}>
                    {user?.address || 'Belum diatur'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="navigate" size={20} color="#22C55E" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Koordinat</Text>
                  <Text style={styles.infoValue}>
                    {user?.latitude && user?.longitude
                      ? `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`
                      : 'Belum diatur'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <TouchableOpacity 
                style={styles.setLocationButton}
                onPress={() => router.push('/pilih-lokasi')}
              >
                <Ionicons name="map" size={20} color="#22C55E" />
                <Text style={styles.setLocationText}>Atur Lokasi</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {/* About App */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tentang Aplikasi</Text>
          <Card style={styles.aboutCard}>
            <View style={styles.appLogoContainer}>
              <View style={styles.appLogo}>
                <Ionicons name="leaf" size={32} color="#22C55E" />
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>GoWaste</Text>
                <Text style={styles.appVersion}>Versi 1.0.0</Text>
              </View>
            </View>
            <Text style={styles.appDescription}>
              Aplikasi pengelolaan sampah organik berbasis digital melalui
              biokonversi maggot Black Soldier Fly (BSF). Menghubungkan
              masyarakat dengan pembudidaya BSF untuk pengelolaan sampah yang
              berkelanjutan.
            </Text>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={16} color="#6B7280" />
              <Text style={styles.locationText}>Studi Kasus: Kota Malang</Text>
            </View>
          </Card>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <Button
            title="Keluar dari Akun"
            onPress={handleLogout}
            variant="danger"
            loading={loggingOut}
            size="large"
          />
        </View>
        
        {/* Extra space at bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Photo Options Modal */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowPhotoOptions(false)}
        >
          <View style={styles.photoOptionsContainer}>
            <Text style={styles.photoOptionsTitle}>Ubah Foto Profil</Text>
            
            <TouchableOpacity style={styles.photoOption} onPress={takePhoto}>
              <View style={[styles.photoOptionIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="camera" size={28} color="#22C55E" />
              </View>
              <View style={styles.photoOptionContent}>
                <Text style={styles.photoOptionTitle}>Ambil Foto</Text>
                <Text style={styles.photoOptionSubtitle}>Gunakan kamera untuk mengambil foto</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoOption} onPress={pickFromGallery}>
              <View style={[styles.photoOptionIcon, { backgroundColor: '#E0E7FF' }]}>
                <Ionicons name="images" size={28} color="#6366F1" />
              </View>
              <View style={styles.photoOptionContent}>
                <Text style={styles.photoOptionTitle}>Pilih dari Galeri</Text>
                <Text style={styles.photoOptionSubtitle}>Pilih foto dari galeri Anda</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Logout Confirmation Modal for Web */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContent}>
            <Text style={styles.logoutModalTitle}>Keluar</Text>
            <Text style={styles.logoutModalMessage}>
              Apakah Anda yakin ingin keluar dari akun?
            </Text>
            <View style={styles.logoutModalButtons}>
              <Pressable
                style={[styles.logoutModalButton, styles.logoutModalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.logoutModalButtonTextCancel}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.logoutModalButton, styles.logoutModalButtonConfirm]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutModalButtonTextConfirm}>Keluar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22C55E',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  roleTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#22C55E',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  uploadingText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 15,
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  infoCard: {
    padding: 0,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  setLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  setLocationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#22C55E',
  },
  aboutCard: {
    padding: 20,
  },
  appLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfo: {
    marginLeft: 16,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  appVersion: {
    fontSize: 14,
    color: '#6B7280',
  },
  appDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Photo Options Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  photoOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  photoOptionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  photoOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOptionContent: {
    flex: 1,
    marginLeft: 16,
  },
  photoOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  photoOptionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Logout Modal
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  logoutModalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutModalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  logoutModalButtonConfirm: {
    backgroundColor: '#EF4444',
  },
  logoutModalButtonTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  logoutModalButtonTextConfirm: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
