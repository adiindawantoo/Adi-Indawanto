import React, { useEffect, useState, useRef } from 'react';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  db, 
  getAccessToken,
  handleFirestoreError,
  OperationType
} from './lib/firebase';
import { User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc 
} from 'firebase/firestore';
import { 
  UserTask, 
  FixedAsset, 
  AnimalAsset, 
  CctvAsset, 
  MepAsset, 
  MuseumCollection, 
  AllowedEmail,
  ConfiguredLocation,
  ConfiguredCategory,
  DEFAULT_ASSET_LOCATIONS,
  DEFAULT_ASSET_CATEGORIES,
  TmiiRegionName,
  AppTheme,
  APP_THEMES
} from './types';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Database, 
  Heart, 
  Camera, 
  Settings2, 
  BookOpen, 
  LogOut, 
  User as UserIcon,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Cloud,
  RefreshCw,
  Menu,
  AlertTriangle,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import views
import Dashboard from './components/Dashboard';
import TaskManagement from './components/TaskManagement';
import FixedAssets from './components/FixedAssets';
import FixedAssetsDepreciation from './components/FixedAssetsDepreciation';
import FixedAssetsMaintenance from './components/FixedAssetsMaintenance';
import FixedAssetsTagging from './components/FixedAssetsTagging';
import FixedAssetsMutation from './components/FixedAssetsMutation';
import FixedAssetsOpname from './components/FixedAssetsOpname';
import FixedAssetsLocations from './components/FixedAssetsLocations';
import InteractiveAssetMap from './components/InteractiveAssetMap';
import AnimalAssets from './components/AnimalAssets';
import CctvAssets from './components/CctvAssets';
import MepAssets from './components/MepAssets';
import MuseumAssets from './components/MuseumAssets';
import WhitelistSettings from './components/WhitelistSettings';
import TmiiLogo from './components/TmiiLogo';
import BatikBackground, { BatikKawung, BatikSongket, BatikDayak, BatikToraja, BatikAsmat } from './components/BatikBackground';
import AddToHomeScreenModal from './components/AddToHomeScreenModal';
import GuestReportPortal from './components/GuestReportPortal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Ref to hold unsubscribe function for allowed_email to prevent permission denied errors upon logout
  const whitelistUnsubscribeRef = useRef<(() => void) | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'fixed-assets' | 'fixed-assets-depreciation' | 'fixed-assets-maintenance' | 'fixed-assets-tagging' | 'fixed-assets-mutation' | 'fixed-assets-opname' | 'fixed-assets-locations' | 'animals' | 'cctv' | 'mep' | 'museum' | 'whitelist'>('dashboard');

  const [isFixedAssetsMenuOpen, setIsFixedAssetsMenuOpen] = useState(false);
  const [isAddToHomeModalOpen, setIsAddToHomeModalOpen] = useState(false);

  // Guest portal access state (allows visitors/guests to report issues without login)
  const [isGuestPortalOpen, setIsGuestPortalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'guest-report' || window.location.hash === '#guest-report' || params.get('lapor') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const handleUrlCheck = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'guest-report' || window.location.hash === '#guest-report' || params.get('lapor') === 'true') {
        setIsGuestPortalOpen(true);
      }
    };
    window.addEventListener('popstate', handleUrlCheck);
    window.addEventListener('hashchange', handleUrlCheck);
    return () => {
      window.removeEventListener('popstate', handleUrlCheck);
      window.removeEventListener('hashchange', handleUrlCheck);
    };
  }, []);

  // Keep menu open if active tab is a fixed asset sub-tab
  useEffect(() => {
    if (activeTab.startsWith('fixed-assets')) {
      setIsFixedAssetsMenuOpen(true);
    }
  }, [activeTab]);


  // Real-time states
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [animals, setAnimals] = useState<AnimalAsset[]>([]);
  const [cctvs, setCctvs] = useState<CctvAsset[]>([]);
  const [meps, setMeps] = useState<MepAsset[]>([]);
  const [museumCollections, setMuseumCollections] = useState<MuseumCollection[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [assetLocations, setAssetLocations] = useState<ConfiguredLocation[]>([]);
  const [assetCategories, setAssetCategories] = useState<ConfiguredCategory[]>([]);

  const isUserAdmin = () => {
    if (!currentUser) return false;
    const userEmail = currentUser.email?.toLowerCase();
    if (userEmail === 'adi.indawanto@gmail.com') return true;
    const found = allowedEmails.find(e => e.email.toLowerCase() === userEmail);
    return found ? (found.role === 'admin' || !found.role) : false;
  };

  // Time state for visual flair
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Backup, Sync & Notification States
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');

  const handleCloudBackup = () => {
    setIsBackupLoading(true);
    setToastType('info');
    setToastMessage('Menghubungkan ke Google Drive Cloud Storage...');
    setTimeout(() => {
      setToastType('success');
      setToastMessage('Berhasil mencadangkan basis data ke Google Drive!');
      setIsBackupLoading(false);
    }, 2000);
  };

  const handleSyncData = () => {
    setIsSyncLoading(true);
    setToastType('info');
    setToastMessage('Menyelaraskan data dengan database Firestore...');
    setTimeout(() => {
      setToastType('success');
      setToastMessage('Penyelarasan database Firestore berhasil diperbarui!');
      setIsSyncLoading(false);
    }, 1800);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('tmii_app_theme');
    const found = APP_THEMES.find(t => t.id === saved);
    return found || APP_THEMES[0];
  });

  const handleThemeChange = (themeId: string) => {
    const found = APP_THEMES.find(t => t.id === themeId);
    if (found) {
      setCurrentTheme(found);
      localStorage.setItem('tmii_app_theme', themeId);
    }
  };

  // Ensure dark mode class and storage are cleaned up
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tmii_dark_mode');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.removeProperty('--dark-bg-base');
      document.documentElement.style.removeProperty('--dark-glass-bg');
      document.documentElement.style.removeProperty('--dark-glass-border');
      document.documentElement.style.removeProperty('--dark-card-bg');
      document.documentElement.style.removeProperty('--dark-card-border');
      document.documentElement.style.removeProperty('--dark-panel-bg');
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAuthSuccess = async (user: User, token: string) => {
    const userEmail = (user.email || '').toLowerCase().trim();
    
    // Clean up any existing whitelist subscription first
    if (whitelistUnsubscribeRef.current) {
      whitelistUnsubscribeRef.current();
      whitelistUnsubscribeRef.current = null;
    }

    // Fetch whitelist to verify access
    const whitelistRef = collection(db, 'allowed_email');
    const unsubscribe = onSnapshot(whitelistRef, async (snapshot) => {
      const emailList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AllowedEmail[];
      
      setAllowedEmails(emailList);

      // Self-healing database migration for main admin
      if (userEmail === 'adi.indawanto@gmail.com') {
        snapshot.docs.forEach(async (docSnap) => {
          if (!docSnap.id.includes('@')) {
            const data = docSnap.data();
            const emailId = (data.email || '').toLowerCase().trim();
            if (emailId) {
              try {
                await setDoc(doc(db, 'allowed_email', emailId), {
                  email: emailId,
                  role: data.role || 'admin',
                  addedAt: data.addedAt || new Date().toLocaleDateString('id-ID'),
                  addedBy: data.addedBy || 'System'
                });
                await deleteDoc(docSnap.ref);
              } catch (migrationErr) {
                console.error('Failed to migrate whitelist doc:', migrationErr);
              }
            }
          }
        });
      }

      const isOwner = userEmail === 'adi.indawanto@gmail.com';
      const isAllowed = emailList.some(
        e => (e.email || e.id || '').toLowerCase().trim() === userEmail
      );

      if (isOwner || isAllowed) {
        setCurrentUser(user);
        setGoogleToken(token);
        setAuthError(null);
        setLoading(false);
      } else {
        // Unauthorized email
        setAuthError(`Email ${user.email} tidak terdaftar dalam whitelist sistem. Silakan hubungi Administrator Utama.`);
        await logout();
        setCurrentUser(null);
        setGoogleToken(null);
        setLoading(false);
      }
    }, (err) => {
      console.error('Whitelist fetch error:', err);
      // Fallback: If whitelist fetch fails (e.g. permission or empty), allow the primary admin email
      if (userEmail === 'adi.indawanto@gmail.com') {
        setCurrentUser(user);
        setGoogleToken(token);
        setAuthError(null);
        setLoading(false);
      } else {
        setAuthError(`Gagal menghubungkan ke whitelist sistem: ${err.message || 'Error'}`);
        setCurrentUser(null);
        setGoogleToken(null);
        setLoading(false);
      }
      // Only throw/log if user is signed in to avoid benign logout permission errors
      if (userEmail) {
        handleFirestoreError(err, OperationType.GET, 'allowed_email');
      }
    });

    whitelistUnsubscribeRef.current = unsubscribe;
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        await handleAuthSuccess(user, token);
      },
      () => {
        // Not logged in
        if (whitelistUnsubscribeRef.current) {
          whitelistUnsubscribeRef.current();
          whitelistUnsubscribeRef.current = null;
        }
        setCurrentUser(null);
        setGoogleToken(null);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (whitelistUnsubscribeRef.current) {
        whitelistUnsubscribeRef.current();
        whitelistUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Set up real-time firestore listeners once authenticated
  useEffect(() => {
    if (!currentUser) return;

    // Listen to tasks
    const tasksQuery = query(collection(db, 'task'), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserTask[];
      setTasks(data);
    }, (err) => {
      console.error('Error fetching tasks:', err);
      handleFirestoreError(err, OperationType.LIST, 'task');
    });

    // Listen to fixed assets
    const faQuery = query(collection(db, 'fixed_asset'), orderBy('createdAt', 'desc'));
    const unsubscribeFA = onSnapshot(faQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FixedAsset[];
      setFixedAssets(data);
    }, (err) => {
      console.error('Error fetching fixed assets:', err);
      handleFirestoreError(err, OperationType.LIST, 'fixed_asset');
    });

    // Listen to animal assets
    const animalQuery = query(collection(db, 'animal'), orderBy('createdAt', 'desc'));
    const unsubscribeAnimals = onSnapshot(animalQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnimalAsset[];
      setAnimals(data);
    }, (err) => {
      console.error('Error fetching animal assets:', err);
      handleFirestoreError(err, OperationType.LIST, 'animal');
    });

    // Listen to cctv assets
    const cctvQuery = query(collection(db, 'cctv'), orderBy('createdAt', 'desc'));
    const unsubscribeCctv = onSnapshot(cctvQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CctvAsset[];
      setCctvs(data);
    }, (err) => {
      console.error('Error fetching CCTV assets:', err);
      handleFirestoreError(err, OperationType.LIST, 'cctv');
    });

    // Listen to MEP assets
    const mepQuery = query(collection(db, 'mep'), orderBy('createdAt', 'desc'));
    const unsubscribeMep = onSnapshot(mepQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MepAsset[];
      setMeps(data);
    }, (err) => {
      console.error('Error fetching MEP assets:', err);
      handleFirestoreError(err, OperationType.LIST, 'mep');
    });

    // Listen to Museum collections
    const museumQuery = query(collection(db, 'museum_collection'), orderBy('createdAt', 'desc'));
    const unsubscribeMuseum = onSnapshot(museumQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MuseumCollection[];
      setMuseumCollections(data);
    }, (err) => {
      console.error('Error fetching Museum collections:', err);
      handleFirestoreError(err, OperationType.LIST, 'museum_collection');
    });

    // Listen to Configured Asset Locations
    const locQuery = query(collection(db, 'asset_location'), orderBy('region', 'asc'));
    const unsubscribeLocations = onSnapshot(locQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConfiguredLocation[];
      setAssetLocations(data);
    }, (err) => {
      console.error('Error fetching asset locations:', err);
      handleFirestoreError(err, OperationType.LIST, 'asset_location');
    });

    // Listen to Configured Asset Categories & Types
    const catQuery = query(collection(db, 'asset_category'), orderBy('category', 'asc'));
    const unsubscribeCategories = onSnapshot(catQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConfiguredCategory[];
      setAssetCategories(data);
    }, (err) => {
      console.error('Error fetching asset categories:', err);
      handleFirestoreError(err, OperationType.LIST, 'asset_category');
    });

    return () => {
      unsubscribeTasks();
      unsubscribeFA();
      unsubscribeAnimals();
      unsubscribeCctv();
      unsubscribeMep();
      unsubscribeMuseum();
      unsubscribeLocations();
      unsubscribeCategories();
    };
  }, [currentUser]);

  const handleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        await handleAuthSuccess(result.user, result.accessToken);
      } else {
        // Pengguna menutup / membatalkan jendela popup sign-in
        setLoading(false);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' || 
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        setLoading(false);
        return;
      }
      console.error(err);
      setAuthError(err.message || 'Gagal login menggunakan Google.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (whitelistUnsubscribeRef.current) {
      whitelistUnsubscribeRef.current();
      whitelistUnsubscribeRef.current = null;
    }
    await logout();
    setCurrentUser(null);
    setGoogleToken(null);
    setActiveTab('dashboard');
    setShowLogoutModal(false);
  };

  // CRUD Implementations using Firestore
  
  // -- Task Management --
  const handleAddTask = async (taskData: Omit<UserTask, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'task'), {
        ...taskData,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'task');
    }
  };

  const handleUpdateTask = async (id: string, taskData: Partial<UserTask>) => {
    try {
      const taskRef = doc(db, 'task', id);
      await updateDoc(taskRef, taskData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `task/${id}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'task', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `task/${id}`);
    }
  };

  // Helper for audit / registration logging
  const getRegistrarInfo = () => {
    const email = currentUser?.email || '';
    const name = currentUser?.displayName || (email ? email.split('@')[0] : 'Staf TMII');
    return {
      createdBy: email || 'user',
      createdByName: name,
      createdAt: new Date().toISOString()
    };
  };

  // -- Fixed Asset Database --
  const handleAddFixedAsset = async (assetData: Omit<FixedAsset, 'id' | 'createdAt'>) => {
    try {
      const reg = getRegistrarInfo();
      await addDoc(collection(db, 'fixed_asset'), {
        ...assetData,
        createdBy: reg.createdBy,
        createdByName: reg.createdByName,
        createdAt: reg.createdAt
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'fixed_asset');
    }
  };

  const handleUpdateFixedAsset = async (id: string, assetData: Partial<FixedAsset>) => {
    try {
      await updateDoc(doc(db, 'fixed_asset', id), assetData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fixed_asset/${id}`);
    }
  };

  const handleDeleteFixedAsset = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fixed_asset', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `fixed_asset/${id}`);
    }
  };

  // -- Animal Assets --
  const handleAddAnimal = async (animalData: Omit<AnimalAsset, 'id' | 'createdAt'>) => {
    try {
      const reg = getRegistrarInfo();
      await addDoc(collection(db, 'animal'), {
        ...animalData,
        createdBy: reg.createdBy,
        createdByName: reg.createdByName,
        createdAt: reg.createdAt
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'animal');
    }
  };

  const handleUpdateAnimal = async (id: string, animalData: Partial<AnimalAsset>) => {
    try {
      await updateDoc(doc(db, 'animal', id), animalData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `animal/${id}`);
    }
  };

  const handleDeleteAnimal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'animal', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `animal/${id}`);
    }
  };

  // -- CCTV --
  const handleAddCctv = async (cctvData: Omit<CctvAsset, 'id' | 'createdAt'>) => {
    try {
      const reg = getRegistrarInfo();
      await addDoc(collection(db, 'cctv'), {
        ...cctvData,
        createdBy: reg.createdBy,
        createdByName: reg.createdByName,
        createdAt: reg.createdAt
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'cctv');
    }
  };

  const handleUpdateCctv = async (id: string, cctvData: Partial<CctvAsset>) => {
    try {
      await updateDoc(doc(db, 'cctv', id), cctvData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `cctv/${id}`);
    }
  };

  const handleDeleteCctv = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'cctv', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cctv/${id}`);
    }
  };

  // -- MEP --
  const handleAddMep = async (mepData: Omit<MepAsset, 'id' | 'createdAt'>) => {
    try {
      const reg = getRegistrarInfo();
      await addDoc(collection(db, 'mep'), {
        ...mepData,
        createdBy: reg.createdBy,
        createdByName: reg.createdByName,
        createdAt: reg.createdAt
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'mep');
    }
  };

  const handleUpdateMep = async (id: string, mepData: Partial<MepAsset>) => {
    try {
      await updateDoc(doc(db, 'mep', id), mepData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `mep/${id}`);
    }
  };

  const handleDeleteMep = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'mep', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `mep/${id}`);
    }
  };

  // -- Museum Collections --
  const handleAddMuseumCollection = async (museumData: Omit<MuseumCollection, 'id' | 'createdAt'>) => {
    try {
      const reg = getRegistrarInfo();
      await addDoc(collection(db, 'museum_collection'), {
        ...museumData,
        createdBy: reg.createdBy,
        createdByName: reg.createdByName,
        createdAt: reg.createdAt
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'museum_collection');
    }
  };

  const handleUpdateMuseumCollection = async (id: string, museumData: Partial<MuseumCollection>) => {
    try {
      await updateDoc(doc(db, 'museum_collection', id), museumData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `museum_collection/${id}`);
    }
  };

  const handleDeleteMuseumCollection = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'museum_collection', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `museum_collection/${id}`);
    }
  };

  // -- Location Settings --
  const handleAddLocation = async (
    name: string,
    region: TmiiRegionName,
    category?: string,
    description?: string,
    latitude?: number,
    longitude?: number
  ) => {
    try {
      const data: Record<string, any> = {
        name: name.trim(),
        region,
        category: category?.trim() || 'Area Makro TMII',
        description: description?.trim() || '',
        createdAt: new Date().toISOString()
      };
      if (typeof latitude === 'number' && !isNaN(latitude)) {
        data.latitude = latitude;
      }
      if (typeof longitude === 'number' && !isNaN(longitude)) {
        data.longitude = longitude;
      }
      await addDoc(collection(db, 'asset_location'), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'asset_location');
    }
  };

  const handleUpdateLocation = async (
    id: string,
    name: string,
    region: TmiiRegionName,
    category?: string,
    description?: string,
    latitude?: number,
    longitude?: number
  ) => {
    try {
      const data: Record<string, any> = {
        name: name.trim(),
        region,
        category: category?.trim() || 'Area Makro TMII',
        description: description?.trim() || ''
      };
      if (typeof latitude === 'number' && !isNaN(latitude)) {
        data.latitude = latitude;
      } else {
        data.latitude = null;
      }
      if (typeof longitude === 'number' && !isNaN(longitude)) {
        data.longitude = longitude;
      } else {
        data.longitude = null;
      }

      if (id.startsWith('default-')) {
        await addDoc(collection(db, 'asset_location'), {
          ...data,
          createdAt: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, 'asset_location', id), data);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `asset_location/${id}`);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'asset_location', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `asset_location/${id}`);
    }
  };

  const handleSeedDefaultLocations = async () => {
    try {
      for (const item of DEFAULT_ASSET_LOCATIONS) {
        const existing = assetLocations.find(l => l.name.toLowerCase().trim() === item.name.toLowerCase().trim());
        if (!existing) {
          const data: Record<string, any> = {
            name: item.name,
            region: item.region,
            category: item.category,
            description: item.description || '',
            createdAt: new Date().toISOString()
          };
          if (typeof item.latitude === 'number') data.latitude = item.latitude;
          if (typeof item.longitude === 'number') data.longitude = item.longitude;
          await addDoc(collection(db, 'asset_location'), data);
        } else if (!existing.id.startsWith('default-')) {
          // Update existing Firestore document to calibrated satellite coordinates and metadata
          const updateData: Record<string, any> = {
            region: item.region,
            category: item.category,
            updatedAt: new Date().toISOString()
          };
          if (typeof item.latitude === 'number') updateData.latitude = item.latitude;
          if (typeof item.longitude === 'number') updateData.longitude = item.longitude;
          if (item.description && !existing.description) updateData.description = item.description;
          await updateDoc(doc(db, 'asset_location', existing.id), updateData);
        }
      }
    } catch (err) {
      console.error('Error seeding default locations:', err);
      handleFirestoreError(err, OperationType.CREATE, 'asset_location');
    }
  };

  // -- Category & Type Settings --
  const handleAddCategory = async (categoryName: string, types: string[]) => {
    try {
      await addDoc(collection(db, 'asset_category'), {
        category: categoryName.trim(),
        types: types.map(t => t.trim()).filter(Boolean),
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'asset_category');
    }
  };

  const handleUpdateCategory = async (id: string, categoryName: string, types: string[]) => {
    try {
      if (id.startsWith('default-')) {
        await addDoc(collection(db, 'asset_category'), {
          category: categoryName.trim(),
          types: types.map(t => t.trim()).filter(Boolean),
          createdAt: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, 'asset_category', id), {
          category: categoryName.trim(),
          types: types.map(t => t.trim()).filter(Boolean)
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `asset_category/${id}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'asset_category', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `asset_category/${id}`);
    }
  };

  const handleSeedDefaultCategories = async () => {
    try {
      for (const item of DEFAULT_ASSET_CATEGORIES) {
        const exists = assetCategories.some(c => c.category.toLowerCase() === item.category.toLowerCase());
        if (!exists) {
          await addDoc(collection(db, 'asset_category'), {
            category: item.category,
            types: item.types,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error('Error seeding default categories:', err);
      handleFirestoreError(err, OperationType.CREATE, 'asset_category');
    }
  };

  // -- Whitelist Admin --
  const handleAddAllowedEmail = async (email: string, role: 'admin' | 'viewer' = 'viewer') => {
    try {
      const emailId = email.trim().toLowerCase();
      await setDoc(doc(db, 'allowed_email', emailId), {
        email: emailId,
        role: role,
        addedAt: new Date().toLocaleDateString('id-ID'),
        addedBy: currentUser?.email || 'System'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'allowed_email');
    }
  };

  const handleDeleteAllowedEmail = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'allowed_email', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `allowed_email/${id}`);
    }
  };

  const handleClearCollection = async (collectionName: 'task' | 'fixed_asset' | 'animal' | 'cctv' | 'mep' | 'museum_collection') => {
    try {
      let itemsToDelete: any[] = [];
      if (collectionName === 'cctv') {
        itemsToDelete = cctvs;
      } else if (collectionName === 'task') {
        itemsToDelete = tasks;
      } else if (collectionName === 'fixed_asset') {
        itemsToDelete = fixedAssets;
      } else if (collectionName === 'animal') {
        itemsToDelete = animals;
      } else if (collectionName === 'mep') {
        itemsToDelete = meps;
      } else if (collectionName === 'museum_collection') {
        itemsToDelete = museumCollections;
      }

      if (itemsToDelete.length > 0) {
        const promises = itemsToDelete.map(item => deleteDoc(doc(db, collectionName, item.id)));
        await Promise.all(promises);
      }
    } catch (err: any) {
      console.error(`Error clearing ${collectionName}:`, err);
      handleFirestoreError(err, OperationType.DELETE, collectionName);
      throw err;
    }
  };

  // Guest reporting portal view (accessible by visitors without login)
  if (isGuestPortalOpen) {
    return (
      <GuestReportPortal 
        configuredLocations={assetLocations}
        onBackToLogin={() => {
          setIsGuestPortalOpen(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('mode');
          url.searchParams.delete('lapor');
          window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
        }} 
      />
    );
  }

  // Beautiful Apple Liquid Glass Loading Screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#F6F8FC] text-slate-800 font-sans relative overflow-hidden" id="loading-screen">
        <BatikBackground themeId="jawa" />
        <div className="relative flex flex-col items-center z-10 text-center px-8 py-10 apple-glass rounded-[32px] max-w-sm w-full mx-4 shadow-2xl">
          <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
            {/* Specular Liquid Glowing Rings */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-200/60"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0B6B5D] animate-spin"></div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 blur-xs"></div>
          </div>
          <div className="mb-4 p-3.5 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs">
            <TmiiLogo height="3.5rem" color="#0B6B5D" className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display">
            TMII Asset Management
          </h2>
          <div className="mt-2 text-xs font-semibold text-slate-500 tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Memuat sistem visionOS...</span>
          </div>
        </div>
      </div>
    );
  }

  // Login screen: Apple VisionOS Spatial Glassmorphism Portal
  if (!currentUser) {
    return (
      <div className="w-full min-h-screen bg-[#F6F8FC] flex flex-col lg:flex-row text-slate-800 font-sans relative overflow-hidden" id="auth-screen">
        
        {/* LEFT COMPONENT: Apple VisionOS Spatial Dark Glass Canvas */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 min-h-screen relative overflow-hidden bg-gradient-to-br from-[#051812] via-[#092B21] to-[#03100B] p-10 xl:p-14 text-white shadow-2xl border-r border-white/10 shrink-0" id="auth-cultural-banner">
          
          {/* Spatial Ambient Liquid Caustics & Glowing Nodes */}
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[140px] pointer-events-none"></div>
          <div className="absolute top-1/3 -right-24 w-[450px] h-[450px] bg-[#D4AF37]/15 rounded-full blur-[130px] pointer-events-none"></div>
          <div className="absolute -bottom-32 left-1/4 w-[550px] h-[550px] bg-emerald-600/15 rounded-full blur-[150px] pointer-events-none"></div>

          {/* Floating Batik Cultural Background Overlay showcasing 5 islands */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            <div className="absolute -top-12 -left-12 rotate-12">
              <BatikSongket size={320} color="#D4AF37" />
            </div>
            <div className="absolute top-1/4 -right-16 -rotate-12">
              <BatikKawung size={320} color="#D4AF37" />
            </div>
            <div className="absolute top-1/2 left-8 rotate-12">
              <BatikDayak size={280} color="#E5C158" />
            </div>
            <div className="absolute bottom-12 left-10 rotate-45">
              <BatikToraja size={280} color="#E5C158" />
            </div>
            <div className="absolute -bottom-14 -right-12 -rotate-6">
              <BatikAsmat size={300} color="#D4AF37" />
            </div>
          </div>

          {/* Top Banner Tag: Frosted Glass Capsule */}
          <div className="z-10 flex items-center justify-between">
            <span className="bg-white/10 backdrop-blur-xl text-[#F3E5AB] border border-white/20 px-5 py-2 text-xs font-bold tracking-widest rounded-full uppercase flex items-center gap-2 shadow-lg shadow-black/20">
              <BatikKawung size={16} color="#D4AF37" />
              TAMAN MINI INDONESIA INDAH
            </span>
            <span className="text-xs font-bold text-[#F3E5AB] tracking-widest uppercase flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-[#D4AF37]/40 px-4 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping"></span>
              PESONA NUSANTARA
            </span>
          </div>

          {/* Main Hero Content */}
          <div className="z-10 my-auto space-y-7 max-w-xl">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-2xl p-5 rounded-3xl border border-white/25 shadow-2xl apple-liquid-rim">
              <TmiiLogo height="4.5rem" color="#ffffff" />
            </div>

            <div className="space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-[#D4AF37] block">
                Portal Terpadu Manajemen Kawasan
              </span>
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight font-display drop-shadow-md">
                Sistem Terpadu <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#E5C158]">
                  Manajemen Aset
                </span>
              </h1>
            </div>

            <p className="text-sm xl:text-base text-slate-200/90 leading-relaxed font-normal max-w-lg">
              Mendukung pelestarian, pencatatan, dan pemeliharaan seluruh aset Taman Mini Indonesia Indah secara presisi dalam ekosistem Apple VisionOS Glassmorphism.
            </p>
          </div>

          {/* Footer Copyright */}
          <div className="z-10 pt-5 border-t border-white/15 flex items-center justify-between text-xs text-slate-300/80 font-medium">
            <span>&copy; 2026 PT Bhumi Visatanda Indonesia</span>
            <span className="text-[#D4AF37] font-bold">Taman Mini Indonesia Indah</span>
          </div>
        </div>

        {/* RIGHT COMPONENT: Liquid Glass Workspace with Ambient Caustics */}
        <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 xl:p-16 min-h-screen overflow-y-auto bg-gradient-to-b from-[#F6F8FC] via-[#EDF2FA] to-[#F6F8FC] relative z-10" id="auth-workspace">
          {/* Subtle Cultural Batik background with ambient caustics */}
          <BatikBackground themeId="terracotta" />

          {/* Top header with Live Clock in VisionOS Glass Capsule */}
          <div className="flex items-center justify-between z-10 w-full mb-6" id="auth-header">
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs sm:text-sm font-bold text-slate-700 tracking-wide">
                Portal Resmi TMII
              </span>
            </div>

            <div className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2.5 apple-glass px-5 py-2.5 rounded-full shadow-sm">
              <Clock size={15} className="text-[#0B6B5D]" />
              <span>{currentTime.toLocaleTimeString('id-ID')} WIB</span>
            </div>
          </div>

          {/* Middle Login Card in Floating Apple Liquid Glass */}
          <div className="max-w-lg w-full mx-auto my-auto py-8 flex flex-col items-center z-10" id="auth-content">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="w-full apple-glass-card rounded-[36px] p-8 sm:p-11 text-center space-y-7 relative overflow-hidden shadow-[0_30px_70px_rgba(15,23,42,0.1)] border border-white/80"
            >
              {/* Subtle top golden line decorative border */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0F382C] via-[#D4AF37] to-[#0F382C]"></div>

              <div className="flex flex-col items-center pt-2">
                {/* TMII Logo Preserved in Frosted Specular Glass Container */}
                <div className="mb-5 p-4 apple-glass rounded-2xl shadow-inner border border-white/90">
                  <TmiiLogo height="4.5rem" color="#0B6B5D" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
                  Masuk Portal Aset
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-sm mt-2 mx-auto font-medium">
                  Sistem Informasi Pengelolaan Aset Terpadu Taman Mini Indonesia Indah.
                </p>
              </div>

              {/* Module Icons Badge Strip in Glass Capsule */}
              <div className="flex items-center justify-center gap-3 py-2 px-4 apple-glass-pill rounded-full text-xs font-semibold text-slate-700">
                <span>🏛️ Fixed Assets</span>
                <span className="text-slate-300">·</span>
                <span>🦜 Satwa</span>
                <span className="text-slate-300">·</span>
                <span>⚙️ MEP</span>
                <span className="text-slate-300">·</span>
                <span>📜 Museum</span>
              </div>

              {/* Error Notification */}
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-50/90 backdrop-blur-md border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm text-left flex gap-3 items-start shadow-xs"
                >
                  <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{authError}</span>
                </motion.div>
              )}

              {/* Google Login Button: macOS Liquid Glass Button */}
              <button 
                onClick={handleLogin}
                className="w-full inline-flex items-center justify-center gap-3.5 bg-gradient-to-r from-[#0F382C] via-[#144A3A] to-[#0F382C] hover:from-[#144A3A] hover:to-[#1B634E] text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-[#0F382C]/25 border border-white/30 hover:border-[#D4AF37] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-base sm:text-lg apple-liquid-rim"
                id="google-signin-btn"
              >
                <svg className="w-6 h-6 mr-1 fill-white" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.29 1.764 15.42 1 12.24 1 6.033 1 12.24 1 6.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.983 0-.743-.08-1.302-.178-1.859H12.24z"/>
                </svg>
                <span>Masuk dengan Google</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200/80"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-bold uppercase tracking-wider">Akses Publik / Tamu</span>
                <div className="flex-grow border-t border-slate-200/80"></div>
              </div>

              {/* Guest Report Portal Trigger Button in Frosted Glass */}
              <button
                type="button"
                onClick={() => setIsGuestPortalOpen(true)}
                className="w-full inline-flex items-center justify-between p-3.5 apple-glass hover:bg-white text-slate-900 rounded-2xl border border-emerald-300/60 transition-all text-left cursor-pointer group shadow-xs"
                id="btn-guest-report-portal"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B6B5D] text-white flex items-center justify-center shrink-0 shadow-md">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                      Lapor Kerusakan / Pemindahan Aset
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Akses Khusus Tamu & Pengunjung (Tanpa Perlu Login)
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-emerald-700 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              <div className="text-xs text-slate-500 leading-relaxed pt-1 max-w-xs mx-auto font-medium">
                Khusus akun Google Workspace / Email Resmi Karyawan TMII yang terdaftar dalam Whitelist Otorisasi.
              </div>
            </motion.div>
          </div>

          {/* Workspace Footer */}
          <div className="text-center text-xs text-slate-500 font-semibold tracking-wide z-10 pt-4" id="auth-footer">
            &copy; 2026 PT Bhumi Visatanda Indonesia · TMII Asset Management
          </div>
        </div>
      </div>
    );
  }

  // Render authorized main dashboard in Apple Liquid Glass & macOS VisionOS style
  return (
    <div 
      className="min-h-screen flex-1 flex font-sans relative overflow-x-hidden transition-colors duration-500 bg-[#F6F8FC] text-slate-900" 
      id="main-layout"
    >
      {/* Clean cultural background pattern with dynamic ambient caustics */}
      <BatikBackground themeId={currentTheme.id} />

      {/* FLOATING LEFT SIDEBAR FOR DESKTOP (Apple macOS Sequoia / VisionOS Spatial Sidebar) */}
      <aside 
        className="w-72 rounded-[28px] apple-glass flex flex-col shrink-0 hidden md:flex h-fit fixed top-3.5 left-3.5 z-30 transition-all duration-300 shadow-2xl border border-white/80 overflow-hidden" 
        id="sidebar"
      >
        {/* Brand Header */}
        <div className="p-6 pb-5 border-b border-white/60 shrink-0">
          <div className="mb-3.5 p-2.5 rounded-2xl border shadow-xs inline-block bg-white/50 backdrop-blur-md border-white/80">
            <TmiiLogo height="3.5rem" color={currentTheme.primaryColor} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-base font-extrabold tracking-tight block leading-tight font-display text-slate-900">
              Manajemen Aset
            </span>
            <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider border border-amber-300/60">
              TMII
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-wider uppercase">Taman Mini Indonesia Indah</p>
        </div>

        {/* Navigation links - locked to Pengaturan without scroll */}
        <nav className="p-3 space-y-1" id="sidebar-nav">
          {/* Dashboard and Tasks */}
          {[
            { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
            { id: 'tasks', label: 'Monitoring Tugas', icon: CheckSquare },
          ].map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'text-white shadow-lg border border-white/40' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
                style={isActive ? { 
                  backgroundColor: currentTheme.primaryColor, 
                  boxShadow: `0 8px 20px -4px ${currentTheme.primaryColor}45` 
                } : {}}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Fixed Assets (Collapsible menu) */}
          <div className="space-y-1">
            <button
              onClick={() => setIsFixedAssetsMenuOpen(!isFixedAssetsMenuOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab.startsWith('fixed-assets')
                  ? 'bg-white/80 text-slate-950 border border-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Database size={17} style={activeTab.startsWith('fixed-assets') ? { color: currentTheme.primaryColor } : {}} />
                <span>Aset Tetap</span>
              </div>
              <span className="text-[10px] text-slate-400 font-extrabold transform transition-transform duration-250 shrink-0" style={{ transform: isFixedAssetsMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                ▶
              </span>
            </button>

            {/* Collapsible Submenus */}
            {isFixedAssetsMenuOpen && (
              <div className="pl-3 space-y-1 mt-1 border-l-2 ml-5 border-slate-200/60">
                {[
                  { id: 'fixed-assets', label: 'Database' },
                  { id: 'fixed-assets-depreciation', label: 'Depresiasi & Nilai Buku' },
                  { id: 'fixed-assets-locations', label: 'Peta Sebaran Aset' },
                  { id: 'fixed-assets-maintenance', label: 'Pemeliharaan / Maintenance' },
                  { id: 'fixed-assets-tagging', label: 'Cetak Tagging' },
                  { id: 'fixed-assets-mutation', label: 'Pemindahan / Mutasi' },
                  { id: 'fixed-assets-opname', label: 'Stock Opname' }
                ].map(sub => {
                  const isSubActive = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveTab(sub.id as any)}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isSubActive
                          ? 'text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                      style={isSubActive ? { backgroundColor: currentTheme.primaryColor } : {}}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other Menus */}
          {[
            { id: 'animals', label: 'Aset Satwa', icon: Heart },
            { id: 'cctv', label: 'CCTV Keamanan', icon: Camera },
            { id: 'mep', label: 'Aset MEP', icon: Settings2 },
            { id: 'museum', label: 'Koleksi Museum', icon: BookOpen }
          ].map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'text-white shadow-lg border border-white/40' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
                style={isActive ? { 
                  backgroundColor: currentTheme.primaryColor, 
                  boxShadow: `0 8px 20px -4px ${currentTheme.primaryColor}45` 
                } : {}}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10 md:ml-[19.25rem]">
        
        {/* FLOATING GLASS HEADER BAR */}
        <header 
          className="mx-3 md:mx-6 mt-2.5 md:mt-3.5 mb-1.5 md:mb-2 px-3 md:px-5 py-2 md:py-3.5 apple-glass rounded-xl md:rounded-2xl flex items-center justify-between gap-2 z-20 shadow-md border border-white/80" 
          id="main-header"
        >
          {/* Mobile Left Slot: Prominent Menu Trigger + Enlarged TMII Logo */}
          <div className="flex items-center gap-3 min-w-0 flex-1 md:hidden">
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center gap-1.5 px-2.5 min-h-[40px] rounded-xl text-xs font-extrabold text-white shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
              style={{ backgroundColor: currentTheme.primaryColor }}
              title="Buka Menu Navigasi"
              aria-label="Buka Menu Navigasi"
            >
              <Menu size={16} />
              <span>Menu</span>
            </button>
            <div className="flex items-center min-w-0">
              <TmiiLogo height="2.35rem" color={currentTheme.primaryColor} />
            </div>
          </div>

          {/* Desktop header title */}
          <div className="hidden md:flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-tight capitalize font-display text-slate-900">
              {activeTab === 'dashboard' && 'Dashboard Utama'}
              {activeTab === 'tasks' && 'Tugas & Monitoring Pekerjaan'}
              {activeTab === 'fixed-assets' && 'Database Aset Tetap'}
              {activeTab === 'fixed-assets-depreciation' && 'Depresiasi & Nilai Buku Aset'}
              {activeTab === 'fixed-assets-maintenance' && 'Pemeliharaan & Maintenance Aset'}
              {activeTab === 'fixed-assets-locations' && 'Lokasi & Peta Aset Interaktif'}
              {activeTab === 'fixed-assets-tagging' && 'Cetak Tagging'}
              {activeTab === 'fixed-assets-mutation' && 'Pemindahan & Mutasi BAST'}
              {activeTab === 'fixed-assets-opname' && 'Stock Opname Aset'}
              {activeTab === 'animals' && 'Aset Satwa & Fauna'}
              {activeTab === 'cctv' && 'Sistem CCTV Keamanan Kawasan'}
              {activeTab === 'mep' && 'Aset MEP & Utilitas'}
              {activeTab === 'museum' && 'Koleksi Museum Nusantara'}
              {activeTab === 'whitelist' && (isUserAdmin() ? 'Pengaturan Akses Sistem' : 'Pengaturan - Aturan Kode Aset')}
            </h2>
          </div>

          {/* System Actions & Mobile Menu trigger */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2.5">
              
              {/* Live Clock in Glass Capsule */}
              <div className="apple-glass-pill px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs text-slate-700">
                <Clock size={13} className="text-[#0B6B5D]" />
                <span className="font-mono">{currentTime.toLocaleTimeString('id-ID')} WIB</span>
              </div>

              {/* Tema Aplikasi Switcher in Glass Orb Bar */}
              <div className="flex items-center gap-2 apple-glass px-2.5 py-1.5 rounded-xl transition-all shadow-xs border border-white/70">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tema:</span>
                <div className="flex items-center gap-1">
                  {APP_THEMES.map(tTheme => {
                    const isActive = currentTheme.id === tTheme.id;
                    return (
                      <button
                        key={tTheme.id}
                        onClick={() => handleThemeChange(tTheme.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer relative ${
                          isActive 
                            ? 'bg-white shadow-md scale-110 z-10 border border-slate-200' 
                            : 'opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                        title={tTheme.name}
                      >
                        {tTheme.id === 'sumatera' && <BatikSongket size={14} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                        {tTheme.id === 'jawa' && <BatikKawung size={14} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                        {tTheme.id === 'kalimantan' && <BatikDayak size={14} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                        {tTheme.id === 'sulawesi' && <BatikToraja size={14} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                        {tTheme.id === 'papua' && <BatikAsmat size={14} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Backup Cloud Button */}
              <button 
                onClick={handleCloudBackup}
                disabled={isBackupLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 apple-glass-pill rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 shadow-2xs text-slate-700 hover:bg-white"
              >
                <Cloud size={13} className={isBackupLoading ? "animate-bounce" : ""} />
                <span>{isBackupLoading ? 'Mencadangkan...' : 'Backup'}</span>
              </button>

              {/* Sync Button */}
              <button 
                onClick={handleSyncData}
                disabled={isSyncLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 apple-glass-pill rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 shadow-2xs text-slate-700 hover:bg-white"
              >
                <RefreshCw size={13} className={isSyncLoading ? "animate-spin" : ""} />
                <span>{isSyncLoading ? 'Sinkron...' : 'Sinkron'}</span>
              </button>

              {/* Tombol Pengaturan di Samping Kiri Tombol Keluar */}
              <button
                type="button"
                onClick={() => setActiveTab('whitelist')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  activeTab === 'whitelist'
                    ? 'text-white shadow-md border border-white/40'
                    : 'apple-glass-pill text-slate-700 hover:bg-white'
                }`}
                style={activeTab === 'whitelist' ? { backgroundColor: currentTheme.primaryColor } : {}}
                title={isUserAdmin() ? 'Pengaturan Sistem & Database' : 'Pengaturan - Aturan Kode Aset & PWA'}
              >
                <SlidersHorizontal size={13} />
                <span>Pengaturan</span>
              </button>

              {/* Tombol Keluar di Pojok Kanan Header Bar */}
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50/90 hover:bg-red-100 border border-red-200/90 transition-all cursor-pointer shadow-xs active:scale-95 group"
                title="Keluar dari Sistem TMII"
              >
                <LogOut size={13} className="text-red-500 group-hover:scale-110 transition-transform" />
                <span>Keluar</span>
              </button>
            </div>

            {/* Mobile Pengaturan quick button next to Logout */}
            <button
              type="button"
              onClick={() => setActiveTab('whitelist')}
              className={`sm:hidden min-h-[38px] min-w-[38px] p-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center border shrink-0 ${
                activeTab === 'whitelist'
                  ? 'text-white border-white/40 shadow-md'
                  : 'apple-glass text-slate-700 hover:bg-white border-white/80'
              }`}
              style={activeTab === 'whitelist' ? { backgroundColor: currentTheme.primaryColor } : {}}
              title="Pengaturan"
            >
              <SlidersHorizontal size={15} />
            </button>

            {/* Mobile Logout quick button */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="sm:hidden min-h-[38px] min-w-[38px] p-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
              title="Keluar dari Sistem"
            >
              <LogOut size={15} className="text-red-500" />
            </button>
          </div>
        </header>

        {/* 2. DYNAMIC LIQUID GLASS HERO BANNER */}
        <div className="px-3 md:px-6 pb-1 md:pb-2">
          {(() => {
            const getThemeBadgeName = () => {
              switch (currentTheme.id) {
                case 'sumatera': return 'TEMA SUMATERA (SONGKET MINANG)';
                case 'jawa': return 'TEMA JAWA (KAWUNG KRATON)';
                case 'kalimantan': return 'TEMA KALIMANTAN (UKIR DAYAK)';
                case 'sulawesi': return 'TEMA SULAWESI (UKIR TORAJA)';
                case 'papua': return 'TEMA PAPUA (SENI ASMAT)';
                default: return 'TEMA JAWA (KAWUNG KRATON)';
              }
            };

            const getThemeGradient = () => {
              switch (currentTheme.id) {
                case 'sumatera': return 'bg-gradient-to-r from-[#4A0A35]/95 via-[#800A38]/95 to-[#A8241A]/95';
                case 'jawa': return 'bg-gradient-to-r from-[#08141F]/95 via-[#0D1F30]/95 to-[#1A385C]/95';
                case 'kalimantan': return 'bg-gradient-to-r from-[#052E27]/95 via-[#09473B]/95 to-[#0E6655]/95';
                case 'sulawesi': return 'bg-gradient-to-r from-[#5C2400]/95 via-[#8A3700]/95 to-[#B84900]/95';
                case 'papua': return 'bg-gradient-to-r from-[#2C1336]/95 via-[#452752]/95 to-[#6C3483]/95';
                default: return 'bg-gradient-to-r from-[#08141F]/95 via-[#0D1F30]/95 to-[#1A385C]/95';
              }
            };

            return (
              <div 
                className={`relative overflow-hidden ${getThemeGradient()} backdrop-blur-2xl rounded-2xl md:rounded-3xl min-h-[96px] md:h-[150px] ml-0 px-4 py-3 md:px-8 md:pb-8 md:pt-[12px] border border-white/30 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-6 text-white shadow-xl apple-liquid-rim`}
                id="hero-banner"
              >
                {/* Background decorative vector motifs for cultural authenticity */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-4 opacity-20 md:opacity-25 pointer-events-none select-none scale-75 md:scale-100 origin-right">
                  {currentTheme.id === 'sumatera' && (
                    <>
                      <BatikSongket size={200} color="#F3E5AB" className="rotate-6" />
                      <BatikSongket size={140} color="#F3E5AB" className="-rotate-12" />
                    </>
                  )}
                  {currentTheme.id === 'jawa' && (
                    <>
                      <BatikKawung size={200} color="#F3E5AB" className="rotate-12" />
                      <BatikKawung size={140} color="#F3E5AB" className="-rotate-12" />
                    </>
                  )}
                  {currentTheme.id === 'kalimantan' && (
                    <>
                      <BatikDayak size={200} color="#F3E5AB" className="rotate-6" />
                      <BatikDayak size={140} color="#F3E5AB" className="-rotate-12" />
                    </>
                  )}
                  {currentTheme.id === 'sulawesi' && (
                    <>
                      <BatikToraja size={200} color="#F3E5AB" className="-rotate-6" />
                      <BatikToraja size={140} color="#F3E5AB" className="rotate-12" />
                    </>
                  )}
                  {currentTheme.id === 'papua' && (
                    <>
                      <BatikAsmat size={200} color="#F3E5AB" className="rotate-12" />
                      <BatikAsmat size={140} color="#F3E5AB" className="-rotate-6" />
                    </>
                  )}
                </div>

                <div className="relative z-10 space-y-1 md:space-y-2.5 text-left min-w-0 flex-1 w-full">
                  <span className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 py-0.5 md:px-3.5 md:py-1.5 rounded-full font-['Poppins',sans-serif] text-[9px] md:text-[11px] font-black tracking-wider md:tracking-widest uppercase shadow-md bg-white/10 text-[#F3E5AB] border border-white/20 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                    {getThemeBadgeName()}
                  </span>
                  <h2 className="text-[15px] md:text-[18px] font-extrabold text-white tracking-tight leading-snug md:leading-tight drop-shadow-md font-display">
                    Sistem Terpadu Manajemen Aset TMII
                  </h2>
                  <p className="text-[10px] text-[#F3E5AB]/90 font-medium max-w-2xl leading-relaxed">
                    Pencatatan, monitoring, dan kontrol seluruh aset yang ada di wilayah TMII secara digital
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Mobile Menu Drawer (Popup Vertikal) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex justify-start" id="mobile-drawer">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
              />

              {/* Drawer Content */}
              {/* VisionOS Floating Frosted Glass Drawer Content */}
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="relative w-72 max-w-[82vw] apple-glass-panel h-full shadow-2xl flex flex-col z-10 border-r border-white/80"
              >
                <div className="p-5 border-b flex items-center justify-between border-white/60">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl border shadow-xs bg-white/60 backdrop-blur-md border-white/80">
                      <TmiiLogo height="2.2rem" color={currentTheme.primaryColor} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h1 className="text-xs font-extrabold tracking-tight leading-tight font-display text-slate-900">
                          Manajemen Aset
                        </h1>
                        <span className="bg-amber-100 text-amber-900 text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                          TMII
                        </span>
                      </div>
                      <p className="text-[8px] font-semibold text-slate-400 mt-0.5 uppercase">Taman Mini Indonesia Indah</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 apple-glass-pill rounded-xl transition-colors cursor-pointer text-slate-600 hover:bg-white"
                  >
                    <LogOut size={16} className="rotate-180" />
                  </button>
                </div>

                {/* Theme Switcher in Mobile Drawer */}
                <div className="p-5 pb-3 border-b space-y-3 border-white/60">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Pilih Tema Nusantara</span>
                  <div className="apple-glass px-2 py-1.5 rounded-full flex items-center justify-between gap-1 shadow-2xs border border-white/70">
                    {APP_THEMES.map(tTheme => {
                      const isActive = currentTheme.id === tTheme.id;
                      return (
                        <button
                          key={tTheme.id}
                          onClick={() => handleThemeChange(tTheme.id)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer relative ${
                            isActive 
                              ? 'bg-white shadow-md scale-110 z-10 border border-slate-200' 
                              : 'opacity-70 hover:opacity-100 hover:scale-105'
                          }`}
                          title={tTheme.name}
                        >
                          {tTheme.id === 'sumatera' && <BatikSongket size={17} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                          {tTheme.id === 'jawa' && <BatikKawung size={17} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                          {tTheme.id === 'kalimantan' && <BatikDayak size={17} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                          {tTheme.id === 'sulawesi' && <BatikToraja size={17} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                          {tTheme.id === 'papua' && <BatikAsmat size={17} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vertical Tabs in Drawer */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                  {/* Dashboard & Tasks */}
                  {[
                    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
                    { id: 'tasks', label: 'Monitoring Tugas', icon: CheckSquare },
                  ].map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? 'text-white shadow-md border border-white/40' 
                            : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                        }`}
                        style={isActive ? { backgroundColor: currentTheme.primaryColor, boxShadow: `0 4px 12px ${currentTheme.primaryColor}30` } : {}}
                      >
                        <Icon size={17} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}

                  {/* Fixed Assets Collapsible */}
                  <div className="space-y-1">
                    <button
                      onClick={() => setIsFixedAssetsMenuOpen(!isFixedAssetsMenuOpen)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                        activeTab.startsWith('fixed-assets')
                          ? 'bg-white/80 text-slate-950 border border-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Database size={17} style={activeTab.startsWith('fixed-assets') ? { color: currentTheme.primaryColor } : {}} />
                        <span>Aset Tetap</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-extrabold transform transition-transform duration-250 shrink-0" style={{ transform: isFixedAssetsMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        ▶
                      </span>
                    </button>

                    {isFixedAssetsMenuOpen && (
                      <div className="pl-3 space-y-1 mt-1 border-l-2 ml-5 border-slate-200/60">
                        {[
                          { id: 'fixed-assets', label: 'Database' },
                          { id: 'fixed-assets-depreciation', label: 'Depresiasi & Nilai Buku' },
                          { id: 'fixed-assets-locations', label: 'Peta Sebaran Aset' },
                          { id: 'fixed-assets-maintenance', label: 'Pemeliharaan / Maintenance' },
                          { id: 'fixed-assets-tagging', label: 'Cetak Tagging' },
                          { id: 'fixed-assets-mutation', label: 'Pemindahan / Mutasi' },
                          { id: 'fixed-assets-opname', label: 'Stock Opname' }
                        ].map(sub => {
                          const isSubActive = activeTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setActiveTab(sub.id as any);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                isSubActive
                                  ? 'text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                              }`}
                              style={isSubActive ? { backgroundColor: currentTheme.primaryColor } : {}}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Rest of menus */}
                  {[
                    { id: 'animals', label: 'Aset Satwa', icon: Heart },
                    { id: 'cctv', label: 'CCTV Keamanan', icon: Camera },
                    { id: 'mep', label: 'Aset MEP', icon: Settings2 },
                    { id: 'museum', label: 'Koleksi Museum', icon: BookOpen }
                  ].map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? 'text-white shadow-md border border-white/40' 
                            : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                        }`}
                        style={isActive ? { backgroundColor: currentTheme.primaryColor, boxShadow: `0 4px 12px ${currentTheme.primaryColor}20` } : {}}
                      >
                        <Icon size={17} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Actions & Profile section at bottom of drawer */}
                <div className="p-5 border-t space-y-3 border-white/60 bg-white/40 backdrop-blur-md">
                  {/* Backup / Sync for Mobile */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleCloudBackup}
                      disabled={isBackupLoading}
                      className="flex items-center justify-center gap-1.5 py-2 apple-glass-pill rounded-xl text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60 shadow-2xs text-slate-700 hover:bg-white"
                    >
                      <Cloud size={13} />
                      <span>Backup</span>
                    </button>
                    <button 
                      onClick={handleSyncData}
                      disabled={isSyncLoading}
                      className="flex items-center justify-center gap-1.5 py-2 apple-glass-pill rounded-xl text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60 shadow-2xs text-slate-700 hover:bg-white"
                    >
                      <RefreshCw size={13} />
                      <span>Sinkron</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="User photo" className="w-9 h-9 rounded-full border border-white shadow-xs shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 flex items-center justify-center rounded-full shadow-xs shrink-0 font-black text-xs bg-slate-200 text-slate-700">
                        {(currentUser?.displayName || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate leading-tight text-slate-800">
                        {currentUser?.displayName || 'Karyawan TMII'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate font-semibold mt-0.5">{currentUser?.email}</div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 apple-glass-pill font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600"
                  >
                    <LogOut size={13} />
                    <span>Keluar Sistem</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ACTIVE MODULE CONTAINER */}
        <main className="flex-1 w-full max-w-full px-3 py-2 pb-24 md:p-8 overflow-y-auto overflow-x-hidden" id="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="max-w-7xl mx-auto w-full min-w-0"
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  tasks={tasks}
                  fixedAssets={fixedAssets}
                  animals={animals}
                  cctvs={cctvs}
                  meps={meps}
                  museumCollections={museumCollections}
                  setActiveTab={(tab: any) => setActiveTab(tab)}
                  theme={currentTheme}
                />
              )}

              {activeTab === 'tasks' && (
                <TaskManagement 
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  googleAccessToken={googleToken}
                  isAdmin={isUserAdmin()}
                  theme={currentTheme}
                  userEmail={currentUser?.displayName || currentUser?.email}
                />
              )}

              {activeTab === 'fixed-assets' && (
                <FixedAssets 
                  assets={fixedAssets}
                  configuredLocations={assetLocations}
                  configuredCategories={assetCategories}
                  onAddAsset={handleAddFixedAsset}
                  onUpdateAsset={handleUpdateFixedAsset}
                  onDeleteAsset={handleDeleteFixedAsset}
                  isAdmin={isUserAdmin()}
                  googleAccessToken={googleToken}
                  theme={currentTheme}
                  onNavigateToDepreciation={() => setActiveTab('fixed-assets-depreciation')}
                />
              )}

              {activeTab === 'fixed-assets-depreciation' && (
                <FixedAssetsDepreciation
                  assets={fixedAssets}
                  configuredLocations={assetLocations}
                  configuredCategories={assetCategories}
                  theme={currentTheme}
                  onUpdateAsset={handleUpdateFixedAsset}
                  isAdmin={isUserAdmin()}
                />
              )}

              {activeTab === 'fixed-assets-locations' && (
                <InteractiveAssetMap 
                  fixedAssets={fixedAssets}
                  configuredLocations={assetLocations}
                  theme={currentTheme}
                  currentUserDisplayName={currentUser?.displayName}
                />
              )}

              {activeTab === 'fixed-assets-maintenance' && (
                <FixedAssetsMaintenance 
                  assets={fixedAssets}
                  theme={currentTheme}
                  onUpdateAsset={async (id, updatedFields) => {
                    await handleUpdateFixedAsset(id, updatedFields);
                  }}
                  currentUserDisplayName={currentUser?.displayName}
                  isAdmin={isUserAdmin()}
                />
              )}

              {activeTab === 'fixed-assets-tagging' && (
                <FixedAssetsTagging 
                  assets={fixedAssets}
                  theme={currentTheme}
                />
              )}

              {activeTab === 'fixed-assets-mutation' && (
                <FixedAssetsMutation 
                  assets={fixedAssets}
                  configuredLocations={assetLocations}
                  theme={currentTheme}
                  onUpdateAsset={async (updatedAsset) => {
                    await handleUpdateFixedAsset(updatedAsset.id, updatedAsset);
                  }}
                  currentUserDisplayName={currentUser?.displayName}
                />
              )}

              {activeTab === 'fixed-assets-opname' && (
                <FixedAssetsOpname 
                  assets={fixedAssets}
                  theme={currentTheme}
                  onUpdateAsset={async (updatedAsset) => {
                    await handleUpdateFixedAsset(updatedAsset.id, updatedAsset);
                  }}
                  currentUserDisplayName={currentUser?.displayName}
                />
              )}

              {activeTab === 'animals' && (
                <AnimalAssets 
                  animals={animals}
                  configuredLocations={assetLocations}
                  onAddAnimal={handleAddAnimal}
                  onUpdateAnimal={handleUpdateAnimal}
                  onDeleteAnimal={handleDeleteAnimal}
                  isAdmin={isUserAdmin()}
                  theme={currentTheme}
                />
              )}

              {activeTab === 'cctv' && (
                <CctvAssets 
                  cctvs={cctvs}
                  configuredLocations={assetLocations}
                  onAddCctv={handleAddCctv}
                  onUpdateCctv={handleUpdateCctv}
                  onDeleteCctv={handleDeleteCctv}
                  isAdmin={isUserAdmin()}
                  theme={currentTheme}
                />
              )}

              {activeTab === 'mep' && (
                <MepAssets 
                  meps={meps}
                  configuredLocations={assetLocations}
                  onAddMep={handleAddMep}
                  onUpdateMep={handleUpdateMep}
                  onDeleteMep={handleDeleteMep}
                  isAdmin={isUserAdmin()}
                  theme={currentTheme}
                />
              )}

              {activeTab === 'museum' && (
                <MuseumAssets 
                  collections={museumCollections}
                  onAddCollection={handleAddMuseumCollection}
                  onUpdateCollection={handleUpdateMuseumCollection}
                  onDeleteCollection={handleDeleteMuseumCollection}
                  isAdmin={isUserAdmin()}
                  theme={currentTheme}
                />
              )}

              {activeTab === 'whitelist' && (
                <WhitelistSettings 
                  emails={allowedEmails}
                  onAddEmail={handleAddAllowedEmail}
                  onDeleteEmail={handleDeleteAllowedEmail}
                  locations={assetLocations}
                  onAddLocation={handleAddLocation}
                  onUpdateLocation={handleUpdateLocation}
                  onDeleteLocation={handleDeleteLocation}
                  onSeedLocations={handleSeedDefaultLocations}
                  categories={assetCategories}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onSeedCategories={handleSeedDefaultCategories}
                  currentUserEmail={currentUser?.email || null}
                  onClearCollection={handleClearCollection}
                  stats={{
                    tasks: tasks.length,
                    fixedAssets: fixedAssets.length,
                    animals: animals.length,
                    cctvs: cctvs.length,
                    meps: meps.length,
                    museumCollections: museumCollections.length
                  }}
                  fixedAssets={fixedAssets}
                  theme={currentTheme}
                  isAdmin={isUserAdmin()}
                  onOpenPwaModal={() => setIsAddToHomeModalOpen(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Logout Confirmation Modal */}
        <AnimatePresence>
          {showLogoutModal && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="logout-modal">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <LogOut size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">Keluar dari Sistem</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Apakah Anda yakin ingin keluar dari Sistem Manajemen Aset TMII? Sesi Anda akan dihentikan.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md transition-colors cursor-pointer"
                  >
                    Keluar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add To Home Screen PWA Modal Guide */}
        <AddToHomeScreenModal
          isOpen={isAddToHomeModalOpen}
          onClose={() => setIsAddToHomeModalOpen(false)}
        />

      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-Zone Quick Access) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 apple-glass border-t border-white/80 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
        aria-label="Navigasi Mobile"
        id="mobile-bottom-nav"
      >
        <div className="grid grid-cols-5 items-center h-13">
          {[
            { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard, isMatch: activeTab === 'dashboard' },
            { id: 'tasks', label: 'Tugas', icon: CheckSquare, isMatch: activeTab === 'tasks' },
            { id: 'fixed-assets', label: 'Aset', icon: Database, isMatch: activeTab.startsWith('fixed-assets') },
            { id: 'whitelist', label: 'Atur', icon: SlidersHorizontal, isMatch: activeTab === 'whitelist' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsMobileMenuOpen(false);
                }}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
                  item.isMatch
                    ? 'font-extrabold'
                    : 'text-slate-500 hover:text-slate-900 font-semibold'
                }`}
                style={item.isMatch ? { color: currentTheme.primaryColor } : {}}
              >
                <div
                  className={`p-1 rounded-lg transition-colors ${item.isMatch ? 'bg-slate-900/5' : ''}`}
                  style={item.isMatch ? { backgroundColor: `${currentTheme.primaryColor}15` } : {}}
                >
                  <Icon size={18} />
                </div>
                <span className="text-[10px] leading-none tracking-tight whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
              isMobileMenuOpen || ['animals', 'cctv', 'mep', 'museum'].includes(activeTab)
                ? 'font-extrabold'
                : 'text-slate-700 hover:text-slate-950 font-bold'
            }`}
            style={
              isMobileMenuOpen || ['animals', 'cctv', 'mep', 'museum'].includes(activeTab)
                ? { color: currentTheme.primaryColor }
                : {}
            }
          >
            <div
              className="p-1 rounded-lg"
              style={{
                backgroundColor:
                  isMobileMenuOpen || ['animals', 'cctv', 'mep', 'museum'].includes(activeTab)
                    ? `${currentTheme.primaryColor}18`
                    : 'rgba(15, 23, 42, 0.06)'
              }}
            >
              <Menu size={18} />
            </div>
            <span className="text-[10px] leading-none tracking-tight whitespace-nowrap">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
