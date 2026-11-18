import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  INITIAL_ABOUT,
  INITIAL_BRANCHES,
  INITIAL_CONTACT,
  INITIAL_FOUNDER,
  INITIAL_PACKAGES,
  INITIAL_TEACHERS,
} from '../lib/domain';
import {
  fetchPublicSiteBundle,
  PublicSiteBundle,
  subscribePublishedPackagesAndBranches,
} from '../lib/firestoreService';

interface SiteDataContextValue {
  data: PublicSiteBundle;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_BUNDLE: PublicSiteBundle = {
  packages: INITIAL_PACKAGES,
  branches: INITIAL_BRANCHES,
  teachers: INITIAL_TEACHERS,
  about: INITIAL_ABOUT,
  founder: INITIAL_FOUNDER,
  contact: INITIAL_CONTACT,
  gallery: [],
  announcements: [],
  schedules: [],
};

const SiteDataContext = createContext<SiteDataContextValue | null>(null);

export function SiteDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PublicSiteBundle>(DEFAULT_BUNDLE);
  const [loading, setLoading] = useState(true);
  const livePackagesDelivered = useRef(false);
  const liveBranchesDelivered = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const bundle = await fetchPublicSiteBundle();
      setData((prev) => ({
        ...bundle,
        packages: livePackagesDelivered.current ? prev.packages : bundle.packages,
        branches: liveBranchesDelivered.current ? prev.branches : bundle.branches,
      }));
    } catch {
      setData((prev) => ({
        ...DEFAULT_BUNDLE,
        packages: livePackagesDelivered.current ? prev.packages : DEFAULT_BUNDLE.packages,
        branches: liveBranchesDelivered.current ? prev.branches : DEFAULT_BUNDLE.branches,
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribePublishedPackagesAndBranches(
      (packages) => {
        livePackagesDelivered.current = true;
        setData((prev) => ({ ...prev, packages }));
        setLoading(false);
      },
      (branches) => {
        liveBranchesDelivered.current = true;
        setData((prev) => ({ ...prev, branches }));
      }
    );
    return () => {
      unsubscribe();
    };
  }, [refresh]);

  return (
    <SiteDataContext.Provider value={{ data, loading, refresh }}>
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData() {
  const ctx = useContext(SiteDataContext);
  if (!ctx) {
    throw new Error('useSiteData must be used inside SiteDataProvider');
  }
  return ctx;
}
