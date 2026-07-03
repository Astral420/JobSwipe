import { Text, View } from 'react-native';
import type { Step } from './types';

type Props = {
  T: any;
  currentStep: number;
  totalSteps: number;
  progress: number;
  steps: Step[];
  stepKey: Step;
  stepLabels: Record<Step, string>;
};

export function RegisterStepProgressBar({ T, currentStep, totalSteps, progress, steps, stepKey, stepLabels }: Props) {
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 16 }}>
      {/* Step Counter Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{
            backgroundColor: '#8B5CF6',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
          }}>
            <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5 }}>
              STEP {currentStep + 1}/{totalSteps}
            </Text>
          </View>
          <View style={{
            backgroundColor: '#F3E8FF',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
          }}>
            <Text style={{ fontSize: 12, color: '#8B5CF6', fontWeight: '600' }}>
              {stepLabels[stepKey]}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' }}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
        <View style={{ 
          height: '100%', 
          borderRadius: 999, 
          backgroundColor: '#8B5CF6', 
          width: `${progress * 100}%`,
          shadowColor: '#8B5CF6',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
        }} />
      </View>
    </View>
  );
}
