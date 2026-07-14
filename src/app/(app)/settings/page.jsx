'use client';

import { useRouter } from 'next/navigation';
import SettingsView from '@/components/SettingsView';
import OnboardingForm from '@/components/OnboardingForm';
import { useApp } from '@/components/app/AppProvider';

export default function SettingsPage() {
  const app = useApp();
  const router = useRouter();
  return app.isRetakingAssessment ? (
    <OnboardingForm
      isEditing={true}
      onComplete={(data) => {
        app.handleOnboardingComplete(data);
        app.setIsRetakingAssessment(false);
        router.push('/today');
      }}
      onCancel={() => {
        app.setIsRetakingAssessment(false);
      }}
    />
  ) : (
    <SettingsView onRetakeAssessment={() => app.setIsRetakingAssessment(true)} />
  );
}
