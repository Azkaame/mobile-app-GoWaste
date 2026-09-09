import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../src/contexts/AuthContext';
import Button from '../src/components/Button';
import Input from '../src/components/Input';

// Default location: Malang, Jawa Timur
const DEFAULT_LOCATION = {
  latitude: -7.9666,
  longitude: 112.6326,
};

export default function PilihLokasiScreen() {
  const router = useRouter();
  const { user, updateLocation } = useAuth();

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [manualAddress, setManualAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      setSelectedLocation({ latitude: user.latitude, longitude: user.longitude });
      if (user.address) {
        setAddress(user.address);
        setManualAddress(user.address);
      }
    }
  }, [user]);

  const handleGoBack = () => {
    router.back();
  };

  const getCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Izin lokasi ditolak. Silakan isi alamat secara manual.');
        setShowErrorModal(true);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setSelectedLocation(newLocation);
      await reverseGeocode(newLocation.latitude, newLocation.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMessage('Gagal mendapatkan lokasi. Silakan isi alamat secara manual.');
      setShowErrorModal(true);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=id`
      );
      const data = await response.json();
      
      if (data.display_name) {
        setAddress(data.display_name);
        setManualAddress(data.display_name);
      } else {
        const coords = `Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setAddress(coords);
        setManualAddress(coords);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      const coords = `Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setAddress(coords);
      setManualAddress(coords);
    } finally {
      setIsLoading(false);
    }
  };

  const searchAddress = async () => {
    if (!manualAddress.trim()) {
      setErrorMessage('Masukkan alamat terlebih dahulu');
      setShowErrorModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}&limit=1&accept-language=id`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        setSelectedLocation({
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
        });
        setAddress(result.display_name);
        setManualAddress(result.display_name);
      } else {
        setErrorMessage('Alamat tidak ditemukan. Coba gunakan alamat yang lebih spesifik.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error searching address:', error);
      setErrorMessage('Gagal mencari alamat. Silakan coba lagi.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedLocation && !manualAddress.trim()) {
      setErrorMessage('Silakan pilih lokasi atau masukkan alamat.');
      setShowErrorModal(true);
      return;
    }

    // If no coordinates but has address, use default Malang coordinates
    const finalLocation = selectedLocation || DEFAULT_LOCATION;
    const finalAddress = manualAddress.trim() || address || `Koordinat: ${finalLocation.latitude.toFixed(6)}, ${finalLocation.longitude.toFixed(6)}`;

    setIsSaving(true);
    try {
      await updateLocation({
        address: finalAddress,
        latitude: finalLocation.latitude,
        longitude: finalLocation.longitude,
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Gagal menyimpan lokasi. Silakan coba lagi.';
      setErrorMessage(msg);
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Atur Lokasi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Get Current Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gunakan Lokasi Saat Ini</Text>
          <Pressable 
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={isFetchingLocation}
          >
            <View style={styles.locationButtonIcon}>
              {isFetchingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="locate" size={24} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.locationButtonContent}>
              <Text style={styles.locationButtonTitle}>
                {isFetchingLocation ? 'Mengambil lokasi...' : 'Dapatkan Lokasi GPS'}
              </Text>
              <Text style={styles.locationButtonSubtitle}>
                Otomatis mendeteksi posisi Anda saat ini
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Or Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ATAU</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Manual Address Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Masukkan Alamat Manual</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Contoh: Jl. Veteran No. 10, Malang"
              value={manualAddress}
              onChangeText={setManualAddress}
              multiline
              numberOfLines={2}
            />
            <Pressable 
              style={styles.searchButton}
              onPress={searchAddress}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="search" size={20} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Klik tombol cari untuk mendapatkan koordinat dari alamat
          </Text>
        </View>

        {/* Current Location Info */}
        {(selectedLocation || address) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lokasi Terpilih</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location" size={20} color="#22C55E" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Alamat</Text>
                  <Text style={styles.infoValue} numberOfLines={3}>
                    {address || manualAddress || 'Alamat tidak tersedia'}
                  </Text>
                </View>
              </View>
              
              {selectedLocation && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="navigate" size={20} color="#22C55E" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Koordinat</Text>
                      <Text style={styles.coordsText}>
                        {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <Button
          title="Simpan Lokasi"
          onPress={handleSaveLocation}
          loading={isSaving}
          disabled={!selectedLocation && !manualAddress.trim()}
          size="large"
        />
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text style={styles.modalTitle}>Berhasil!</Text>
            <Text style={styles.modalMessage}>Lokasi berhasil disimpan</Text>
            <Pressable
              style={styles.modalButton}
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
            <View style={styles.modalIcon}>
              <Ionicons name="alert-circle" size={48} color="#F59E0B" />
            </View>
            <Text style={styles.modalTitle}>Perhatian</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <Pressable
              style={[styles.modalButton, styles.modalButtonWarning]}
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  locationButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButtonContent: {
    marginLeft: 16,
    flex: 1,
  },
  locationButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  locationButtonSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 15,
    color: '#1F2937',
    marginTop: 2,
    lineHeight: 22,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  coordsText: {
    fontSize: 14,
    color: '#1F2937',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonWarning: {
    backgroundColor: '#F59E0B',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
