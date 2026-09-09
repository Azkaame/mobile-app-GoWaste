import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WasteType } from '../types';

interface WasteTypeIconProps {
  type: WasteType;
  size?: 'small' | 'medium' | 'large';
}

const wasteConfig: Record<WasteType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }> = {
  sisa_makanan: {
    label: 'Sisa Makanan',
    icon: 'restaurant',
    color: '#EA580C',
    bgColor: '#FED7AA',
  },
  sayur_buah: {
    label: 'Sayur & Buah',
    icon: 'leaf',
    color: '#16A34A',
    bgColor: '#BBF7D0',
  },
  organik_lainnya: {
    label: 'Organik Lainnya',
    icon: 'trash',
    color: '#7C3AED',
    bgColor: '#DDD6FE',
  },
};

const sizes = {
  small: { container: 32, icon: 16 },
  medium: { container: 48, icon: 24 },
  large: { container: 64, icon: 32 },
};

export default function WasteTypeIcon({ type, size = 'medium' }: WasteTypeIconProps) {
  const config = wasteConfig[type] || wasteConfig.organik_lainnya;
  const sizeConfig = sizes[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: sizeConfig.container,
          height: sizeConfig.container,
          backgroundColor: config.bgColor,
        },
      ]}
    >
      <Ionicons name={config.icon} size={sizeConfig.icon} color={config.color} />
    </View>
  );
}

export function getWasteTypeLabel(type: WasteType): string {
  return wasteConfig[type]?.label || type;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
