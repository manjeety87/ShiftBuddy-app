import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../lib/theme-context';

export default function Index() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
