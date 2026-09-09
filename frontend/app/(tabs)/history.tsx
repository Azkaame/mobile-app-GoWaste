import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { transactionsAPI } from '../../src/services/api';
import { Transaction, TransactionStatus } from '../../src/types';
import Card from '../../src/components/Card';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import StatusBadge from '../../src/components/StatusBadge';
import WasteTypeIcon, { getWasteTypeLabel } from '../../src/components/WasteTypeIcon';

type TabType = 'aktif' | 'riwayat';

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('aktif');

  const isMasyarakat = user?.role === 'masyarakat';

  const fetchTransactions = async () => {
    try {
      let data: Transaction[];

      if (isMasyarakat) {
        // Masyarakat: get all their transactions
        data = await transactionsAPI.getMyTransactions();
      } else {
        // Pembudidaya: get pending + their handled transactions
        const [pending, handled] = await Promise.all([
          transactionsAPI.getPending(),
          transactionsAPI.getBreederTransactions(),
        ]);
        data = [...pending, ...handled];
      }
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === 'aktif') {
      // Aktif: menunggu, diterima (exclude selesai dan ditolak)
      return t.status === 'menunggu' || t.status === 'diterima';
    } else {
      // Riwayat: selesai, ditolak
      return t.status === 'selesai' || t.status === 'ditolak';
    }
  });

  // Count for badges
  const activeCount = transactions.filter(
    (t) => t.status === 'menunggu' || t.status === 'diterima'
  ).length;
  const historyCount = transactions.filter(
    (t) => t.status === 'selesai' || t.status === 'ditolak'
  ).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isMasyarakat ? 'Pengajuan Saya' : 'Daftar Pengajuan'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isMasyarakat
            ? 'Kelola pengajuan setoran sampah Anda'
            : 'Kelola pengajuan dari masyarakat'}
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'aktif' && styles.tabActive]}
          onPress={() => setActiveTab('aktif')}
        >
          <Text style={[styles.tabText, activeTab === 'aktif' && styles.tabTextActive]}>
            Aktif
          </Text>
          {activeCount > 0 && (
            <View style={[styles.tabBadge, activeTab === 'aktif' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'aktif' && styles.tabBadgeTextActive]}>
                {activeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'riwayat' && styles.tabActive]}
          onPress={() => setActiveTab('riwayat')}
        >
          <Text style={[styles.tabText, activeTab === 'riwayat' && styles.tabTextActive]}>
            Riwayat
          </Text>
          {historyCount > 0 && (
            <View style={[styles.tabBadge, activeTab === 'riwayat' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'riwayat' && styles.tabBadgeTextActive]}>
                {historyCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={activeTab === 'aktif' ? 'document-text-outline' : 'archive-outline'}
                size={48}
                color="#9CA3AF"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'aktif' ? 'Tidak Ada Pengajuan Aktif' : 'Belum Ada Riwayat'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'aktif'
                ? isMasyarakat
                  ? 'Ajukan setoran sampah baru untuk memulai'
                  : 'Belum ada pengajuan baru dari masyarakat'
                : 'Pengajuan yang selesai atau ditolak akan muncul di sini'}
            </Text>
            {activeTab === 'aktif' && isMasyarakat && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/transaction/create')}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Ajukan Setoran</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredTransactions.map((transaction) => (
            <Card
              key={transaction.id}
              style={styles.transactionCard}
              onPress={() => router.push(`/transaction/${transaction.id}`)}
            >
              <View style={styles.transactionHeader}>
                <WasteTypeIcon type={transaction.waste_type} size="medium" />
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {getWasteTypeLabel(transaction.waste_type)}
                  </Text>
                  {!isMasyarakat && (
                    <Text style={styles.transactionUser}>{transaction.user_name}</Text>
                  )}
                  <Text style={styles.transactionWeight}>
                    {transaction.estimated_weight} kg
                  </Text>
                </View>
                <StatusBadge status={transaction.status} />
              </View>

              <View style={styles.transactionDivider} />

              <View style={styles.transactionFooter}>
                <View style={styles.transactionMeta}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.transactionAddress} numberOfLines={1}>
                    {transaction.pickup_address}
                  </Text>
                </View>
                <View style={styles.transactionMeta}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.created_at)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
        
        {/* Extra padding at bottom */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#22C55E',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 20,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionCard: {
    marginBottom: 12,
    padding: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  transactionUser: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
    marginTop: 2,
  },
  transactionWeight: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  transactionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  transactionFooter: {
    gap: 6,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionAddress: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  transactionDate: {
    fontSize: 13,
    color: '#6B7280',
  },
});
