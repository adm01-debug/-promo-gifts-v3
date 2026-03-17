import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  currentRole: OrgMember["role"] | null;
  isLoading: boolean;
  switchOrganization: (orgId: string) => void;
  createOrganization: (name: string, slug: string) => Promise<Organization | null>;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

const ORG_STORAGE_KEY = "selected_org_id";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentRole, setCurrentRole] = useState<OrgMember["role"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      setCurrentRole(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch orgs via members join
      const { data: members, error: membersError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id);

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setOrganizations([]);
        setCurrentOrg(null);
        setCurrentRole(null);
        setIsLoading(false);
        return;
      }

      const orgIds = members.map((m) => m.organization_id);

      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .in("id", orgIds)
        .eq("is_active", true);

      if (orgsError) throw orgsError;

      const orgList = (orgs || []) as Organization[];
      setOrganizations(orgList);

      // Restore saved org or pick first
      const savedOrgId = localStorage.getItem(ORG_STORAGE_KEY);
      const savedOrg = orgList.find((o) => o.id === savedOrgId);
      const selected = savedOrg || orgList[0] || null;

      setCurrentOrg(selected);

      if (selected) {
        const membership = members.find((m) => m.organization_id === selected.id);
        setCurrentRole((membership?.role as OrgMember["role"]) || null);
        localStorage.setItem(ORG_STORAGE_KEY, selected.id);
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const switchOrganization = useCallback(
    (orgId: string) => {
      const org = organizations.find((o) => o.id === orgId);
      if (org) {
        setCurrentOrg(org);
        localStorage.setItem(ORG_STORAGE_KEY, orgId);
        // Update role
        supabase
          .from("organization_members")
          .select("role")
          .eq("organization_id", orgId)
          .eq("user_id", user?.id ?? "")
          .single()
          .then(({ data }) => {
            setCurrentRole((data?.role as OrgMember["role"]) || null);
          });
      }
    },
    [organizations, user]
  );

  const createOrganization = useCallback(
    async (name: string, slug: string): Promise<Organization | null> => {
      if (!user) return null;

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name, slug })
        .select()
        .single();

      if (orgError) {
        console.error("Failed to create organization:", orgError);
        return null;
      }

      // Add creator as owner
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) {
        console.error("Failed to add owner:", memberError);
        return null;
      }

      await fetchOrganizations();
      switchOrganization(org.id);
      return org as Organization;
    },
    [user, fetchOrganizations, switchOrganization]
  );

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrg,
        currentRole,
        isLoading,
        switchOrganization,
        createOrganization,
        refetch: fetchOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return ctx;
}
