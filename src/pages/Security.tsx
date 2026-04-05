import { SecuritySettings } from '@/components/security/SecuritySettings';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEO } from "@/components/seo/PageSEO";

export default function SecurityPage() {
  return (
    <MainLayout>
      <PageSEO title="Segurança" description="Central de segurança e monitoramento." path="/seguranca" noIndex />
      <div className="mx-auto max-w-4xl">
        <SecuritySettings />
      </div>
    </MainLayout>
  );
}
