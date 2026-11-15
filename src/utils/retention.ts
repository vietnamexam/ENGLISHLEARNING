import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export const RETENTION_DAYS = 7;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'object') {
    const obj = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof obj.toMillis === 'function') {
      return obj.toMillis();
    }
    if (typeof obj.seconds === 'number') {
      const ns = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : 0;
      return obj.seconds * 1000 + Math.floor(ns / 1_000_000);
    }
  }
  return null;
}

export function buildSevenDayExpiresTimestamp(): Timestamp {
  return Timestamp.fromMillis(Date.now() + RETENTION_MS);
}

export function getRecordExpiresAtMs(record: {
  createdAt?: unknown;
  expiresAt?: unknown;
}): number | null {
  const explicitExp = toMillis(record.expiresAt);
  if (explicitExp !== null) return explicitExp;
  const created = toMillis(record.createdAt);
  if (created !== null) return created + RETENTION_MS;
  return null;
}

export function isRecordExpired(
  record: { createdAt?: unknown; expiresAt?: unknown },
  now = Date.now()
): boolean {
  const created = toMillis(record.createdAt);
  if (created !== null && now - created >= RETENTION_MS) {
    return true;
  }
  const expiresAt = toMillis(record.expiresAt);
  if (expiresAt !== null && now >= expiresAt) {
    return true;
  }
  return false;
}

export function getRetentionBadgeInfo(
  record: { createdAt?: unknown; expiresAt?: unknown },
  now = Date.now()
): { expired: boolean; label: string } {
  const expiresAtMs = getRecordExpiresAtMs(record);
  if (expiresAtMs === null) {
    return { expired: false, label: 'Lưu 7 ngày trên hệ thống' };
  }
  const diff = expiresAtMs - now;
  if (diff <= 0) {
    return { expired: true, label: 'Quá hạn 7 ngày — Cần xóa' };
  }
  const totalHours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days >= 1) {
    return {
      expired: false,
      label: hours > 0 ? `Còn ${days} ngày ${hours} giờ` : `Còn ${days} ngày`,
    };
  }
  if (hours >= 1) {
    return { expired: false, label: `Còn ${hours} giờ` };
  }
  const mins = Math.max(1, Math.floor(diff / (60 * 1000)));
  return { expired: false, label: `Còn ${mins} phút` };
}

export interface ExpiredItemSummary {
  collectionName: 'games' | 'exams';
  id: string;
  title: string;
}

export interface CleanupAndGuardResult {
  deletedGames: number;
  deletedExams: number;
  remainingExpired: ExpiredItemSummary[];
  canCreate: boolean;
}

/**
 * Checks teacher's games & exams in Firebase.
 * Any doc exceeding 7 days is flagged; if autoDelete=true, attempts to remove expired docs immediately.
 * If any >7-day document remains undeleted on Firebase, canCreate becomes false.
 */
export async function inspectAndCleanupTeacherRetention(
  teacherUid: string,
  options: { autoDelete?: boolean } = {}
): Promise<CleanupAndGuardResult> {
  const { autoDelete = false } = options;
  const now = Date.now();

  const [gamesSnap, examsSnap] = await Promise.all([
    getDocs(query(collection(db, 'games'), where('teacherId', '==', teacherUid))),
    getDocs(query(collection(db, 'exams'), where('teacherId', '==', teacherUid))),
  ]);

  let deletedGames = 0;
  let deletedExams = 0;
  const remainingExpired: ExpiredItemSummary[] = [];

  for (const d of gamesSnap.docs) {
    const data = d.data() as { title?: string; createdAt?: unknown; expiresAt?: unknown };
    if (isRecordExpired(data, now)) {
      if (autoDelete) {
        try {
          await deleteDoc(doc(db, 'games', d.id));
          deletedGames += 1;
          continue;
        } catch (err) {
          console.warn('Auto-delete expired game failed:', d.id, err);
        }
      }
      remainingExpired.push({
        collectionName: 'games',
        id: d.id,
        title: data.title || 'Trò chơi chưa đặt tên',
      });
    }
  }

  for (const d of examsSnap.docs) {
    const data = d.data() as { title?: string; createdAt?: unknown; expiresAt?: unknown };
    if (isRecordExpired(data, now)) {
      if (autoDelete) {
        try {
          await deleteDoc(doc(db, 'exams', d.id));
          deletedExams += 1;
          continue;
        } catch (err) {
          console.warn('Auto-delete expired exam failed:', d.id, err);
        }
      }
      remainingExpired.push({
        collectionName: 'exams',
        id: d.id,
        title: data.title || 'Đề thi chưa đặt tên',
      });
    }
  }

  return {
    deletedGames,
    deletedExams,
    remainingExpired,
    canCreate: remainingExpired.length === 0,
  };
}
