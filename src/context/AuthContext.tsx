import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import type { SystemVipConfig, TeacherProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  teacherProfile: TeacherProfile | null;
  vipConfig: SystemVipConfig;
  loading: boolean;
  firebaseStatus: { connected: boolean; error?: string };
  canUseVipFeatures: boolean;
  isLocked: boolean;
  registerTeacher: (fullName: string, phone: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateTeacherInfo: (fullName: string, phone: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function phoneToSyntheticEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `teacher_${digits}@englishlearning.local`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [vipConfig, setVipConfig] = useState<SystemVipConfig>({ vipModeEnabled: false });
  const [loading, setLoading] = useState(true);
  const [firebaseStatus, setFirebaseStatus] = useState<{ connected: boolean; error?: string }>({
    connected: true,
  });

  useEffect(() => {
    testFirestoreConnection().then(setFirebaseStatus);

    const unsubConfig = onSnapshot(
      doc(db, 'systemConfig', 'vipSettings'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SystemVipConfig;
          setVipConfig({
            vipModeEnabled: Boolean(data.vipModeEnabled),
            maintenanceMode: Boolean(data.maintenanceMode),
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          });
        } else {
          setVipConfig({ vipModeEnabled: false });
        }
      },
      () => {
        // Fallback default if systemConfig has not been initialized yet
        setVipConfig({ vipModeEnabled: false });
      }
    );

    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!firebaseUser) {
        setTeacherProfile(null);
        setLoading(false);
        return;
      }

      const teacherRef = doc(db, 'teachers', firebaseUser.uid);
      unsubProfile = onSnapshot(
        teacherRef,
        async (snap) => {
          if (snap.exists()) {
            setTeacherProfile(snap.data() as TeacherProfile);
          } else {
            // Auto-provision profile on first Google Sign-In
            try {
              const newProfile = {
                uid: firebaseUser.uid,
                fullName: firebaseUser.displayName || 'Giáo viên',
                phone: firebaseUser.phoneNumber || '',
                email: firebaseUser.email || '',
                status: 'active' as const,
                accountType: 'FREE' as const,
                role: 'teacher' as const,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };
              await setDoc(teacherRef, newProfile);
            } catch (err) {
              console.error('Could not create teacher profile automatically:', err);
            }
          }
          setLoading(false);
        },
        (error) => {
          console.error('Teacher profile listener error:', error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubConfig();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const registerTeacher = useCallback(async (fullName: string, phone: string, password: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      throw new Error('Số điện thoại không hợp lệ (cần 9–15 chữ số).');
    }
    if (password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    }
    const syntheticEmail = phoneToSyntheticEmail(cleanPhone);
    const cred = await createUserWithEmailAndPassword(auth, syntheticEmail, password);
    await updateProfile(cred.user, { displayName: fullName.trim() });

    const teacherRef = doc(db, 'teachers', cred.user.uid);
    try {
      await setDoc(teacherRef, {
        uid: cred.user.uid,
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: syntheticEmail,
        status: 'active',
        accountType: 'FREE',
        role: 'teacher',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `teachers/${cred.user.uid}`);
    }
  }, []);

  const loginWithPhone = useCallback(async (phone: string, password: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      throw new Error('Vui lòng nhập số điện thoại.');
    }
    const syntheticEmail = phoneToSyntheticEmail(cleanPhone);
    const cred = await signInWithEmailAndPassword(auth, syntheticEmail, password);
    const snap = await getDoc(doc(db, 'teachers', cred.user.uid));
    if (snap.exists() && snap.data()?.status === 'locked') {
      await signOut(auth);
      throw new Error('Tài khoản của bạn đang bị khóa. Vui lòng liên hệ Admin.');
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const snap = await getDoc(doc(db, 'teachers', cred.user.uid));
    if (snap.exists() && snap.data()?.status === 'locked') {
      await signOut(auth);
      throw new Error('Tài khoản của bạn đang bị khóa. Vui lòng liên hệ Admin.');
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updateTeacherInfo = useCallback(
    async (fullName: string, phone: string) => {
      if (!user) throw new Error('Bạn chưa đăng nhập.');
      const cleanName = fullName.trim();
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanName) throw new Error('Họ và tên không được để trống.');
      const teacherRef = doc(db, 'teachers', user.uid);
      try {
        await updateDoc(teacherRef, {
          fullName: cleanName,
          phone: cleanPhone,
          updatedAt: serverTimestamp(),
        });
        await updateProfile(user, { displayName: cleanName });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `teachers/${user.uid}`);
      }
    },
    [user]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user || !user.email) {
        throw new Error('Tài khoản hiện tại không hỗ trợ đổi mật khẩu trực tiếp.');
      }
      if (newPassword.length < 6) {
        throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      }
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    },
    [user]
  );

  const isLocked = teacherProfile?.status === 'locked';
  const canUseVipFeatures =
    Boolean(user) &&
    !isLocked &&
    (!vipConfig.vipModeEnabled ||
      teacherProfile?.accountType === 'VIP' ||
      teacherProfile?.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        teacherProfile,
        vipConfig,
        loading,
        firebaseStatus,
        canUseVipFeatures,
        isLocked,
        registerTeacher,
        loginWithPhone,
        loginWithGoogle,
        logout,
        updateTeacherInfo,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
