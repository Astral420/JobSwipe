import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Conversation #{conversationId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 20, fontWeight: '500', color: '#1a1a1a' },
});
