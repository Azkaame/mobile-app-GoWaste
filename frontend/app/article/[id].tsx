import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { articlesAPI } from '../../src/services/api';
import { Article } from '../../src/types';
import LoadingSpinner from '../../src/components/LoadingSpinner';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      if (id) {
        const data = await articlesAPI.getById(id);
        setArticle(data);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderContent = (content: string) => {
    // Simple markdown-like rendering
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Bold text with **
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <Text key={index} style={styles.boldText}>
            {line.replace(/\*\*/g, '')}
          </Text>
        );
      }
      // Bullet points
      if (line.startsWith('•') || line.startsWith('-')) {
        return (
          <View key={index} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{line.replace(/^[•-]\s*/, '')}</Text>
          </View>
        );
      }
      // Numbered list
      if (/^\d+\./.test(line)) {
        return (
          <Text key={index} style={styles.numberedText}>
            {line}
          </Text>
        );
      }
      // Empty line
      if (line.trim() === '') {
        return <View key={index} style={styles.spacer} />;
      }
      // Regular paragraph
      return (
        <Text key={index} style={styles.paragraph}>
          {line}
        </Text>
      );
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header with back button */}
        <View style={styles.navHeader}>
          <Pressable style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </Pressable>
          <Text style={styles.navTitle}>Artikel</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
          <Text style={styles.errorText}>Artikel tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.navHeader}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.navTitle}>Artikel</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.categoryBadge}>
            <Ionicons
              name={getCategoryIcon(article.category)}
              size={16}
              color="#22C55E"
            />
            <Text style={styles.categoryText}>
              {getCategoryLabel(article.category)}
            </Text>
          </View>
          <Text style={styles.title}>{article.title}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar" size={14} color="#9CA3AF" />
            <Text style={styles.dateText}>{formatDate(article.created_at)}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderContent(article.content)}
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
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22C55E',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    lineHeight: 32,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  content: {
    padding: 20,
  },
  paragraph: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 26,
  },
  boldText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  bullet: {
    fontSize: 16,
    color: '#22C55E',
    marginRight: 8,
    fontWeight: 'bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  numberedText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 26,
    marginVertical: 4,
  },
  spacer: {
    height: 12,
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
});
