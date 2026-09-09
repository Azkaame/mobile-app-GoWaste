import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { transactionsAPI } from '../../src/services/api';
import { WasteType, CreateTransactionData } from '../../src/types';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import Card from '../../src/components/Card';

const wasteTypes: { key: WasteType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }[] = [
  { key: 'sisa_makanan', label: 'Sisa Makanan', icon: 'restaurant', color: '#EA580C', bgColor: '#FED7AA' },
  { key: 'sayur_buah', label: 'Sayur & Buah', icon: 'leaf', color: '#16A34A', bgColor: '#BBF7D0' },
  { key: 'organik_lainnya', label: 'Organik Lainnya', icon: 'trash', color: '#7C3AED', bgColor: '#DDD6FE' },
];

export default function CreateTransactionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [isPickerBusy, setIsPickerBusy] = useState(false); // Prevent multiple calls
  const [formData, setFormData] = useState({
    waste_type: '' as WasteType | '',
    estimated_weight: '',
    description: '',
    pickup_address: user?.address || '',
    latitude: user?.latitude || -7.9666,
    longitude: user?.longitude || 112.6326,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user has set their location
  const hasLocation = user?.address && user?.latitude && user?.longitude;

  const updateField = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const requestCameraPermission = async () => {
    try {
      // First check current permission status
      const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
      console.log('Current camera permission:', currentStatus);
      
      if (currentStatus === 'granted') {
        return true;
      }
      
      // Request permission if not granted
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission after request:', status);
      
      if (status === 'granted') {
        return true;
      }
      
      // Permission denied - show alert with option to open settings
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Izin Kamera Diperlukan',
          'Untuk mengambil foto, Anda perlu mengizinkan akses kamera di Pengaturan iPhone.\n\nBuka: Settings > Expo Go > Camera',
          [
            { text: 'Batal', style: 'cancel' },
            { 
              text: 'Buka Settings', 
              onPress: () => {
                // On iOS, this will open the app settings
                if (Platform.OS === 'ios') {
                  import('react-native').then(({ Linking }) => {
                    Linking.openURL('app-settings:');
                  });
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Izin Kamera Diperlukan',
          'Untuk mengambil foto, izinkan akses kamera di pengaturan aplikasi.',
          [{ text: 'OK' }]
        );
      }
      return false;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  const requestGalleryPermission = async () => {
    try {
      // First check current permission status
      const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('Current gallery permission:', currentStatus);
      
      if (currentStatus === 'granted') {
        return true;
      }
      
      // Request permission if not granted
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Gallery permission after request:', status);
      
      if (status === 'granted') {
        return true;
      }
      
      // Permission denied - show alert with option to open settings
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Izin Galeri Diperlukan',
          'Untuk memilih foto, Anda perlu mengizinkan akses galeri di Pengaturan iPhone.\n\nBuka: Settings > Expo Go > Photos',
          [
            { text: 'Batal', style: 'cancel' },
            { 
              text: 'Buka Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  import('react-native').then(({ Linking }) => {
                    Linking.openURL('app-settings:');
                  });
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Izin Galeri Diperlukan',
          'Untuk memilih foto, izinkan akses galeri di pengaturan aplikasi.',
          [{ text: 'OK' }]
        );
      }
      return false;
    } catch (error) {
      console.error('Error requesting gallery permission:', error);
      return false;
    }
  };

  const takePhoto = async () => {
    // Prevent multiple simultaneous calls (iOS issue)
    if (isPickerBusy) {
      console.log('Image picker is busy, please wait...');
      return;
    }
    
    setShowPhotoOptions(false);
    setIsPickerBusy(true);
    
    // Longer delay for iOS stability
    await new Promise(resolve => setTimeout(resolve, Platform.OS === 'ios' ? 300 : 100));
    
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      setIsPickerBusy(false);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: Platform.OS === 'ios' ? 0.3 : 0.5, // Lower quality for iOS
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setPhotoBase64(result.assets[0].base64 || null);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Gagal Membuka Kamera',
          'Terjadi masalah saat membuka kamera. Coba langkah berikut:\n\n1. Tutup Expo Go sepenuhnya\n2. Buka Settings > Expo Go > Camera (pastikan ON)\n3. Buka ulang Expo Go dan scan QR code lagi',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Gagal membuka kamera. Silakan coba lagi.');
      }
    } finally {
      // Release lock after a delay (helps iOS)
      setTimeout(() => setIsPickerBusy(false), Platform.OS === 'ios' ? 500 : 100);
    }
  };

  const pickFromGallery = async () => {
    // Prevent multiple simultaneous calls (iOS issue)
    if (isPickerBusy) {
      console.log('Image picker is busy, please wait...');
      return;
    }
    
    setShowPhotoOptions(false);
    setIsPickerBusy(true);
    
    // Longer delay for iOS stability
    await new Promise(resolve => setTimeout(resolve, Platform.OS === 'ios' ? 300 : 100));
    
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      setIsPickerBusy(false);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: Platform.OS === 'ios' ? 0.3 : 0.5, // Lower quality for iOS
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setPhotoBase64(result.assets[0].base64 || null);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Gagal Membuka Galeri',
          'Terjadi masalah saat membuka galeri. Coba langkah berikut:\n\n1. Tutup Expo Go sepenuhnya\n2. Buka Settings > Expo Go > Photos (pastikan "All Photos")\n3. Buka ulang Expo Go dan scan QR code lagi',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Gagal membuka galeri. Silakan coba lagi.');
      }
    } finally {
      // Release lock after a delay (helps iOS)
      setTimeout(() => setIsPickerBusy(false), Platform.OS === 'ios' ? 500 : 100);
    }
  };

  const removePhoto = () => {
    setPhotoUri(null);
    setPhotoBase64(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.waste_type) {
      newErrors.waste_type = 'Pilih jenis sampah';
    }
    
    if (!formData.estimated_weight) {
      newErrors.estimated_weight = 'Masukkan estimasi berat';
    } else {
      const weight = parseFloat(formData.estimated_weight);
      if (isNaN(weight) || weight <= 0) {
        newErrors.estimated_weight = 'Berat harus lebih dari 0';
      } else if (weight > 1000) {
        newErrors.estimated_weight = 'Berat maksimal 1000 kg';
      }
    }
    
    if (!formData.pickup_address.trim()) {
      newErrors.pickup_address = 'Masukkan alamat pengambilan';
    }

    if (!photoUri) {
      newErrors.photo = 'Ambil foto sampah terlebih dahulu';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const data: CreateTransactionData = {
        waste_type: formData.waste_type as WasteType,
        estimated_weight: parseFloat(formData.estimated_weight),
        description: formData.description,
        pickup_address: formData.pickup_address.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        photo_base64: photoBase64 || undefined,
      };

      await transactionsAPI.create(data);
      
      if (Platform.OS === 'web') {
        setShowSuccessModal(true);
      } else {
        Alert.alert(
          'Berhasil!',
          'Pengajuan setoran sampah berhasil dibuat. Tunggu konfirmasi dari pembudidaya.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Terjadi kesalahan saat membuat pengajuan';
      if (Platform.OS === 'web') {
        setErrorMessage(msg);
        setShowErrorModal(true);
      } else {
        Alert.alert('Gagal', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const navigateToSetLocation = () => {
    router.push('/pilih-lokasi');
  };

  // If user hasn't set their location, show warning
  if (!hasLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </Pressable>
          <Text style={styles.headerTitle}>Ajukan Setoran</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.noLocationContainer}>
          <View style={styles.noLocationIcon}>
            <Ionicons name="location-outline" size={64} color="#9CA3AF" />
          </View>
          <Text style={styles.noLocationTitle}>Lokasi Belum Diatur</Text>
          <Text style={styles.noLocationText}>
            Anda harus mengatur lokasi terlebih dahulu sebelum dapat mengajukan setoran sampah.
          </Text>
          <Button
            title="Atur Lokasi Sekarang"
            onPress={navigateToSetLocation}
            style={styles.setLocationButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Ajukan Setoran</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Photo Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Foto Sampah</Text>
            <Text style={styles.sectionSubtitle}>Ambil foto sampah yang akan disetor</Text>
            
            {photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={styles.photoActions}>
                  <TouchableOpacity 
                    style={styles.photoActionButton}
                    onPress={() => setShowPhotoOptions(true)}
                  >
                    <Ionicons name="camera" size={20} color="#22C55E" />
                    <Text style={styles.photoActionText}>Ganti Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.photoActionButton, styles.photoDeleteButton]}
                    onPress={removePhoto}
                  >
                    <Ionicons name="trash" size={20} color="#EF4444" />
                    <Text style={[styles.photoActionText, { color: '#EF4444' }]}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.photoPlaceholder, errors.photo && styles.photoPlaceholderError]}
                onPress={() => setShowPhotoOptions(true)}
              >
                <View style={styles.photoPlaceholderIcon}>
                  <Ionicons name="camera" size={40} color="#9CA3AF" />
                </View>
                <Text style={styles.photoPlaceholderText}>Ambil Foto Sampah</Text>
                <Text style={styles.photoPlaceholderSubtext}>Ketuk untuk mengambil foto</Text>
              </TouchableOpacity>
            )}
            {errors.photo && <Text style={styles.errorText}>{errors.photo}</Text>}
          </View>

          {/* Waste Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Jenis Sampah</Text>
            <Text style={styles.sectionSubtitle}>Pilih jenis sampah organik yang akan disetor</Text>
            
            <View style={styles.wasteTypesGrid}>
              {wasteTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.wasteTypeCard,
                    formData.waste_type === type.key && styles.wasteTypeCardActive,
                  ]}
                  onPress={() => updateField('waste_type', type.key)}
                >
                  <View style={[styles.wasteTypeIcon, { backgroundColor: type.bgColor }]}>
                    <Ionicons name={type.icon} size={28} color={type.color} />
                  </View>
                  <Text
                    style={[
                      styles.wasteTypeLabel,
                      formData.waste_type === type.key && styles.wasteTypeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                  {formData.waste_type === type.key && (
                    <View style={styles.checkIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {errors.waste_type && <Text style={styles.errorText}>{errors.waste_type}</Text>}
          </View>

          {/* Weight Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estimasi Berat</Text>
            <View style={styles.weightInputContainer}>
              <Input
                placeholder="Contoh: 5"
                value={formData.estimated_weight}
                onChangeText={(v) => updateField('estimated_weight', v)}
                keyboardType="decimal-pad"
                error={errors.estimated_weight}
                containerStyle={styles.weightInput}
              />
              <View style={styles.weightUnit}>
                <Text style={styles.weightUnitText}>kg</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deskripsi (Opsional)</Text>
            <Input
              placeholder="Deskripsi tambahan tentang sampah"
              value={formData.description}
              onChangeText={(v) => updateField('description', v)}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
          </View>

          {/* Pickup Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alamat Pengambilan</Text>
            <Input
              placeholder="Masukkan alamat lengkap"
              value={formData.pickup_address}
              onChangeText={(v) => updateField('pickup_address', v)}
              multiline
              numberOfLines={2}
              error={errors.pickup_address}
            />
          </View>

          {/* Location Info */}
          <Card style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Ionicons name="location" size={20} color="#22C55E" />
              <Text style={styles.locationTitle}>Lokasi Anda</Text>
            </View>
            <Text style={styles.locationCoords}>
              Koordinat: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
            </Text>
            <Text style={styles.locationNote}>
              Lokasi akan digunakan oleh pembudidaya untuk pengambilan sampah
            </Text>
          </Card>

          {/* Submit Button */}
          <Button
            title="Ajukan Setoran"
            onPress={handleSubmit}
            loading={loading}
            size="large"
            style={styles.submitButton}
          />
          
          {/* Extra space */}
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

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
            <Text style={styles.photoOptionsTitle}>Pilih Sumber Foto</Text>
            
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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text style={styles.modalTitle}>Berhasil!</Text>
            <Text style={styles.modalMessage}>
              Pengajuan setoran sampah berhasil dibuat. Tunggu konfirmasi dari pembudidaya.
            </Text>
            <Pressable
              style={styles.modalButtonSuccess}
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Gagal</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <Pressable
              style={styles.modalButtonError}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  // Photo styles
  photoPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderError: {
    borderColor: '#EF4444',
  },
  photoPlaceholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  photoPlaceholderSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  photoPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    gap: 8,
  },
  photoDeleteButton: {
    backgroundColor: '#FEF2F2',
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
  },
  // Photo Options Modal
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
  // No location styles
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noLocationIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noLocationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  noLocationText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  setLocationButton: {
    minWidth: 200,
  },
  // Waste type styles
  wasteTypesGrid: {
    gap: 12,
  },
  wasteTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  wasteTypeCardActive: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  wasteTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wasteTypeLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 16,
  },
  wasteTypeLabelActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  weightInput: {
    flex: 1,
    marginBottom: 0,
  },
  weightUnit: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginLeft: -12,
  },
  weightUnitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationCard: {
    marginBottom: 24,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  locationCoords: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationNote: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  submitButton: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  successIcon: {
    marginBottom: 16,
  },
  errorIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonSuccess: {
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  modalButtonError: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
