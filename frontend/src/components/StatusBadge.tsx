import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TransactionStatus } from '../types';

interface StatusBadgeProps {
  status: TransactionStatus;
}

const statusConfig: Record<TransactionStatus, { label: string; bgColor: string; textColor: string }> = {
  menunggu: {
    label: 'Menunggu',
    bgColor: '#FEF3C7',
    textColor: '#D97706',
  },
  diterima: {
    label: 'Diterima',
    bgColor: '#DBEAFE',
    textColor: '#2563EB',
  },
  ditolak: {
    label: 'Ditolak',
    bgColor: '#FEE2E2',
    textColor: '#DC2626',
  },
  selesai: {
    label: 'Selesai',
    bgColor: '#D1FAE5',
    textColor: '#059669',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.menunggu;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.text, { color: config.textColor }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
