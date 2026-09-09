import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[`${size}Button`]];
    
    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.secondaryButton);
        break;
      case 'outline':
        baseStyle.push(styles.outlineButton);
        break;
      case 'danger':
        baseStyle.push(styles.dangerButton);
        break;
      default:
        baseStyle.push(styles.primaryButton);
    }
    
    if (disabled || loading) {
      baseStyle.push(styles.disabledButton);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText, styles[`${size}Text`]];
    
    switch (variant) {
      case 'outline':
        baseStyle.push(styles.outlineText);
        break;
      default:
        baseStyle.push(styles.lightText);
    }
    
    return baseStyle;
  };

  return (
    <Pressable
      style={({ pressed }) => [
        ...getButtonStyle(),
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#22C55E' : '#FFFFFF'} />
      ) : (
        <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  pressed: {
    opacity: 0.7,
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  largeButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  primaryButton: {
    backgroundColor: '#22C55E',
  },
  secondaryButton: {
    backgroundColor: '#6B7280',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: '600',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  lightText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#22C55E',
  },
});
