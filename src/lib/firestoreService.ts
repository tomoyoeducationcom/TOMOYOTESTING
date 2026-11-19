import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ADMIN_WHATSAPP_TARGET,
  AcademicStatus,
  AnnouncementItem,
  BranchId,
  BranchLocation,
  ChildGender,
  ChildRegistrationDraft,
  GalleryItem,
  INITIAL_ABOUT,
  INITIAL_BRANCHES,
  INITIAL_CONTACT,
  INITIAL_FOUNDER,
  INITIAL_PACKAGES,
  INITIAL_TEACHERS,
  LearningPackage,
  LegacyStudentMigrationDraft,
  NotificationLogRecord,
  NotificationType,
  OfflineRegistrationDraft,
  PackageId,
  PaymentRecord,
  PaymentStatus,
  RegistrationStatus,
  ScheduleItem,
  SiteContentSection,
  StudentRecord,
  TeacherProfile,
  computeNextMonthlyDueDate,
  getPackagePriceForBranch,
  serializeArchiveMetaNotes,
} from './domain';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface PublicSiteBundle {
  packages: LearningPackage[];
  branches: BranchLocation[];
  teachers: TeacherProfile[];
  about: SiteContentSection;
  founder: SiteContentSection;
  contact: SiteContentSection;
  gallery: GalleryItem[];
  announcements: AnnouncementItem[];
  schedules: ScheduleItem[];
}

export async function fetchPublicSiteBundle(): Promise<PublicSiteBundle> {
  const [
    pkgSnap,
    branchSnap,
    teacherSnap,
    siteSnap,
    gallerySnap,
    announcementSnap,
    scheduleSnap,
  ] = await Promise.all([
    getDocs(query(collection(db, 'packages'), where('isPublished', '==', true))).catch(() => null),
    getDocs(query(collection(db, 'branches'), where('isPublished', '==', true))).catch(() => null),
    getDocs(query(collection(db, 'teachers'), where('isPublished', '==', true))).catch(() => null),
    getDocs(query(collection(db, 'siteContent'), where('isPublished', '==', true))).catch(
      () => null
    ),
    getDocs(query(collection(db, 'gallery'), where('isPublished', '==', true))).catch(() => null),
    getDocs(query(collection(db, 'announcements'), where('isPublished', '==', true))).catch(
      () => null
    ),
    getDocs(query(collection(db, 'schedules'), where('isPublished', '==', true))).catch(() => null),
  ]);

  const packages: LearningPackage[] =
    pkgSnap && !pkgSnap.empty
      ? pkgSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<LearningPackage, 'id'>) }))
          .sort((a, b) => a.order - b.order)
      : INITIAL_PACKAGES;

  const branches: BranchLocation[] =
    branchSnap && !branchSnap.empty
      ? branchSnap.docs
          .map((d) => {
            const raw = d.data() as Omit<BranchLocation, 'id'>;
            const fallback = INITIAL_BRANCHES.find((b) => b.id === d.id || b.slug === raw.slug);
            return {
              id: d.id,
              ...raw,
              latitude: typeof raw.latitude === 'number' ? raw.latitude : fallback?.latitude,
              longitude: typeof raw.longitude === 'number' ? raw.longitude : fallback?.longitude,
            };
          })
          .sort((a, b) => a.order - b.order)
      : INITIAL_BRANCHES;

  const teachers: TeacherProfile[] =
    teacherSnap && !teacherSnap.empty
      ? teacherSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<TeacherProfile, 'id'>) }))
          .sort((a, b) => a.order - b.order)
      : INITIAL_TEACHERS;

  const siteMap = new Map<string, SiteContentSection>();
  if (siteSnap && !siteSnap.empty) {
    siteSnap.docs.forEach((d) => {
      siteMap.set(d.id, { id: d.id, ...(d.data() as Omit<SiteContentSection, 'id'>) });
    });
  }

  const gallery: GalleryItem[] =
    gallerySnap && !gallerySnap.empty
      ? gallerySnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GalleryItem, 'id'>) }))
      : [];

  const announcements: AnnouncementItem[] =
    announcementSnap && !announcementSnap.empty
      ? announcementSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AnnouncementItem, 'id'>),
        }))
      : [];

  const schedules: ScheduleItem[] =
    scheduleSnap && !scheduleSnap.empty
      ? scheduleSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ScheduleItem, 'id'>) }))
      : [];

  return {
    packages,
    branches,
    teachers,
    about: siteMap.get('about') || INITIAL_ABOUT,
    founder: siteMap.get('founder') || INITIAL_FOUNDER,
    contact: siteMap.get('contact') || INITIAL_CONTACT,
    gallery,
    announcements,
    schedules,
  };
}

export function subscribePublishedPackagesAndBranches(
  onPackages: (packages: LearningPackage[]) => void,
  onBranches: (branches: BranchLocation[]) => void
): () => void {
  const unsubPkg = onSnapshot(
    query(collection(db, 'packages'), where('isPublished', '==', true)),
    (snap) => {
      if (!snap.empty) {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<LearningPackage, 'id'>) }))
          .sort((a, b) => a.order - b.order);
        onPackages(list);
      }
    },
    () => {
      // Fallback already populated by fetchPublicSiteBundle
    }
  );

  const unsubBranch = onSnapshot(
    query(collection(db, 'branches'), where('isPublished', '==', true)),
    (snap) => {
      if (!snap.empty) {
        const list = snap.docs
          .map((d) => {
            const raw = d.data() as Omit<BranchLocation, 'id'>;
            const fallback = INITIAL_BRANCHES.find((b) => b.id === d.id || b.slug === raw.slug);
            return {
              id: d.id,
              ...raw,
              latitude: typeof raw.latitude === 'number' ? raw.latitude : fallback?.latitude,
              longitude: typeof raw.longitude === 'number' ? raw.longitude : fallback?.longitude,
            };
          })
          .sort((a, b) => a.order - b.order);
        onBranches(list);
      }
    },
    () => {
      // Fallback already populated by fetchPublicSiteBundle
    }
  );

  return () => {
    unsubPkg();
    unsubBranch();
  };
}

export async function fetchParentProfile(uid: string) {
  const path = `parents/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'parents', uid));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function upsertParentProfile(params: {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  photoURL?: string;
}) {
  const path = `parents/${params.uid}`;
  try {
    const ref = doc(db, 'parents', params.uid);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      const payload: Record<string, unknown> = {
        uid: params.uid,
        displayName: params.displayName.trim().slice(0, 120),
        email: params.email.trim().slice(0, 160),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (params.phone?.trim()) payload.phone = params.phone.trim().slice(0, 30);
      if (params.photoURL?.trim()) payload.photoURL = params.photoURL.trim().slice(0, 500);
      await setDoc(ref, payload);
    } else {
      const updates: Record<string, unknown> = {
        displayName: params.displayName.trim().slice(0, 120),
        updatedAt: serverTimestamp(),
      };
      if (params.phone !== undefined) updates.phone = params.phone.trim().slice(0, 30);
      if (params.photoURL !== undefined) updates.photoURL = params.photoURL.trim().slice(0, 500);
      await updateDoc(ref, updates);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchParentStudents(uid: string): Promise<StudentRecord[]> {
  const path = 'students';
  try {
    const q = query(collection(db, 'students'), where('parentId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<StudentRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchParentPayments(uid: string): Promise<PaymentRecord[]> {
  const path = 'payments';
  try {
    const q = query(collection(db, 'payments'), where('parentId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PaymentRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function submitMultiChildRegistration(params: {
  uid: string;
  idToken: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  photoURL?: string;
  children: ChildRegistrationDraft[];
  packages: LearningPackage[];
  branches: BranchLocation[];
}): Promise<{
  createdIds: string[];
  notificationResults: Array<{
    registrationId: string;
    status: 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate';
    detail: string;
  }>;
}> {
  await upsertParentProfile({
    uid: params.uid,
    displayName: params.parentName,
    email: params.parentEmail,
    phone: params.parentPhone,
    photoURL: params.photoURL,
  });

  const now = new Date();
  const registeredAtIso = now.toISOString();
  const nextDueAtIso = computeNextMonthlyDueDate(now).toISOString();

  const batch = writeBatch(db);
  const createdEntries: Array<{
    registrationId: string;
    childName: string;
    childGender: string;
    gradeLevel: string;
    packageName: string;
    branchName: string;
    billingAmount: number | null;
    registeredAtIso: string;
    nextDueAtIso: string;
  }> = [];

  for (const child of params.children) {
    const pkg =
      params.packages.find((p) => p.slug === child.packageId) ||
      INITIAL_PACKAGES.find((p) => p.slug === child.packageId) ||
      INITIAL_PACKAGES[0];
    const branch =
      params.branches.find((b) => b.slug === child.branchId) ||
      INITIAL_BRANCHES.find((b) => b.slug === child.branchId) ||
      INITIAL_BRANCHES[0];

    const configuredPrice = getPackagePriceForBranch(pkg, branch.slug);

    const studentRef = doc(collection(db, 'students'));
    const payload: Record<string, unknown> = {
      parentId: params.uid,
      parentName: params.parentName.trim().slice(0, 120),
      parentEmail: params.parentEmail.trim().slice(0, 160),
      parentPhone: params.parentPhone.trim().slice(0, 30),
      childName: child.childName.trim().slice(0, 120),
      childPhotoUrl: child.childPhotoUrl.trim().slice(0, 500),
      childGender: child.childGender,
      gradeLevel: child.gradeLevel.trim().slice(0, 60),
      packageId: pkg.slug,
      packageName: `${pkg.title} (${pkg.programType})`.slice(0, 120),
      branchId: branch.slug,
      branchName: branch.name.slice(0, 120),
      registrationChannel: 'online',
      registeredAtIso,
      nextDueAtIso,
      status: 'pending' satisfies RegistrationStatus,
      academicStatus: 'menunggu' satisfies AcademicStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (typeof configuredPrice === 'number') {
      payload.billingAmount = configuredPrice;
    }
    if (child.notes?.trim()) {
      payload.notes = child.notes.trim().slice(0, 500);
    }

    batch.set(studentRef, payload);
    createdEntries.push({
      registrationId: studentRef.id,
      childName: String(payload.childName),
      childGender: String(payload.childGender),
      gradeLevel: String(payload.gradeLevel),
      packageName: String(payload.packageName),
      branchName: String(payload.branchName),
      billingAmount: configuredPrice,
      registeredAtIso,
      nextDueAtIso,
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'students');
  }

  let notificationResults: Array<{
    registrationId: string;
    status: 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate';
    detail: string;
    target?: string;
    messagePreview?: string;
  }> = [];

  try {
    const resp = await fetch('/api/notify/registration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Firebase-Token': params.idToken,
      },
      body: JSON.stringify({
        parentName: params.parentName.trim(),
        parentPhone: params.parentPhone.trim(),
        registrations: createdEntries,
      }),
    });

    if (resp.ok) {
      const data = (await resp.json()) as { results?: typeof notificationResults };
      notificationResults = data.results || [];
    } else {
      notificationResults = createdEntries.map((e) => ({
        registrationId: e.registrationId,
        status: 'failed' as const,
        detail: `Server notifikasi merespons HTTP ${resp.status}.`,
      }));
    }
  } catch (err) {
    notificationResults = createdEntries.map((e) => ({
      registrationId: e.registrationId,
      status: 'failed' as const,
      detail: err instanceof Error ? err.message : 'Gagal menghubungi server notifikasi.',
    }));
  }

  for (const res of notificationResults) {
    try {
      const logRef = doc(collection(db, 'notificationLogs'));
      await setDoc(logRef, {
        registrationId: res.registrationId.slice(0, 128),
        parentId: params.uid,
        type: 'registration' satisfies NotificationType,
        target: (res.target || ADMIN_WHATSAPP_TARGET).slice(0, 30),
        status: res.status,
        messagePreview: (res.messagePreview || 'Notifikasi pendaftaran siswa baru').slice(0, 500),
        providerDetail: res.detail.slice(0, 400),
        createdAt: serverTimestamp(),
      });
    } catch {
      // Non-blocking audit log write
    }
  }

  return {
    createdIds: createdEntries.map((e) => e.registrationId),
    notificationResults: notificationResults.map((r) => ({
      registrationId: r.registrationId,
      status: r.status,
      detail: r.detail,
    })),
  };
}

export async function updatePendingChildByParent(
  studentId: string,
  updates: {
    childName: string;
    childPhotoUrl?: string;
    childGender?: ChildGender;
    gradeLevel: string;
    packageId: PackageId;
    packageName: string;
    branchId: BranchId;
    branchName: string;
    billingAmount?: number | null;
    parentPhone: string;
    notes?: string;
  }
) {
  const path = `students/${studentId}`;
  try {
    const payload: Record<string, unknown> = {
      childName: updates.childName.trim().slice(0, 120),
      gradeLevel: updates.gradeLevel.trim().slice(0, 60),
      packageId: updates.packageId,
      packageName: updates.packageName.trim().slice(0, 120),
      branchId: updates.branchId,
      branchName: updates.branchName.trim().slice(0, 120),
      parentPhone: updates.parentPhone.trim().slice(0, 30),
      updatedAt: serverTimestamp(),
    };
    if (updates.childPhotoUrl?.trim()) {
      payload.childPhotoUrl = updates.childPhotoUrl.trim().slice(0, 500);
    }
    if (updates.childGender) {
      payload.childGender = updates.childGender;
    }
    if (typeof updates.billingAmount === 'number' && updates.billingAmount >= 0) {
      payload.billingAmount = updates.billingAmount;
    } else if (updates.billingAmount === null) {
      payload.billingAmount = deleteField();
    }
    if (updates.notes !== undefined) {
      payload.notes = updates.notes.trim().slice(0, 500);
    }
    await updateDoc(doc(db, 'students', studentId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==================== ADMIN OPERATIONS ====================

export async function fetchAdminBundle() {
  try {
    const [
      studentsSnap,
      parentsSnap,
      packagesSnap,
      branchesSnap,
      teachersSnap,
      siteSnap,
      gallerySnap,
      announcementsSnap,
      schedulesSnap,
      paymentsSnap,
      logsSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'parents')),
      getDocs(query(collection(db, 'packages'), orderBy('order', 'asc'))),
      getDocs(query(collection(db, 'branches'), orderBy('order', 'asc'))),
      getDocs(query(collection(db, 'teachers'), orderBy('order', 'asc'))),
      getDocs(collection(db, 'siteContent')),
      getDocs(collection(db, 'gallery')),
      getDocs(collection(db, 'announcements')),
      getDocs(collection(db, 'schedules')),
      getDocs(collection(db, 'payments')),
      getDocs(collection(db, 'notificationLogs')),
    ]);

    const siteMap = new Map<string, SiteContentSection>();
    siteSnap.docs.forEach((d) => {
      siteMap.set(d.id, { id: d.id, ...(d.data() as Omit<SiteContentSection, 'id'>) });
    });

    return {
      students: studentsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<StudentRecord, 'id'>),
      })),
      parents: parentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      packages: packagesSnap.empty
        ? INITIAL_PACKAGES
        : packagesSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<LearningPackage, 'id'>),
          })),
      branches: branchesSnap.empty
        ? INITIAL_BRANCHES
        : branchesSnap.docs.map((d) => {
            const raw = d.data() as Omit<BranchLocation, 'id'>;
            const fallback = INITIAL_BRANCHES.find((b) => b.id === d.id || b.slug === raw.slug);
            return {
              id: d.id,
              ...raw,
              latitude: typeof raw.latitude === 'number' ? raw.latitude : fallback?.latitude,
              longitude: typeof raw.longitude === 'number' ? raw.longitude : fallback?.longitude,
            };
          }),
      teachers: teachersSnap.empty
        ? INITIAL_TEACHERS
        : teachersSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<TeacherProfile, 'id'>),
          })),
      about: siteMap.get('about') || INITIAL_ABOUT,
      founder: siteMap.get('founder') || INITIAL_FOUNDER,
      contact: siteMap.get('contact') || INITIAL_CONTACT,
      gallery: gallerySnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<GalleryItem, 'id'>),
      })),
      announcements: announcementsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AnnouncementItem, 'id'>),
      })),
      schedules: schedulesSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ScheduleItem, 'id'>),
      })),
      payments: paymentsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PaymentRecord, 'id'>),
      })),
      notificationLogs: logsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<NotificationLogRecord, 'id'>),
      })),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin_bundle');
  }
}

export async function adminCreateOfflineStudent(params: {
  draft: OfflineRegistrationDraft;
  packages: LearningPackage[];
  branches: BranchLocation[];
  adminUid: string;
  idToken: string;
}): Promise<{
  studentId: string;
  paymentId: string;
  waStatus: 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate';
  waDetail: string;
  nextDueAtIso: string;
}> {
  const { draft, packages, branches, adminUid, idToken } = params;
  const pkg =
    packages.find((p) => p.slug === draft.packageId) ||
    INITIAL_PACKAGES.find((p) => p.slug === draft.packageId) ||
    INITIAL_PACKAGES[0];
  const branch =
    branches.find((b) => b.slug === draft.branchId) ||
    INITIAL_BRANCHES.find((b) => b.slug === draft.branchId) ||
    INITIAL_BRANCHES[0];

  const baseDate =
    draft.registeredAtLocal && !Number.isNaN(new Date(draft.registeredAtLocal).getTime())
      ? new Date(draft.registeredAtLocal)
      : new Date();
  const registeredAtIso = baseDate.toISOString();
  const nextDueAtIso = computeNextMonthlyDueDate(baseDate).toISOString();
  const billingAmount = Math.max(0, Number(draft.billingAmount) || 0);
  const packageName = `${pkg.title} (${pkg.programType})`.slice(0, 120);

  const studentRef = doc(collection(db, 'students'));
  const paymentRef = doc(collection(db, 'payments'));

  const studentPayload: Record<string, unknown> = {
    parentId: 'offline_admin',
    parentName: draft.parentName.trim().slice(0, 120),
    parentEmail: '',
    parentPhone: draft.parentPhone.trim().slice(0, 30),
    childName: draft.childName.trim().slice(0, 120),
    childPhotoUrl: draft.childPhotoUrl.trim().slice(0, 500),
    childGender: draft.childGender,
    gradeLevel: draft.gradeLevel.trim().slice(0, 60),
    packageId: pkg.slug,
    packageName,
    branchId: branch.slug,
    branchName: branch.name.slice(0, 120),
    registrationChannel: 'offline',
    billingAmount,
    initialPaymentStatus: draft.initialPaymentStatus,
    registeredAtIso,
    nextDueAtIso,
    status: 'approved' satisfies RegistrationStatus,
    academicStatus: 'aktif' satisfies AcademicStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (draft.notes?.trim()) {
    studentPayload.notes = draft.notes.trim().slice(0, 500);
  }

  const periodMonthYear = baseDate.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const paymentPayload: Record<string, unknown> = {
    studentId: studentRef.id,
    parentId: 'offline_admin',
    childName: draft.childName.trim().slice(0, 120),
    amount: billingAmount,
    method: (draft.paymentMethod || 'Tunai').trim().slice(0, 60),
    periodLabel: `Pendaftaran Offline (${periodMonthYear})`.slice(0, 80),
    dueDateIso: nextDueAtIso,
    status: draft.initialPaymentStatus,
    notes: (draft.notes?.trim() || 'Pendaftaran offline langsung oleh admin').slice(0, 500),
    recordedBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(studentRef, studentPayload);
  batch.set(paymentRef, paymentPayload);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'students');
  }

  type WaDeliveryStatus = 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate';
  let waStatus: WaDeliveryStatus = 'unconfigured';
  let waDetail = 'Menunggu status pengiriman WhatsApp.';
  let messagePreview = 'Notifikasi pendaftaran offline admin';
  let target = ADMIN_WHATSAPP_TARGET;

  try {
    const resp = await fetch('/api/admin/notify/offline-registration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Firebase-Token': idToken,
      },
      body: JSON.stringify({
        registrationId: studentRef.id,
        parentId: 'offline_admin',
        parentName: draft.parentName.trim(),
        parentPhone: draft.parentPhone.trim(),
        childName: draft.childName.trim(),
        childGender: draft.childGender,
        gradeLevel: draft.gradeLevel.trim(),
        packageName,
        branchName: branch.name,
        billingAmount,
        initialPaymentStatus: draft.initialPaymentStatus,
        registeredAtIso,
        nextDueAtIso,
      }),
    });
    if (resp.ok) {
      const json = (await resp.json()) as {
        status?: WaDeliveryStatus;
        detail?: string;
        target?: string;
        messagePreview?: string;
        dueTriggered?: Array<{
          studentId: string;
          parentId: string;
          status: WaDeliveryStatus;
          detail: string;
          target: string;
          messagePreview: string;
        }>;
      };
      waStatus = json.status || 'failed';
      waDetail = json.detail || waDetail;
      target = json.target || target;
      messagePreview = json.messagePreview || messagePreview;

      if (Array.isArray(json.dueTriggered)) {
        for (const item of json.dueTriggered) {
          await adminCreateNotificationLog({
            registrationId: item.studentId,
            parentId: item.parentId || 'offline_admin',
            type: 'payment_due',
            target: item.target || ADMIN_WHATSAPP_TARGET,
            status: item.status,
            messagePreview: item.messagePreview,
            providerDetail: item.detail,
          });
          if (item.studentId === studentRef.id && item.status === 'sent') {
            await updateDoc(studentRef, {
              lastDueNotifiedIso: new Date().toISOString(),
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
        }
      }
    } else {
      waStatus = 'failed';
      waDetail = `Backend merespons HTTP ${resp.status}.`;
    }
  } catch (err) {
    waStatus = 'failed';
    waDetail = err instanceof Error ? err.message : 'Gagal menghubungi server notifikasi.';
  }

  await adminCreateNotificationLog({
    registrationId: studentRef.id,
    parentId: 'offline_admin',
    type: 'offline_registration',
    target,
    status: waStatus,
    messagePreview,
    providerDetail: waDetail,
  });

  return {
    studentId: studentRef.id,
    paymentId: paymentRef.id,
    waStatus,
    waDetail,
    nextDueAtIso,
  };
}

export async function adminCreateMigratedStudent(params: {
  draft: LegacyStudentMigrationDraft;
  packages: LearningPackage[];
  branches: BranchLocation[];
  adminUid: string;
  idToken: string;
}): Promise<{
  studentId: string;
  paymentId: string;
  usedLegacyRulesFallback: boolean;
  waStatus?: 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate';
  waDetail?: string;
  nextDueAtIso: string;
}> {
  const { draft, packages, branches, adminUid, idToken } = params;
  const pkg =
    packages.find((p) => p.slug === draft.packageId) ||
    INITIAL_PACKAGES.find((p) => p.slug === draft.packageId) ||
    INITIAL_PACKAGES[0];
  const branch =
    branches.find((b) => b.slug === draft.branchId) ||
    INITIAL_BRANCHES.find((b) => b.slug === draft.branchId) ||
    INITIAL_BRANCHES[0];

  const baseDate =
    draft.registeredAtLocal && !Number.isNaN(new Date(draft.registeredAtLocal).getTime())
      ? new Date(draft.registeredAtLocal)
      : new Date();
  const registeredAtIso = baseDate.toISOString();
  const nextDueDate =
    draft.nextDueAtLocal && !Number.isNaN(new Date(draft.nextDueAtLocal).getTime())
      ? new Date(draft.nextDueAtLocal)
      : computeNextMonthlyDueDate(baseDate);
  const nextDueAtIso = nextDueDate.toISOString();
  const billingAmount = Math.max(0, Number(draft.billingAmount) || 0);
  const packageName = `${pkg.title} (${pkg.programType})`.slice(0, 120);
  const cleanGrade =
    draft.gradeLevel.trim().length === 1
      ? `Kelas ${draft.gradeLevel.trim()}`
      : draft.gradeLevel.trim().slice(0, 60);

  const studentRef = doc(collection(db, 'students'));
  const paymentRef = doc(collection(db, 'payments'));

  const structuredNotes = serializeArchiveMetaNotes({
    birthDate: draft.birthDate,
    schoolOrigin: draft.schoolOrigin,
    studentAddress: draft.studentAddress,
    userNotes: draft.notes,
    isArchive: true,
  });

  const modernStudentPayload: Record<string, unknown> = {
    parentId: 'legacy_archive',
    parentName: draft.parentName.trim().slice(0, 120),
    parentEmail: '',
    parentPhone: draft.parentPhone.trim().slice(0, 30),
    childName: draft.childName.trim().slice(0, 120),
    childGender: draft.childGender,
    gradeLevel: cleanGrade,
    packageId: pkg.slug,
    packageName,
    branchId: branch.slug,
    branchName: branch.name.slice(0, 120),
    registrationChannel: 'migration',
    billingAmount,
    initialPaymentStatus: draft.initialPaymentStatus,
    registeredAtIso,
    nextDueAtIso,
    status: 'approved' satisfies RegistrationStatus,
    academicStatus: draft.academicStatus || ('aktif' satisfies AcademicStatus),
    notes: structuredNotes || '[ARSIP]',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (draft.childPhotoUrl.trim()) {
    modernStudentPayload.childPhotoUrl = draft.childPhotoUrl.trim().slice(0, 500);
  }
  if (draft.birthDate.trim()) {
    modernStudentPayload.birthDate = draft.birthDate.trim().slice(0, 20);
  }
  if (draft.schoolOrigin?.trim()) {
    modernStudentPayload.schoolOrigin = draft.schoolOrigin.trim().slice(0, 120);
  }
  if (draft.studentAddress?.trim()) {
    modernStudentPayload.studentAddress = draft.studentAddress.trim().slice(0, 250);
  }

  const periodMonthYear = baseDate.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const paymentPayload: Record<string, unknown> = {
    studentId: studentRef.id,
    parentId: 'legacy_archive',
    childName: draft.childName.trim().slice(0, 120),
    amount: billingAmount,
    method: (draft.paymentMethod || 'Tunai').trim().slice(0, 60),
    periodLabel: (
      draft.paymentPeriodLabel?.trim() || `Pindah Data Arsip (${periodMonthYear})`
    ).slice(0, 80),
    dueDateIso: nextDueAtIso,
    status: draft.initialPaymentStatus,
    notes: (
      draft.notes?.trim() ||
      `Migrasi berkas lama (Masuk: ${baseDate.toLocaleDateString('id-ID')})`
    ).slice(0, 500),
    recordedBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  let usedLegacyRulesFallback = false;
  try {
    const batch = writeBatch(db);
    batch.set(studentRef, modernStudentPayload);
    batch.set(paymentRef, paymentPayload);
    await batch.commit();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isPermError =
      msg.toLowerCase().includes('permission') ||
      (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'permission-denied');
    if (!isPermError) {
      handleFirestoreError(err, OperationType.CREATE, 'students');
    }

    // Backward-compatible write if live Firestore project still runs rules without birthDate/migration keys
    usedLegacyRulesFallback = true;
    const compatStudentPayload: Record<string, unknown> = {
      parentId: 'legacy_archive',
      parentName: draft.parentName.trim().slice(0, 120),
      parentEmail: '',
      parentPhone: draft.parentPhone.trim().slice(0, 30),
      childName: draft.childName.trim().slice(0, 120),
      childGender: draft.childGender,
      gradeLevel: cleanGrade,
      packageId: pkg.slug,
      packageName,
      branchId: branch.slug,
      branchName: branch.name.slice(0, 120),
      registrationChannel: 'offline',
      billingAmount,
      initialPaymentStatus: draft.initialPaymentStatus,
      registeredAtIso,
      nextDueAtIso,
      status: 'approved' satisfies RegistrationStatus,
      academicStatus: draft.academicStatus || ('aktif' satisfies AcademicStatus),
      notes: structuredNotes || '[ARSIP]',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (draft.childPhotoUrl.trim()) {
      compatStudentPayload.childPhotoUrl = draft.childPhotoUrl.trim().slice(0, 500);
    }

    try {
      const fallbackBatch = writeBatch(db);
      fallbackBatch.set(studentRef, compatStudentPayload);
      fallbackBatch.set(paymentRef, paymentPayload);
      await fallbackBatch.commit();
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.CREATE, 'students');
    }
  }

  let waStatus: 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate' | undefined;
  let waDetail: string | undefined;

  if (draft.notifyWhatsappOnSave) {
    try {
      const resp = await fetch('/api/admin/notify/offline-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-Token': idToken,
        },
        body: JSON.stringify({
          registrationId: studentRef.id,
          parentId: 'legacy_archive',
          parentName: draft.parentName.trim(),
          parentPhone: draft.parentPhone.trim(),
          childName: draft.childName.trim(),
          childGender: draft.childGender,
          gradeLevel: cleanGrade,
          packageName,
          branchName: branch.name,
          billingAmount,
          initialPaymentStatus: draft.initialPaymentStatus,
          registeredAtIso,
          nextDueAtIso,
          channel: 'migration',
        }),
      });
      if (resp.ok) {
        const json = (await resp.json()) as {
          status?: 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate';
          detail?: string;
          target?: string;
          messagePreview?: string;
        };
        waStatus = json.status || 'failed';
        waDetail = json.detail;
        await adminCreateNotificationLog({
          registrationId: studentRef.id,
          parentId: 'legacy_archive',
          type: 'offline_registration',
          target: json.target || ADMIN_WHATSAPP_TARGET,
          status: waStatus,
          messagePreview: json.messagePreview || `Pindah data arsip ${draft.childName}`,
          providerDetail: json.detail || '',
        });
      }
    } catch (waErr) {
      waStatus = 'failed';
      waDetail = waErr instanceof Error ? waErr.message : 'Gagal mengirim WA.';
    }
  }

  return {
    studentId: studentRef.id,
    paymentId: paymentRef.id,
    usedLegacyRulesFallback,
    waStatus,
    waDetail,
    nextDueAtIso,
  };
}

export async function adminCreateNotificationLog(entry: {
  registrationId: string;
  parentId: string;
  type: NotificationType;
  target: string;
  status: 'sent' | 'failed' | 'unconfigured' | 'skipped_duplicate';
  messagePreview: string;
  providerDetail: string;
}) {
  try {
    const logRef = doc(collection(db, 'notificationLogs'));
    await setDoc(logRef, {
      registrationId: entry.registrationId.slice(0, 128),
      parentId: (entry.parentId || 'offline_admin').slice(0, 128),
      type: entry.type,
      target: (entry.target || ADMIN_WHATSAPP_TARGET).slice(0, 30),
      status: entry.status,
      messagePreview: (entry.messagePreview || 'Notifikasi WhatsApp').slice(0, 500),
      providerDetail: (entry.providerDetail || '').slice(0, 400),
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking audit log write
  }
}

export async function adminRecordDueNotificationSent(studentId: string, notifiedIso: string) {
  const path = `students/${studentId}`;
  try {
    await updateDoc(doc(db, 'students', studentId), {
      lastDueNotifiedIso: notifiedIso,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminConfirmStudentDuePayment(params: {
  student: StudentRecord;
  idToken: string;
  adminUid: string;
  recordPayment?: {
    amount: number;
    method: string;
    status: PaymentStatus;
    periodLabel: string;
    notes?: string;
  };
}): Promise<{ nextDueAtIso: string; confirmedIso: string }> {
  const { student, idToken, adminUid, recordPayment } = params;
  const now = new Date();
  const confirmedIso = now.toISOString();
  const currentDue =
    student.nextDueAtIso && !Number.isNaN(new Date(student.nextDueAtIso).getTime())
      ? new Date(student.nextDueAtIso)
      : now;
  const nextDueAtIso = computeNextMonthlyDueDate(currentDue).toISOString();

  const batch = writeBatch(db);
  batch.update(doc(db, 'students', student.id), {
    dueConfirmedIso: confirmedIso,
    nextDueAtIso,
    ...(recordPayment ? { initialPaymentStatus: recordPayment.status } : {}),
    updatedAt: serverTimestamp(),
  });

  if (recordPayment) {
    const payRef = doc(collection(db, 'payments'));
    batch.set(payRef, {
      studentId: student.id,
      parentId: student.parentId || 'offline_admin',
      childName: student.childName.slice(0, 120),
      amount: Number(recordPayment.amount) || 0,
      method: (recordPayment.method || 'Tunai').trim().slice(0, 60),
      periodLabel: recordPayment.periodLabel.trim().slice(0, 80),
      dueDateIso: nextDueAtIso,
      status: recordPayment.status,
      notes: (recordPayment.notes || 'Konfirmasi pembayaran jatuh tempo oleh admin').slice(0, 500),
      recordedBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${student.id}`);
  }

  try {
    await fetch('/api/admin/due-reminders/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Firebase-Token': idToken,
      },
      body: JSON.stringify({
        studentId: student.id,
        nextDueAtIso,
        confirmedAtIso: confirmedIso,
      }),
    });
  } catch {
    // Non-blocking sync with local due-reminders queue
  }

  return { nextDueAtIso, confirmedIso };
}

export async function adminUpdateStudent(
  studentId: string,
  updates: Partial<{
    childName: string;
    birthDate: string;
    schoolOrigin: string;
    studentAddress: string;
    childPhotoUrl: string;
    childGender: ChildGender;
    gradeLevel: string;
    packageId: PackageId;
    packageName: string;
    branchId: BranchId;
    branchName: string;
    billingAmount: number;
    initialPaymentStatus: PaymentStatus;
    registeredAtIso: string;
    nextDueAtIso: string;
    status: RegistrationStatus;
    academicStatus: AcademicStatus;
    parentName: string;
    parentPhone: string;
    notes: string;
    adminNotes: string;
  }>
) {
  const path = `students/${studentId}`;
  const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.childName !== undefined) clean.childName = updates.childName.trim().slice(0, 120);
  if (updates.birthDate !== undefined && updates.birthDate.trim()) {
    clean.birthDate = updates.birthDate.trim().slice(0, 20);
  }
  if (updates.schoolOrigin !== undefined && updates.schoolOrigin.trim()) {
    clean.schoolOrigin = updates.schoolOrigin.trim().slice(0, 120);
  }
  if (updates.studentAddress !== undefined && updates.studentAddress.trim()) {
    clean.studentAddress = updates.studentAddress.trim().slice(0, 250);
  }
  if (updates.childPhotoUrl !== undefined)
    clean.childPhotoUrl = updates.childPhotoUrl.trim().slice(0, 500);
  if (updates.childGender !== undefined) clean.childGender = updates.childGender;
  if (updates.gradeLevel !== undefined) clean.gradeLevel = updates.gradeLevel.trim().slice(0, 60);
  if (updates.packageId !== undefined) clean.packageId = updates.packageId;
  if (updates.packageName !== undefined)
    clean.packageName = updates.packageName.trim().slice(0, 120);
  if (updates.branchId !== undefined) clean.branchId = updates.branchId;
  if (updates.branchName !== undefined) clean.branchName = updates.branchName.trim().slice(0, 120);
  if (updates.billingAmount !== undefined && Number.isFinite(updates.billingAmount)) {
    clean.billingAmount = Math.max(0, Number(updates.billingAmount));
  }
  if (updates.initialPaymentStatus !== undefined) {
    clean.initialPaymentStatus = updates.initialPaymentStatus;
  }
  if (updates.registeredAtIso !== undefined) clean.registeredAtIso = updates.registeredAtIso;
  if (updates.nextDueAtIso !== undefined) clean.nextDueAtIso = updates.nextDueAtIso;
  if (updates.status !== undefined) clean.status = updates.status;
  if (updates.academicStatus !== undefined) clean.academicStatus = updates.academicStatus;
  if (updates.parentName !== undefined)
    clean.parentName = updates.parentName.trim().slice(0, 120);
  if (updates.parentPhone !== undefined)
    clean.parentPhone = updates.parentPhone.trim().slice(0, 30);
  if (updates.notes !== undefined) clean.notes = updates.notes.trim().slice(0, 500);
  if (updates.adminNotes !== undefined) clean.adminNotes = updates.adminNotes.trim().slice(0, 500);

  try {
    await updateDoc(doc(db, 'students', studentId), clean);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isPermError =
      msg.toLowerCase().includes('permission') ||
      (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'permission-denied');
    if (isPermError && (clean.birthDate || clean.schoolOrigin || clean.studentAddress || clean.parentName)) {
      const compatClean: Record<string, unknown> = { ...clean };
      delete compatClean.birthDate;
      delete compatClean.schoolOrigin;
      delete compatClean.studentAddress;
      delete compatClean.parentName;
      compatClean.notes = serializeArchiveMetaNotes({
        birthDate: updates.birthDate,
        schoolOrigin: updates.schoolOrigin,
        studentAddress: updates.studentAddress,
        userNotes: updates.notes,
        isArchive: Boolean(updates.birthDate || updates.schoolOrigin || updates.studentAddress),
      });
      try {
        await updateDoc(doc(db, 'students', studentId), compatClean);
        return;
      } catch (compatErr) {
        handleFirestoreError(compatErr, OperationType.UPDATE, path);
      }
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminDeleteStudentSafely(studentId: string) {
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminSavePackage(pkg: LearningPackage) {
  const path = `packages/${pkg.id}`;
  try {
    const hasBranchPusat =
      typeof pkg.pricePusat === 'number' && Number.isFinite(pkg.pricePusat) && pkg.pricePusat >= 0;
    const hasBranchCabang =
      typeof pkg.priceCabang === 'number' && Number.isFinite(pkg.priceCabang) && pkg.priceCabang >= 0;
    const hasAnyBranchPrice = hasBranchPusat || hasBranchCabang;

    const payload: Record<string, unknown> = {
      slug: pkg.slug,
      order: pkg.order,
      title: pkg.title.trim().slice(0, 100),
      levelRange: pkg.levelRange.trim().slice(0, 100),
      programType: pkg.programType.trim().slice(0, 100),
      subjects: pkg.subjects.map((s) => s.trim()).filter(Boolean).slice(0, 20),
      isPublished: pkg.isPublished,
      updatedAt: serverTimestamp(),
    };
    if (!hasAnyBranchPrice && pkg.priceLabel && pkg.priceLabel.trim()) {
      payload.priceLabel = pkg.priceLabel.trim().slice(0, 80);
    }
    if (!hasAnyBranchPrice && pkg.priceNote && pkg.priceNote.trim()) {
      payload.priceNote = pkg.priceNote.trim().slice(0, 200);
    }
    if (hasBranchPusat) {
      payload.pricePusat = Math.round(pkg.pricePusat!);
    }
    if (hasBranchCabang) {
      payload.priceCabang = Math.round(pkg.priceCabang!);
    }
    if (pkg.pricePusatNote && pkg.pricePusatNote.trim()) {
      payload.pricePusatNote = pkg.pricePusatNote.trim().slice(0, 200);
    }
    if (pkg.priceCabangNote && pkg.priceCabangNote.trim()) {
      payload.priceCabangNote = pkg.priceCabangNote.trim().slice(0, 200);
    }
    if (pkg.description && pkg.description.trim()) {
      payload.description = pkg.description.trim().slice(0, 600);
    }
    await setDoc(doc(db, 'packages', pkg.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminSaveBranch(branch: BranchLocation) {
  const path = `branches/${branch.id}`;
  try {
    const payload: Record<string, unknown> = {
      slug: branch.slug,
      order: branch.order,
      name: branch.name.trim().slice(0, 150),
      roleLabel: branch.roleLabel.trim().slice(0, 40),
      mapsUrl: branch.mapsUrl.trim().slice(0, 500),
      isPublished: branch.isPublished,
      updatedAt: serverTimestamp(),
    };
    if (typeof branch.latitude === 'number' && !Number.isNaN(branch.latitude)) {
      payload.latitude = branch.latitude;
    }
    if (typeof branch.longitude === 'number' && !Number.isNaN(branch.longitude)) {
      payload.longitude = branch.longitude;
    }
    await setDoc(doc(db, 'branches', branch.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminSaveTeacher(teacher: TeacherProfile) {
  const path = `teachers/${teacher.id}`;
  try {
    const payload: Record<string, unknown> = {
      order: teacher.order,
      name: teacher.name.trim().slice(0, 150),
      isPublished: teacher.isPublished,
      updatedAt: serverTimestamp(),
    };
    if (teacher.description !== undefined) {
      payload.description = teacher.description.trim().slice(0, 600);
    }
    if (teacher.photoUrl !== undefined) {
      payload.photoUrl = teacher.photoUrl.trim().slice(0, 500);
    }
    await setDoc(doc(db, 'teachers', teacher.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminSaveSiteContent(docId: string, data: Partial<SiteContentSection>) {
  const path = `siteContent/${docId}`;
  try {
    const payload: Record<string, unknown> = {
      sectionKey: docId,
      isPublished: data.isPublished ?? true,
      updatedAt: serverTimestamp(),
    };
    const stringFields: Array<keyof SiteContentSection> = [
      'title',
      'subtitle',
      'body',
      'vision',
      'mission',
      'founderName',
      'founderRole',
      'founderPhotoUrl',
      'founderBio',
      'email',
      'whatsappDisplay',
      'whatsappUrl',
      'instagramUrl',
      'facebookUrl',
    ];
    for (const key of stringFields) {
      const val = data[key];
      if (typeof val === 'string') {
        payload[key] = val.trim();
      }
    }
    await setDoc(doc(db, 'siteContent', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminCreateGalleryItem(item: {
  title: string;
  caption?: string;
  imageUrl: string;
  category?: string;
  isPublished: boolean;
}) {
  try {
    const ref = doc(collection(db, 'gallery'));
    const payload: Record<string, unknown> = {
      title: item.title.trim().slice(0, 150),
      imageUrl: item.imageUrl.trim().slice(0, 500),
      isPublished: item.isPublished,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (item.caption?.trim()) payload.caption = item.caption.trim().slice(0, 500);
    if (item.category?.trim()) payload.category = item.category.trim().slice(0, 60);
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'gallery');
  }
}

export async function adminDeleteDoc(collectionName: string, docId: string) {
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminUpdateGalleryItem(
  docId: string,
  updates: Partial<Omit<GalleryItem, 'id' | 'createdAt'>>
) {
  const path = `gallery/${docId}`;
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) clean.title = updates.title.trim().slice(0, 150);
    if (updates.caption !== undefined) clean.caption = updates.caption.trim().slice(0, 500);
    if (updates.category !== undefined) clean.category = updates.category.trim().slice(0, 60);
    if (updates.imageUrl !== undefined) clean.imageUrl = updates.imageUrl.trim().slice(0, 500);
    if (updates.isPublished !== undefined) clean.isPublished = updates.isPublished;
    await updateDoc(doc(db, 'gallery', docId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminCreateAnnouncement(item: {
  title: string;
  content: string;
  imageUrl?: string;
  dateLabel?: string;
  isPublished: boolean;
}) {
  try {
    const ref = doc(collection(db, 'announcements'));
    const payload: Record<string, unknown> = {
      title: item.title.trim().slice(0, 200),
      content: item.content.trim().slice(0, 3000),
      isPublished: item.isPublished,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (item.imageUrl?.trim()) payload.imageUrl = item.imageUrl.trim().slice(0, 500);
    if (item.dateLabel?.trim()) payload.dateLabel = item.dateLabel.trim().slice(0, 60);
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'announcements');
  }
}

export async function adminUpdateAnnouncement(
  docId: string,
  updates: Partial<Omit<AnnouncementItem, 'id' | 'createdAt'>>
) {
  const path = `announcements/${docId}`;
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) clean.title = updates.title.trim().slice(0, 200);
    if (updates.content !== undefined) clean.content = updates.content.trim().slice(0, 3000);
    if (updates.dateLabel !== undefined) clean.dateLabel = updates.dateLabel.trim().slice(0, 60);
    if (updates.imageUrl !== undefined) clean.imageUrl = updates.imageUrl.trim().slice(0, 500);
    if (updates.isPublished !== undefined) clean.isPublished = updates.isPublished;
    await updateDoc(doc(db, 'announcements', docId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminCreateSchedule(item: {
  title: string;
  packageId?: string;
  branchId?: string;
  dayTime: string;
  notes?: string;
  isPublished: boolean;
}) {
  try {
    const ref = doc(collection(db, 'schedules'));
    const payload: Record<string, unknown> = {
      title: item.title.trim().slice(0, 150),
      dayTime: item.dayTime.trim().slice(0, 150),
      isPublished: item.isPublished,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (item.packageId?.trim()) payload.packageId = item.packageId.trim().slice(0, 40);
    if (item.branchId?.trim()) payload.branchId = item.branchId.trim().slice(0, 40);
    if (item.notes?.trim()) payload.notes = item.notes.trim().slice(0, 500);
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'schedules');
  }
}

export async function adminUpdateSchedule(
  docId: string,
  updates: Partial<Omit<ScheduleItem, 'id' | 'createdAt'>>
) {
  const path = `schedules/${docId}`;
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) clean.title = updates.title.trim().slice(0, 150);
    if (updates.dayTime !== undefined) clean.dayTime = updates.dayTime.trim().slice(0, 150);
    if (updates.packageId !== undefined) clean.packageId = updates.packageId.trim().slice(0, 40);
    if (updates.branchId !== undefined) clean.branchId = updates.branchId.trim().slice(0, 40);
    if (updates.notes !== undefined) clean.notes = updates.notes.trim().slice(0, 500);
    if (updates.isPublished !== undefined) clean.isPublished = updates.isPublished;
    await updateDoc(doc(db, 'schedules', docId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminCreatePayment(item: {
  studentId: string;
  parentId: string;
  childName: string;
  amount: number;
  method: string;
  periodLabel: string;
  status: PaymentStatus;
  notes?: string;
  recordedBy: string;
}) {
  try {
    const ref = doc(collection(db, 'payments'));
    const payload: Record<string, unknown> = {
      studentId: item.studentId,
      parentId: item.parentId,
      childName: item.childName.trim().slice(0, 120),
      amount: Number(item.amount) || 0,
      method: item.method.trim().slice(0, 60),
      periodLabel: item.periodLabel.trim().slice(0, 80),
      status: item.status,
      recordedBy: item.recordedBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (item.notes?.trim()) payload.notes = item.notes.trim().slice(0, 500);
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'payments');
  }
}

export async function adminUpdatePayment(
  docId: string,
  updates: Partial<{
    amount: number;
    method: string;
    periodLabel: string;
    status: PaymentStatus;
    notes: string;
  }>
) {
  const path = `payments/${docId}`;
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.amount !== undefined) clean.amount = Number(updates.amount) || 0;
    if (updates.method !== undefined) clean.method = updates.method.trim().slice(0, 60);
    if (updates.periodLabel !== undefined)
      clean.periodLabel = updates.periodLabel.trim().slice(0, 80);
    if (updates.status !== undefined) clean.status = updates.status;
    if (updates.notes !== undefined) clean.notes = updates.notes.trim().slice(0, 500);
    await updateDoc(doc(db, 'payments', docId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
