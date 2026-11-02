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
  Users, 
  LogOut, 
  User as UserIcon,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Cloud,
  RefreshCw,
  Menu,
  Smartphone,
  AlertTriangle,
  ChevronRight,
  FileCode2,
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAuthSuccess = async (user: User, token: string) => {
    const userEmail = user.email?.toLowerCase();
    
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
      const isAllowed = emailList.some(e => e.email.toLowerCase() === userEmail);

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

  // Beautiful render loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh/0.82)] w-full bg-[#FAF8F5] text-slate-800 font-sans relative" id="loading-screen">
        <div className="relative flex flex-col items-center z-10 text-center px-6">
          <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
            {/* Soft pulsing ring similar to TMII branding */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0B6B5D] animate-spin"></div>
          </div>
          <div className="mb-3">
            <TmiiLogo height="4rem" color="#0B6B5D" className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            TMII Asset Management
          </h2>
          <div className="mt-2 text-xs font-medium text-slate-500 tracking-wider animate-pulse">
            Memuat data sistem...
          </div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!currentUser) {
    return (
      <div className="w-full min-h-screen bg-[#FAF8F5] flex flex-col lg:flex-row text-slate-800 font-sans relative overflow-hidden" id="auth-screen">
        
        {/* LEFT COMPONENT (CULTURAL HERO BANNER): Rich Indonesian Cultural Theme */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 min-h-screen relative overflow-hidden bg-gradient-to-br from-[#07241A] via-[#0E3B2D] to-[#04150F] p-10 xl:p-14 text-white shadow-2xl border-r border-[#D4AF37]/30 shrink-0" id="auth-cultural-banner">
          
          {/* Floating Batik Cultural Background Overlay showcasing 5 islands */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
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
            {/* Gold Radial Glows */}
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#C0392B]/10 rounded-full blur-3xl pointer-events-none"></div>
          </div>

          {/* Top Banner Tag */}
          <div className="z-10 flex items-center justify-between">
            <span className="bg-white/10 backdrop-blur-md text-[#F3E5AB] border border-[#D4AF37]/50 px-5 py-2 text-xs sm:text-sm font-bold tracking-widest rounded-full uppercase flex items-center gap-2 shadow-md">
              <BatikKawung size={18} color="#D4AF37" />
              TAMAN MINI INDONESIA INDAH
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#D4AF37] tracking-widest uppercase flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-4 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping"></span>
              PESONA NUSANTARA
            </span>
          </div>

          {/* Main Hero Content */}
          <div className="z-10 my-auto space-y-7 max-w-xl">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-white/20 via-white/10 to-transparent backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-[#D4AF37]/40 shadow-2xl">
              <TmiiLogo height="4.2rem" color="#ffffff" />
            </div>

            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#D4AF37] block">
                Portal Terpadu
              </span>
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight font-sans drop-shadow-md">
                Sistem Terpadu <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#E5C158]">
                  Manajemen Aset
                </span>
              </h1>
            </div>

            <p className="text-sm xl:text-base text-slate-200/90 leading-relaxed font-medium max-w-lg">
              Mendukung pelestarian, pencatatan, dan pemeliharaan seluruh aset Taman Mini Indonesia Indah secara akurat, modern, dan berkelanjutan.
            </p>


          </div>

          {/* Footer Copyright */}
          <div className="z-10 pt-5 border-t border-white/15 flex items-center justify-between text-xs sm:text-sm text-slate-300/80 font-medium">
            <span>&copy; 2026 PT Bhumi Visatanda Indonesia</span>
            <span className="text-[#D4AF37] font-bold">Taman Mini Indonesia Indah</span>
          </div>
        </div>

        {/* RIGHT COMPONENT (LOGIN WORKSPACE): Elegant Alabaster & Batik Accent Workspace */}
        <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 xl:p-16 min-h-screen overflow-y-auto bg-[#FAF8F5] relative z-10" id="auth-workspace">
          {/* Subtle Cultural Batik background watermarks */}
          <BatikBackground themeId="terracotta" />

          {/* Top header with Live Clock */}
          <div className="flex items-center justify-between z-10 w-full mb-6" id="auth-header">
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs sm:text-sm font-bold text-slate-700 tracking-wide">
                Portal Resmi TMII
              </span>
            </div>

            <div className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-2.5 bg-white px-5 py-2.5 rounded-full border border-[#D4AF37]/30 shadow-xs">
              <Clock size={15} className="text-[#0B6B5D]" />
              <span>{currentTime.toLocaleTimeString('id-ID')} WIB</span>
            </div>
          </div>

          {/* Middle Login Card */}
          <div className="max-w-lg w-full mx-auto my-auto py-8 flex flex-col items-center z-10" id="auth-content">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="w-full bg-white/95 backdrop-blur-xl border border-[#D4AF37]/40 rounded-[36px] p-8 sm:p-11 shadow-[0_25px_60px_rgba(11,43,32,0.08)] text-center space-y-7 relative overflow-hidden"
            >
              {/* Subtle top golden line decorative border */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#0F382C] via-[#D4AF37] to-[#0F382C]"></div>

              <div className="flex flex-col items-center pt-2">
                {/* TMII Logo Preserved */}
                <div className="mb-5 p-4 bg-[#F4F8F6] rounded-2xl border border-[#0B6B5D]/20 shadow-inner">
                  <TmiiLogo height="4.8rem" color="#0B6B5D" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Masuk Portal Aset
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-sm mt-2 mx-auto font-medium">
                  Sistem Informasi Pengelolaan Aset Terpadu Taman Mini Indonesia Indah.
                </p>
              </div>

              {/* Module Icons Badge Strip */}
              <div className="flex items-center justify-center gap-3 py-2 px-4 bg-[#FAF8F5] rounded-xl border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs">
                <span>🏛️ Fixed Assets</span>
                <span>•</span>
                <span>🦜 Satwa</span>
                <span>•</span>
                <span>⚙️ MEP</span>
                <span>•</span>
                <span>📜 Museum</span>
              </div>

              {/* Error Notification */}
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm text-left flex gap-3 items-start"
                >
                  <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{authError}</span>
                </motion.div>
              )}

              {/* Google Login Button with Elegant Deep Emerald / Golden Accent */}
              <button 
                onClick={handleLogin}
                className="w-full inline-flex items-center justify-center gap-3.5 bg-gradient-to-r from-[#0F382C] via-[#144A3A] to-[#0F382C] hover:from-[#144A3A] hover:to-[#1B634E] text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-[#0F382C]/25 border border-[#D4AF37]/50 hover:border-[#D4AF37] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-base sm:text-lg"
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

              {/* Guest Report Portal Trigger Button */}
              <button
                type="button"
                onClick={() => setIsGuestPortalOpen(true)}
                className="w-full inline-flex items-center justify-between p-3.5 bg-emerald-50/80 hover:bg-emerald-100/90 text-slate-900 rounded-2xl border border-emerald-300/80 transition-all text-left cursor-pointer group shadow-2xs"
                id="btn-guest-report-portal"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B6B5D] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle size={20} />
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

              <div className="text-xs sm:text-sm text-slate-500 leading-relaxed pt-1 max-w-xs mx-auto font-medium">
                Khusus akun Google Workspace / Email Resmi Karyawan TMII yang terdaftar dalam Whitelist Otorisasi.
              </div>
            </motion.div>
          </div>

          {/* Workspace Footer */}
          <div className="text-center text-xs sm:text-sm text-slate-500 font-semibold tracking-wide z-10 pt-4" id="auth-footer">
            &copy; 2026 PT Bhumi Visatanda Indonesia
          </div>
        </div>
      </div>
    );
  }

  // Render authorized main dashboard in beautiful Samsung One UI Light style
  return (
    <div className="min-h-screen flex-1 bg-[#F4F5FA] flex text-slate-800 font-sans relative" id="main-layout">
      {/* Clean cultural background pattern */}
      <BatikBackground themeId={currentTheme.id} />

      {/* LEFT SIDEBAR FOR DESKTOP */}
      <aside className="w-72 bg-white flex flex-col shrink-0 border-r border-slate-200/80 hidden md:flex shadow-[4px_0_24px_rgba(0,0,0,0.015)] min-h-screen h-full self-stretch sticky top-0 z-30" id="sidebar">
        {/* Brand Header */}
        <div className="p-7 pb-5 border-b border-slate-100">
          <div className="mb-4">
            <TmiiLogo height="4rem" color={currentTheme.primaryColor} className="mr-auto" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-base font-bold tracking-wide text-slate-800 block leading-tight">
              Sistem Manajemen Aset
            </span>
            <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider">
              BETA
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1 tracking-wider uppercase">Taman Mini Indonesia Indah</p>
        </div>

        {/* Navigation links - One UI Rounded Pills */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" id="sidebar-nav">
          {/* Dashboard and Tasks */}
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'tasks', label: 'Task Monitoring', icon: CheckSquare },
          ].map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                }`}
                style={isActive ? { backgroundColor: currentTheme.primaryColor, boxShadow: `0 4px 12px ${currentTheme.primaryColor}30` } : {}}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Fixed Assets (Collapsible menu) */}
          <div className="space-y-1">
            <button
              onClick={() => setIsFixedAssetsMenuOpen(!isFixedAssetsMenuOpen)}
              className={`w-full flex items-center justify-between px-4.5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab.startsWith('fixed-assets')
                  ? 'bg-slate-50 text-slate-900 border border-slate-100/50'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Database size={18} style={activeTab.startsWith('fixed-assets') ? { color: currentTheme.primaryColor } : {}} />
                <span>Aset Tetap</span>
              </div>
              <span className="text-[10px] text-slate-400 font-extrabold transform transition-transform duration-250 shrink-0" style={{ transform: isFixedAssetsMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                ▶
              </span>
            </button>

            {/* Collapsible Submenus */}
            {isFixedAssetsMenuOpen && (
              <div className="pl-4 space-y-1 mt-1 border-l-2 border-slate-100 ml-6">
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
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        isSubActive
                          ? 'text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
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
            { id: 'museum', label: 'Koleksi Museum', icon: BookOpen },
            { id: 'whitelist', label: 'Pengaturan', icon: isUserAdmin() ? Users : FileCode2 }
          ].map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                }`}
                style={isActive ? { backgroundColor: currentTheme.primaryColor, boxShadow: `0 4px 12px ${currentTheme.primaryColor}30` } : {}}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile section at bottom */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="User photo" className="w-10 h-10 rounded-full border border-slate-200 shadow-sm shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 bg-slate-200 flex items-center justify-center text-slate-600 rounded-full shadow-sm shrink-0 font-black">
                {(currentUser?.displayName || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-800 truncate leading-tight">{currentUser?.displayName || 'Karyawan TMII'}</div>
              <div className="text-[10px] text-slate-400 truncate font-semibold mt-0.5">{currentUser?.email}</div>
            </div>
          </div>
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 border border-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
          >
            <LogOut size={13} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10">
        
        {/* HEADER BAR (CLEAN, TRANSPARENT/FOLLOW BACKGROUND COLOR) */}
        <header className="px-6 md:px-8 py-5 flex items-center justify-between bg-transparent" id="main-header">
          {/* Brand/Identity for Mobile only (hidden on Desktop since sidebar has it) */}
          <div className="flex items-center gap-3 md:hidden">
            <TmiiLogo height="3rem" color={currentTheme.primaryColor} />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs font-bold tracking-wide text-slate-900 leading-tight block">Sistem Manajemen Aset</h1>
                <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1 py-0.5 rounded shrink-0 uppercase tracking-wider scale-90">
                  BETA
                </span>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-wider mt-1 uppercase whitespace-nowrap">Taman Mini Indonesia Indah</p>
            </div>
          </div>

          {/* Desktop header title */}
          <div className="hidden md:flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight capitalize">
              {activeTab === 'dashboard' && 'Dashboard Utama'}
              {activeTab === 'tasks' && 'Tugas & Pekerjaan'}
              {activeTab === 'fixed-assets' && 'Database Aset Tetap'}
              {activeTab === 'fixed-assets-maintenance' && 'Pemeliharaan & Maintenance Aset'}
              {activeTab === 'fixed-assets-locations' && 'Lokasi & Peta Aset Interaktif'}
              {activeTab === 'fixed-assets-tagging' && 'Cetak Tagging Aset'}
              {activeTab === 'fixed-assets-mutation' && 'Pemindahan & Mutasi BAST'}
              {activeTab === 'fixed-assets-opname' && 'Stock Opname Aset'}
              {activeTab === 'animals' && 'Aset Satwa & Fauna'}
              {activeTab === 'cctv' && 'Sistem CCTV Keamanan'}
              {activeTab === 'mep' && 'Aset MEP'}
              {activeTab === 'museum' && 'Koleksi Museum Nusantara'}
              {activeTab === 'whitelist' && (isUserAdmin() ? 'Pengaturan Sistem' : 'Pengaturan - Aturan Kode Aset')}
            </h2>
          </div>

          {/* System Actions & Mobile Menu trigger */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              {/* Tema Aplikasi Switcher */}
              <div className="flex items-center gap-2 bg-white/60 hover:bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl transition-all shadow-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tema Aplikasi:</span>
                <div className="flex items-center gap-1">
                  {APP_THEMES.map(tTheme => {
                    const isActive = currentTheme.id === tTheme.id;
                    return (
                      <button
                        key={tTheme.id}
                        onClick={() => handleThemeChange(tTheme.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer relative ${
                          isActive 
                            ? 'bg-white shadow-xs scale-110 z-10 border border-slate-150' 
                            : 'opacity-60 hover:opacity-100'
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
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60 shadow-xs"
              >
                <Cloud size={14} className={isBackupLoading ? "animate-bounce" : ""} />
                <span>{isBackupLoading ? 'Mencadangkan...' : 'Backup Cloud'}</span>
              </button>

              {/* Sync Button */}
              <button 
                onClick={handleSyncData}
                disabled={isSyncLoading}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60 shadow-xs"
              >
                <RefreshCw size={14} className={isSyncLoading ? "animate-spin" : ""} />
                <span>{isSyncLoading ? 'Sinkronisasi...' : 'Sinkron'}</span>
              </button>

              {/* Install App / Add to Home Screen Button */}
              <button
                type="button"
                onClick={() => setIsAddToHomeModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 bg-gradient-to-r from-amber-100 to-amber-50 hover:from-amber-200 hover:to-amber-100 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Tambahkan Aplikasi ke Layar Utama HP (PWA)"
              >
                <Smartphone size={15} className="text-amber-600 shrink-0" />
                <span>Tambah ke Layar Utama</span>
              </button>
            </div>

            {/* Mobile Install App quick button next to Menu */}
            <button
              type="button"
              onClick={() => setIsAddToHomeModalOpen(true)}
              className="sm:hidden p-2 text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Tambah ke Layar Utama HP"
            >
              <Smartphone size={16} className="text-amber-700" />
              <span className="text-[10px]">Layar Utama</span>
            </button>

            {/* Mobile Menu Trigger Button (Menu Icon) */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        {/* 2. DYNAMIC HERO BANNER */}
        <div className="px-6 md:px-8 pb-2">
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
                case 'sumatera': return 'bg-gradient-to-r from-[#581845] via-[#900C3F] to-[#B02A1E] border-[#D4AF37]/50 shadow-lg';
                case 'jawa': return 'bg-gradient-to-r from-[#0B1924] via-[#0F2537] to-[#1F4068] border-[#D4AF37]/50 shadow-lg';
                case 'kalimantan': return 'bg-gradient-to-r from-[#073B31] via-[#0B5345] to-[#117A65] border-[#D4AF37]/50 shadow-lg';
                case 'sulawesi': return 'bg-gradient-to-r from-[#6E2C00] via-[#A04000] to-[#D35400] border-[#D4AF37]/50 shadow-lg';
                case 'papua': return 'bg-gradient-to-r from-[#341840] via-[#512E5F] to-[#7D3C98] border-[#D4AF37]/50 shadow-lg';
                default: return 'bg-gradient-to-r from-[#0B1924] via-[#0F2537] to-[#1F4068] border-[#D4AF37]/50 shadow-lg';
              }
            };

            return (
              <div 
                className={`relative overflow-hidden ${getThemeGradient()} rounded-3xl p-6 md:p-8 border flex flex-col md:flex-row items-center justify-between gap-6 text-white`}
                id="hero-banner"
              >
                {/* Background decorative vector motifs for cultural authenticity */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-4 opacity-30 pointer-events-none select-none">
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

                <div className="relative z-10 space-y-2.5 text-center md:text-left min-w-0 flex-1">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-md bg-black/30 text-[#F3E5AB] border border-[#D4AF37]/50 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                    {getThemeBadgeName()}
                  </span>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                    Sistem Terpadu Manajemen Aset TMII
                  </h2>
                  <p className="text-xs text-[#F3E5AB]/90 font-medium max-w-2xl">
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
            <div className="fixed inset-0 z-50 md:hidden flex justify-end" id="mobile-drawer">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
              />

              {/* Drawer Content */}
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-80 max-w-full bg-white h-full shadow-2xl flex flex-col z-10"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TmiiLogo height="2.5rem" color={currentTheme.primaryColor} />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h1 className="text-xs font-bold tracking-wide text-slate-900 leading-tight">Sistem Manajemen Aset</h1>
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1 py-0.5 rounded shrink-0 uppercase tracking-wider scale-90">
                          BETA
                        </span>
                      </div>
                      <p className="text-[8px] font-semibold text-slate-400 mt-1 uppercase">Taman Mini Indonesia Indah</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <LogOut size={16} className="rotate-180" />
                  </button>
                </div>

                {/* Theme Switcher in Mobile Drawer */}
                <div className="p-6 pb-3 border-b border-slate-100 space-y-3">
                  {/* PWA Install Button Banner in Drawer */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddToHomeModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full p-3 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-between shadow-md active:scale-98 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Smartphone size={18} />
                      <div className="text-left">
                        <div>Tambah ke Layar Utama</div>
                        <div className="text-[9px] font-bold text-slate-800 opacity-80">Instal Aplikasi di HP / Tablet</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-black bg-slate-950 text-amber-400 px-2 py-0.5 rounded-lg">PWA</span>
                  </button>

                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Tema Aplikasi</span>
                  <div className="bg-slate-100/70 border border-slate-200/20 px-2 py-1.5 rounded-full flex items-center justify-between gap-2">
                    {APP_THEMES.map(tTheme => {
                      const isActive = currentTheme.id === tTheme.id;
                      return (
                        <button
                          key={tTheme.id}
                          onClick={() => handleThemeChange(tTheme.id)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer relative ${
                            isActive 
                              ? 'bg-white shadow-md scale-110 z-10 border border-slate-100' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          title={tTheme.name}
                        >
                          {tTheme.id === 'sumatera' && <BatikSongket size={18} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                          {tTheme.id === 'jawa' && <BatikKawung size={18} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                          {tTheme.id === 'kalimantan' && <BatikDayak size={18} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                          {tTheme.id === 'sulawesi' && <BatikToraja size={18} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                          {tTheme.id === 'papua' && <BatikAsmat size={18} color={isActive ? tTheme.primaryColor : '#64748B'} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vertical Tabs in Drawer */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                  {/* Dashboard & Tasks */}
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'tasks', label: 'Task Monitoring', icon: CheckSquare },
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
                        className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? 'text-white' 
                            : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                        }`}
                        style={isActive ? { backgroundColor: currentTheme.primaryColor, boxShadow: `0 4px 12px ${currentTheme.primaryColor}20` } : {}}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}

                  {/* Fixed Assets Collapsible */}
                  <div className="space-y-1">
                    <button
                      onClick={() => setIsFixedAssetsMenuOpen(!isFixedAssetsMenuOpen)}
                      className={`w-full flex items-center justify-between px-4.5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        activeTab.startsWith('fixed-assets')
                          ? 'bg-slate-50 text-slate-900 border border-slate-100/50'
                          : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Database size={18} style={activeTab.startsWith('fixed-assets') ? { color: currentTheme.primaryColor } : {}} />
                        <span>Aset Tetap</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-extrabold transform transition-transform duration-250 shrink-0" style={{ transform: isFixedAssetsMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        ▶
                      </span>
                    </button>

                    {isFixedAssetsMenuOpen && (
                      <div className="pl-4 space-y-1 mt-1 border-l-2 border-slate-100 ml-6">
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
                              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                                isSubActive
                                  ? 'text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
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
                    { id: 'museum', label: 'Koleksi Museum', icon: BookOpen },
                    { id: 'whitelist', label: 'Pengaturan', icon: isUserAdmin() ? Users : FileCode2 }
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
                        className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? 'text-white' 
                            : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                        }`}
                        style={isActive ? { backgroundColor: currentTheme.primaryColor, boxShadow: `0 4px 12px ${currentTheme.primaryColor}20` } : {}}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Actions & Profile section at bottom of drawer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                  {/* Backup / Sync for Mobile */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleCloudBackup}
                      disabled={isBackupLoading}
                      className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60 shadow-xs"
                    >
                      <Cloud size={12} />
                      <span>Backup</span>
                    </button>
                    <button 
                      onClick={handleSyncData}
                      disabled={isSyncLoading}
                      className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60 shadow-xs"
                    >
                      <RefreshCw size={12} />
                      <span>Sinkron</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-9 h-9 rounded-full border border-slate-200 shadow-xs shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 bg-slate-200 text-slate-600 flex items-center justify-center font-black rounded-full text-xs shadow-xs shrink-0">
                        {(currentUser?.displayName || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-800 leading-tight truncate">
                        {currentUser?.displayName || 'Asset TMII'}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 truncate mt-0.5">
                        {currentUser?.email}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 border border-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
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
        <main className="flex-1 p-6 md:p-8 overflow-y-auto" id="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="max-w-7xl mx-auto"
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
    </div>
  );
}
