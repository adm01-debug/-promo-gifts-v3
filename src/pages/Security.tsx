import { SecuritySettings } from '@/components/security/SecuritySettings';
import { MainLayout } from '@/components/layout/MainLayout';

export default function SecurityPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl">
        <SecuritySettings />
      </div>
    </MainLayout>
  );
}
