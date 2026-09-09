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
import { articlesAPI, statsAPI, transactionsAPI } from '../../src/services/api';
import { Article, Transaction, UserStats, BreederStats } from '../../src/types';
import Card from '../../src/components/Card';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import StatusBadge from '../../src/components/StatusBadge';
import WasteTypeIcon, { getWasteTypeLabel } from '../../src/components/WasteTypeIcon';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<UserStats | BreederStats | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);

  const isMasyarakat = user?.role === 'masyarakat';

  const fetchData = async () => {
    try {
      const [articlesData, statsData] = await Promise.all([
        articlesAPI.getAll(),
        statsAPI.getUserStats(),
      ]);
      setArticles(articlesData.slice(0, 3));
      setStats(statsData);

      if (!isMasyarakat) {
        const pending = await transactionsAPI.getPending();
        setPendingTransactions(pending.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  const userStats = stats as UserStats;
  const breederStats = stats as BreederStats;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Halo, {user?.name}!</Text>
            <Text style={styles.role}>
              {isMasyarakat ? 'Penyetor Sampah' : 'Pembudidaya BSF'}
            </Text>
          </View>
          <View style={styles.iconWrapper}>
            <Ionicons name="leaf" size={24} color="#FFFFFF" />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {isMasyarakat ? (
            <>
              <Card style={styles.statCard}>
                <Ionicons name="document-text" size={24} color="#22C55E" />
                <Text style={styles.statNumber}>{userStats?.total_transactions || 0}</Text>
                <Text style={styles.statLabel}>Total Setoran</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="hourglass" size={24} color="#F59E0B" />
                <Text style={styles.statNumber}>{userStats?.pending || 0}</Text>
                <Text style={styles.statLabel}>Menunggu</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="scale" size={24} color="#3B82F6" />
                <Text style={styles.statNumber}>{userStats?.total_weight_kg?.toFixed(1) || 0}</Text>
                <Text style={styles.statLabel}>Kg Tersetor</Text>
              </Card>
            </>
          ) : (
            <>
              <Card style={styles.statCard}>
                <Ionicons name="mail" size={24} color="#F59E0B" />
                <Text style={styles.statNumber}>{breederStats?.pending_requests || 0}</Text>
                <Text style={styles.statLabel}>Pengajuan</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <Text style={styles.statNumber}>{breederStats?.completed || 0}</Text>
                <Text style={styles.statLabel}>Selesai</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="scale" size={24} color="#3B82F6" />
                <Text style={styles.statNumber}>{breederStats?.total_weight_kg?.toFixed(1) || 0}</Text>
                <Text style={styles.statLabel}>Kg Diterima</Text>
              </Card>
            </>
          )}
        </View>

        {/* Quick Action */}
        {isMasyarakat && (
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/transaction/create')}
          >
            <View style={styles.quickActionContent}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionTitle}>Ajukan Setoran Sampah</Text>
                <Text style={styles.quickActionSubtitle}>
                  Setor sampah organik ke pembudidaya BSF
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#22C55E" />
          </TouchableOpacity>
        )}

        {/* Pending Requests for Breeder */}
        {!isMasyarakat && pendingTransactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pengajuan Baru</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={styles.seeAll}>Lihat Semua</Text>
              </TouchableOpacity>
            </View>
            {pendingTransactions.map((transaction) => (
              <Card
                key={transaction.id}
                style={styles.transactionCard}
                onPress={() => router.push(`/transaction/${transaction.id}`)}
              >
                <View style={styles.transactionHeader}>
                  <WasteTypeIcon type={transaction.waste_type} size="medium" />
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionName}>{transaction.user_name}</Text>
                    <Text style={styles.transactionType}>
                      {getWasteTypeLabel(transaction.waste_type)} - {transaction.estimated_weight} kg
                    </Text>
                  </View>
                  <StatusBadge status={transaction.status} />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Articles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Artikel Edukasi</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/articles')}>
              <Text style={styles.seeAll}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>
          {articles.map((article) => (
            <Card
              key={article.id}
              style={styles.articleCard}
              onPress={() => router.push(`/article/${article.id}`)}
            >
              <View style={styles.articleContent}>
                <View style={styles.articleIcon}>
                  <Ionicons
                    name={
                      article.category === 'sampah_organik'
                        ? 'leaf'
                        : article.category === 'bank_sampah'
                        ? 'business'
                        : 'bug'
                    }
                    size={24}
                    color="#22C55E"
                  />
                </View>
                <View style={styles.articleText}>
                  <Text style={styles.articleTitle} numberOfLines={2}>
                    {article.title}
                  </Text>
                  <Text style={styles.articleCategory}>
                    {article.category === 'sampah_organik'
                      ? 'Sampah Organik'
                      : article.category === 'bank_sampah'
                      ? 'Bank Sampah'
                      : 'Maggot BSF'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Card>
          ))}
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  role: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    marginLeft: 12,
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  transactionCard: {
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  transactionType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  articleCard: {
    marginBottom: 12,
  },
  articleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  articleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleText: {
    flex: 1,
    marginLeft: 12,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  articleCategory: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
