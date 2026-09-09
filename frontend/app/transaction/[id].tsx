import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform,
  Modal,
  Pressable,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { transactionsAPI } from '../../src/services/api';
import { Transaction } from '../../src/types';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import StatusBadge from '../../src/components/StatusBadge';
import WasteTypeIcon, { getWasteTypeLabel } from '../../src/components/WasteTypeIcon';
import Input from '../../src/components/Input';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [breederNotes, setBreederNotes] = useState('');
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'diterima' | 'ditolak' | 'selesai' | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const isMasyarakat = user?.role === 'masyarakat';
  const isPembudidaya = user?.role === 'pembudidaya';

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    try {
      if (id) {
        const data = await transactionsAPI.getById(id);
        setTransaction(data);
        setBreederNotes(data.breeder_notes || '');
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const showConfirmation = (action: 'diterima' | 'ditolak' | 'selesai') => {
    if (Platform.OS === 'web') {
      setConfirmAction(action);
      setShowConfirmModal(true);
    } else {
      const statusLabels = {
        diterima: 'menerima',
        ditolak: 'menolak',
        selesai: 'menyelesaikan',
      };
      
      Alert.alert(
        'Konfirmasi',
        `Apakah Anda yakin ingin ${statusLabels[action]} pengajuan ini?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya', onPress: () => executeUpdateStatus(action) },
        ]
      );
    }
  };

  const executeUpdateStatus = async (status: 'diterima' | 'ditolak' | 'selesai') => {
    if (!transaction) return;
    
    setShowConfirmModal(false);
    setUpdating(true);
    
    try {
      const updated = await transactionsAPI.updateStatus(transaction.id, {
        status,
        breeder_notes: breederNotes,
      });
      setTransaction(updated);
      
      if (Platform.OS === 'web') {
        setShowSuccessModal(true);
      } else {
        Alert.alert('Berhasil', 'Status berhasil diperbarui');
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Terjadi kesalahan';
      if (Platform.OS === 'web') {
        setErrorMessage(msg);
        setShowErrorModal(true);
      } else {
        Alert.alert('Gagal', msg);
      }
    } finally {
      setUpdating(false);
    }
  };

  const openMaps = () => {
    if (!transaction) return;
    
    const { latitude, longitude } = transaction;
    const label = encodeURIComponent(transaction.pickup_address);
    
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    });
  };

  const callUser = () => {
    if (!transaction) return;
    Linking.openURL(`tel:${transaction.user_phone}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string | null) => {
    switch (action) {
      case 'diterima': return 'menerima';
      case 'ditolak': return 'menolak';
      case 'selesai': return 'menyelesaikan';
      default: return '';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.navHeader}>
          <Pressable style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </Pressable>
          <Text style={styles.navTitle}>Detail Transaksi</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
          <Text style={styles.errorText}>Transaksi tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canUpdateStatus = isPembudidaya && transaction.status === 'menunggu';
  const canComplete = isPembudidaya && transaction.status === 'diterima' && transaction.breeder_id === user?.id;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.navHeader}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.navTitle}>Detail Transaksi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <WasteTypeIcon type={transaction.waste_type} size="large" />
            <View style={styles.headerInfo}>
              <Text style={styles.wasteType}>
                {getWasteTypeLabel(transaction.waste_type)}
              </Text>
              <Text style={styles.weight}>{transaction.estimated_weight} kg</Text>
            </View>
            <StatusBadge status={transaction.status} />
          </View>
          
          {transaction.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Deskripsi:</Text>
              <Text style={styles.descriptionText}>{transaction.description}</Text>
            </View>
          )}
        </Card>

        {/* Photo Section */}
        {transaction.photo_url && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Foto Sampah</Text>
            <TouchableOpacity 
              style={styles.photoContainer}
              onPress={() => setShowPhotoModal(true)}
            >
              <Image 
                source={{ uri: `${API_URL}${transaction.photo_url}` }} 
                style={styles.photo}
              />
              <View style={styles.photoOverlay}>
                <Ionicons name="expand-outline" size={24} color="#FFFFFF" />
                <Text style={styles.photoOverlayText}>Ketuk untuk memperbesar</Text>
              </View>
            </TouchableOpacity>
          </Card>
        )}

        {/* User Info (for Pembudidaya) */}
        {isPembudidaya && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Informasi Penyetor</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person" size={20} color="#22C55E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nama</Text>
                <Text style={styles.infoValue}>{transaction.user_name}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="call" size={20} color="#22C55E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Telepon</Text>
                <Text style={styles.infoValue}>{transaction.user_phone}</Text>
              </View>
              <Button
                title="Hubungi"
                onPress={callUser}
                variant="outline"
                size="small"
              />
            </View>
          </Card>
        )}

        {/* Location */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lokasi Pengambilan</Text>
          <View style={styles.addressContainer}>
            <Ionicons name="location" size={20} color="#22C55E" />
            <Text style={styles.addressText}>{transaction.pickup_address}</Text>
          </View>
          <Text style={styles.coordsText}>
            Koordinat: {transaction.latitude.toFixed(4)}, {transaction.longitude.toFixed(4)}
          </Text>
          <Button
            title="Buka di Peta"
            onPress={openMaps}
            variant="outline"
            size="medium"
            style={styles.mapButton}
          />
        </Card>

        {/* Timeline */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Riwayat</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotActive]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Pengajuan Dibuat</Text>
                <Text style={styles.timelineDate}>{formatDate(transaction.created_at)}</Text>
              </View>
            </View>
            
            {transaction.status !== 'menunggu' && (
              <View style={styles.timelineItem}>
                <View style={[
                  styles.timelineDot,
                  transaction.status === 'ditolak' ? styles.timelineDotRejected : styles.timelineDotActive
                ]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>
                    {transaction.status === 'ditolak' ? 'Ditolak' : 'Diterima Pembudidaya'}
                  </Text>
                  <Text style={styles.timelineDate}>{formatDate(transaction.updated_at)}</Text>
                </View>
              </View>
            )}
            
            {transaction.status === 'selesai' && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Selesai</Text>
                  <Text style={styles.timelineDate}>{formatDate(transaction.updated_at)}</Text>
                </View>
              </View>
            )}
          </View>

          {transaction.breeder_notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Catatan Pembudidaya:</Text>
              <Text style={styles.notesText}>{transaction.breeder_notes}</Text>
            </View>
          )}
        </Card>

        {/* Actions for Pembudidaya */}
        {(canUpdateStatus || canComplete) && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tindakan</Text>
            
            <Input
              label="Catatan (Opsional)"
              placeholder="Tambahkan catatan..."
              value={breederNotes}
              onChangeText={setBreederNotes}
              multiline
              numberOfLines={2}
            />

            {canUpdateStatus && (
              <View style={styles.actionButtons}>
                <Button
                  title="Terima"
                  onPress={() => showConfirmation('diterima')}
                  loading={updating}
                  style={styles.acceptButton}
                />
                <Button
                  title="Tolak"
                  onPress={() => showConfirmation('ditolak')}
                  variant="danger"
                  loading={updating}
                  style={styles.rejectButton}
                />
              </View>
            )}

            {canComplete && (
              <Button
                title="Tandai Selesai"
                onPress={() => showConfirmation('selesai')}
                loading={updating}
                size="large"
              />
            )}
          </Card>
        )}
        
        {/* Extra padding at bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confirm Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons 
                name={confirmAction === 'ditolak' ? 'close-circle' : 'checkmark-circle'} 
                size={48} 
                color={confirmAction === 'ditolak' ? '#EF4444' : '#22C55E'} 
              />
            </View>
            <Text style={styles.modalTitle}>Konfirmasi</Text>
            <Text style={styles.modalMessage}>
              Apakah Anda yakin ingin {getActionLabel(confirmAction)} pengajuan ini?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, confirmAction === 'ditolak' ? styles.modalButtonDanger : styles.modalButtonConfirm]}
                onPress={() => confirmAction && executeUpdateStatus(confirmAction)}
              >
                <Text style={styles.modalButtonTextConfirm}>Ya</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text style={styles.modalTitle}>Berhasil!</Text>
            <Text style={styles.modalMessage}>Status berhasil diperbarui</Text>
            <Pressable
              style={[styles.modalButton, styles.modalButtonConfirm, { width: '100%' }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonTextConfirm}>OK</Text>
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
              <Ionicons name="close-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Gagal</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <Pressable
              style={[styles.modalButton, styles.modalButtonDanger, { width: '100%' }]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonTextConfirm}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Photo Full Screen Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <Pressable 
          style={styles.photoModalOverlay}
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.photoModalContainer}>
            <Pressable 
              style={styles.closePhotoButton}
              onPress={() => setShowPhotoModal(false)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
            {transaction?.photo_url && (
              <Image 
                source={{ uri: `${API_URL}${transaction.photo_url}` }} 
                style={styles.fullPhoto}
                resizeMode="contain"
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  navHeader: {
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
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
  },
  headerCard: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  wasteType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  weight: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  descriptionLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 15,
    color: '#4B5563',
  },
  sectionCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  coordsText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  mapButton: {
    marginTop: 16,
  },
  timeline: {
    marginLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: '#22C55E',
  },
  timelineDotRejected: {
    backgroundColor: '#EF4444',
  },
  timelineContent: {
    marginLeft: 12,
    flex: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  timelineDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  notesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
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
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonConfirm: {
    backgroundColor: '#22C55E',
  },
  modalButtonDanger: {
    backgroundColor: '#EF4444',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Photo styles
  photoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  photoOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePhotoButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullPhoto: {
    width: '100%',
    height: '80%',
  },
});
