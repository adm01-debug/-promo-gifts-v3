import { useState } from 'react';
import type { SelectedCompanyInfo, SelectedContactInfo } from '@/components/quotes/CompanyContactSelector';

export function useQuoteClientState() {
  const [clientId, setClientId] = useState('');
  const [contactId, setContactId] = useState('');
  const [companyInfo, setCompanyInfo] = useState<SelectedCompanyInfo | null>(null);
  const [contactInfo, setContactInfo] = useState<SelectedContactInfo | null>(null);

  return {
    clientId,
    setClientId,
    contactId,
    setContactId,
    companyInfo,
    setCompanyInfo,
    contactInfo,
    setContactInfo,
  };
}
