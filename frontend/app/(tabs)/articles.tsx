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
import { articlesAPI } from '../../src/services/api';
import { Article } from '../../src/types';
import Card from '../../src/components/Card';
import LoadingSpinner from '../../src/components/LoadingSpinner';

const categories = [
  { key: 'all', label: 'Semua', icon: 'grid' as const },
  { key: 'sampah_organik', label: 'Sampah Organik', icon: 'leaf' as const },
  { key: 'bank_sampah', label: 'Bank Sampah', icon: 'business' as const },
  { key: 'maggot_bsf', label: 'Maggot BSF', icon: 'bug' as const },
];

export default function ArticlesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchArticles = async () => {
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await articlesAPI.getAll(category);
      setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArticles();
  }, [selectedCategory]);

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'sampah_organik':
        return 'leaf';
      case 'bank_sampah':
        return 'business';
      case 'maggot_bsf':
        return 'bug';
      default:
        return 'document';
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'sampah_organik':
        return 'Sampah Organik';
      case 'bank_sampah':
        return 'Bank Sampah';
      case 'maggot_bsf':
        return 'Maggot BSF';
      default:
        return category;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Artikel Edukasi</Text>
        <Text style={styles.headerSubtitle}>
          Pelajari lebih lanjut tentang pengelolaan sampah
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryButton,
              selectedCategory === cat.key && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Ionicons
              name={cat.icon}
              size={18}
              color={selectedCategory === cat.key ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.key && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Articles List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.articlesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {articles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Belum ada artikel</Text>
          </View>
        ) : (
          articles.map((article) => (
            <Card
              key={article.id}
              style={styles.articleCard}
              onPress={() => router.push(`/article/${article.id}`)}
            >
              <View style={styles.articleHeader}>
                <View style={styles.articleIcon}>
                  <Ionicons
                    name={getCategoryIcon(article.category)}
                    size={28}
                    color="#22C55E"
                  />
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {getCategoryLabel(article.category)}
                  </Text>
                </View>
              </View>
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Text style={styles.articleExcerpt} numberOfLines={2}>
                {article.content.substring(0, 100)}...
              </Text>
              <View style={styles.articleFooter}>
                <Text style={styles.readMore}>Baca selengkapnya</Text>
                <Ionicons name="arrow-forward" size={16} color="#22C55E" />
              </View>
            </Card>
          ))
        )}
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
    padding: 20,
    paddingBottom: 0,
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
  categoryScroll: {
    maxHeight: 56,
    marginTop: 16,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  articlesContainer: {
    padding: 20,
    paddingTop: 16,
  },
  articleCard: {
    marginBottom: 16,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  articleIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  articleExcerpt: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  readMore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
