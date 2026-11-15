import { useEffect, useMemo, useState } from 'react';
import {
  BookPlus,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { GRAMMAR_CATEGORIES, VOCAB_TOPICS } from '../../constants/topics';
import {
  EXAM_QUESTION_TYPE_OPTIONS,
  SAMPLE_GRADE_GROUP_OPTIONS,
} from '../../data/examQuestionBank';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import type {
  ExamQuestionType,
  SampleBankQuestion,
  SampleQuestionGradeGroup,
} from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../common/ToastProvider';

interface AdminSampleBankManagerProps {
  adminUid?: string;
  adminEmail?: string | null;
  onRequireGoogleAdmin: () => void;
}

interface DraftBankQuestion {
  questionType: ExamQuestionType;
  gradeGroup: SampleQuestionGradeGroup;
  topic: string;
  section: string;
  prompt: string;
  passage: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

const SINGLE_QUESTION_TEMPLATES: Record<
  ExamQuestionType,
  { prompt: string; passage?: string; options: string[]; correctAnswer: string }
> = {
  vocabulary: {
    prompt: 'Choose the English word meaning "Thư viện trường học":',
    options: ['School library', 'Laboratory', 'Playground', 'Canteen'],
    correctAnswer: 'School library',
  },
  grammar: {
    prompt: 'By the time we arrived at the station, the train ______.',
    options: ['had left', 'left', 'leaves', 'is leaving'],
    correctAnswer: 'had left',
  },
  multiple_choice: {
    prompt: '“Would you like to join our English club?” — “______”',
    options: ['Yes, I’d love to.', 'No, I didn’t.', 'Yesterday morning.', 'You are welcome.'],
    correctAnswer: 'Yes, I’d love to.',
  },
  fill_blank: {
    prompt: 'Điền đúng giới từ (in / on / at): We have an English test ____ Monday morning.',
    options: [],
    correctAnswer: 'on',
  },
  sentence_order: {
    prompt: 'Sắp xếp thành câu hoàn chỉnh: practicing / English / every / enjoys / She / day.',
    options: [],
    correctAnswer: 'She enjoys practicing English every day.',
  },
  reading: {
    passage:
      'Reading Passage: Learning English through short stories helps students remember new vocabulary naturally inside meaningful sentences.',
    prompt: 'Why is learning English through short stories effective?',
    options: [
      'It helps students remember vocabulary naturally in context',
      'It removes all grammar rules',
      'It only teaches spelling numbers',
      'It takes five hours per word',
    ],
    correctAnswer: 'It helps students remember vocabulary naturally in context',
  },
  listening: {
    prompt: 'Our school library opens from Monday to Saturday every week.',
    options: ['Monday to Saturday', 'Only on Sunday', 'Tuesday to Wednesday', 'Every midnight'],
    correctAnswer: 'Monday to Saturday',
  },
  other: {
    prompt: 'Tìm từ sai trong câu: "Although it rained heavily, but they still went to class."',
    options: ['but', 'Although', 'heavily', 'went'],
    correctAnswer: 'but',
  },
};

const TOPIC_SUGGESTIONS = [
  ...VOCAB_TOPICS.map((t) => t.name),
  ...GRAMMAR_CATEGORIES.filter((c) => c !== 'Tất cả chuyên đề'),
  'Kiểm tra tổng hợp',
  'Đề thi giữa kỳ',
  'Đề thi học kỳ',
];

function normalizeQuestionType(raw: string, fallback: ExamQuestionType): ExamQuestionType {
  const clean = raw.trim().toLowerCase();
  const validIds: ExamQuestionType[] = [
    'vocabulary',
    'grammar',
    'multiple_choice',
    'fill_blank',
    'sentence_order',
    'reading',
    'listening',
    'other',
  ];
  if (validIds.includes(clean as ExamQuestionType)) {
    return clean as ExamQuestionType;
  }
  if (clean.includes('từ vựng') || clean.includes('vocab')) return 'vocabulary';
  if (clean.includes('ngữ pháp') || clean.includes('grammar')) return 'grammar';
  if (clean.includes('điền') || clean.includes('blank')) return 'fill_blank';
  if (clean.includes('sắp xếp') || clean.includes('order')) return 'sentence_order';
  if (clean.includes('đọc') || clean.includes('read')) return 'reading';
  if (clean.includes('nghe') || clean.includes('listen')) return 'listening';
  if (clean.includes('trắc nghiệm') || clean.includes('choice')) return 'multiple_choice';
  if (clean.includes('lỗi') || clean.includes('khác') || clean.includes('other')) return 'other';
  return fallback;
}

function normalizeGradeGroup(
  raw: string,
  fallback: SampleQuestionGradeGroup
): SampleQuestionGradeGroup {
  const clean = raw.trim().toLowerCase();
  if (clean === 'primary' || clean.includes('tiểu học') || clean.includes('1-5')) return 'primary';
  if (clean === 'secondary' || clean.includes('thcs') || clean.includes('6-9')) return 'secondary';
  if (clean === 'high' || clean.includes('thpt') || clean.includes('10-12')) return 'high';
  if (clean === 'all' || clean.includes('tất cả')) return 'all';
  return fallback;
}

export function AdminSampleBankManager({
  adminUid,
  adminEmail,
  onRequireGoogleAdmin,
}: AdminSampleBankManagerProps) {
  const { showToast } = useToast();

  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importMode, setImportMode] = useState<'single' | 'batch' | 'excel'>('single');

  // Saved questions in Firebase
  const [bankQuestions, setBankQuestions] = useState<SampleBankQuestion[]>([]);
  const [loadingBank, setLoadingBank] = useState(true);

  // Filters for existing bank list
  const [filterType, setFilterType] = useState<ExamQuestionType | 'all'>('all');
  const [filterGrade, setFilterGrade] = useState<SampleQuestionGradeGroup | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Shared metadata for importing
  const [selectedType, setSelectedType] = useState<ExamQuestionType>('vocabulary');
  const [selectedGradeGroup, setSelectedGradeGroup] =
    useState<SampleQuestionGradeGroup>('all');
  const [topicInput, setTopicInput] = useState('Trường học');
  const [sectionInput, setSectionInput] = useState('Phần Từ vựng (Vocabulary)');

  // Mode 1: Single question form
  const [prompt, setPrompt] = useState('');
  const [passage, setPassage] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [points, setPoints] = useState(1);

  // Mode 2: Batch text/JSON import
  const [batchText, setBatchText] = useState('');
  const [batchPreview, setBatchPreview] = useState<DraftBankQuestion[]>([]);

  // Mode 3: Excel import
  const [excelPreview, setExcelPreview] = useState<DraftBankQuestion[]>([]);
  const [excelFileName, setExcelFileName] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SampleBankQuestion | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isGoogleAdminReady = adminEmail === 'vanhayd2@gmail.com' && Boolean(adminUid);

  useEffect(() => {
    setLoadingBank(true);
    const unsub = onSnapshot(
      collection(db, 'sampleQuestionBank'),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as SampleBankQuestion
        );
        list.sort((a, b) => {
          const tA = (a.topic || '').localeCompare(b.topic || '');
          if (tA !== 0) return tA;
          return (a.prompt || '').localeCompare(b.prompt || '');
        });
        setBankQuestions(list);
        setLoadingBank(false);
      },
      (err) => {
        setLoadingBank(false);
        console.warn('Error loading sampleQuestionBank:', err);
      }
    );
    return () => unsub();
  }, []);

  const handleChangeType = (nextType: ExamQuestionType) => {
    setSelectedType(nextType);
    const found = EXAM_QUESTION_TYPE_OPTIONS.find((opt) => opt.id === nextType);
    if (found) {
      setSectionInput(found.defaultSection);
    }
  };

  const handleFillSingleTemplate = () => {
    const tpl = SINGLE_QUESTION_TEMPLATES[selectedType];
    setPrompt(tpl.prompt);
    setPassage(tpl.passage || '');
    setOptionsText((tpl.options || []).join(' | '));
    setCorrectAnswer(tpl.correctAnswer);
    setPoints(1);
    showToast('Đã điền câu hỏi mẫu theo dạng bài đang chọn. Bạn có thể sửa lại trước khi lưu.', 'info');
  };

  const handleInsertBatchTemplate = () => {
    const tpl = SINGLE_QUESTION_TEMPLATES[selectedType];
    const sampleItems = [
      {
        questionType: selectedType,
        gradeGroup: selectedGradeGroup,
        topic: topicInput.trim() || 'Tổng hợp',
        section: sectionInput.trim() || 'Phần tự luyện',
        passage: tpl.passage || '',
        prompt: tpl.prompt,
        options: tpl.options,
        correctAnswer: tpl.correctAnswer,
        points: 1,
      },
      {
        questionType: selectedType,
        gradeGroup: selectedGradeGroup,
        topic: topicInput.trim() || 'Tổng hợp',
        section: sectionInput.trim() || 'Phần tự luyện',
        passage: selectedType === 'reading' ? tpl.passage || '' : '',
        prompt:
          selectedType === 'fill_blank'
            ? 'Điền từ thích hợp (a / an / the): My sister is reading ____ interesting story.'
            : selectedType === 'sentence_order'
              ? 'Sắp xếp thành câu hoàn chỉnh: always / English / practices / Nam / morning. / every'
              : 'Choose the best option: Students should review lessons ______ before exams.',
        options:
          selectedType === 'fill_blank' || selectedType === 'sentence_order'
            ? []
            : ['carefully', 'careless', 'care', 'carelessness'],
        correctAnswer:
          selectedType === 'fill_blank'
            ? 'an'
            : selectedType === 'sentence_order'
              ? 'Nam always practices English every morning.'
              : 'carefully',
        points: 1,
      },
    ];
    setBatchText(JSON.stringify(sampleItems, null, 2));
    parseBatchInput(JSON.stringify(sampleItems, null, 2));
    showToast('Đã chèn dữ liệu mẫu hàng loạt. Có thể chỉnh sửa hoặc thêm câu mới vào danh sách.', 'info');
  };

  const parseBatchInput = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setBatchPreview([]);
      return;
    }

    const fallbackSection =
      sectionInput.trim() ||
      EXAM_QUESTION_TYPE_OPTIONS.find((t) => t.id === selectedType)?.defaultSection ||
      'Phần câu hỏi';
    const fallbackTopic = topicInput.trim() || 'Tổng hợp';

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsedRaw = JSON.parse(trimmed);
        const arr = Array.isArray(parsedRaw) ? parsedRaw : [parsedRaw];
        const normalized: DraftBankQuestion[] = arr
          .map((item) => {
            const qType = normalizeQuestionType(
              String(item.questionType || ''),
              selectedType
            );
            const gGroup = normalizeGradeGroup(
              String(item.gradeGroup || ''),
              selectedGradeGroup
            );
            const opts = Array.isArray(item.options)
              ? item.options.map((x: unknown) => String(x).trim()).filter(Boolean)
              : String(item.options || '')
                  .split('|')
                  .map((s) => s.trim())
                  .filter(Boolean);
            return {
              questionType: qType,
              gradeGroup: gGroup,
              topic: String(item.topic || fallbackTopic).trim(),
              section: String(item.section || fallbackSection).trim(),
              prompt: String(item.prompt || '').trim(),
              passage: String(item.passage || '').trim(),
              options: opts,
              correctAnswer: String(item.correctAnswer || '').trim(),
              points: Number(item.points) > 0 ? Number(item.points) : 1,
            };
          })
          .filter((item) => item.prompt && item.correctAnswer);
        setBatchPreview(normalized);
        return;
      } catch {
        // Fallback to line-based parsing below
      }
    }

    // Line-based format: Prompt ;; Opt1 | Opt2 | Opt3 | Opt4 ;; CorrectAnswer ;; Points(opt) ;; Passage(opt)
    const lines = trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    const parsedLines: DraftBankQuestion[] = [];
    for (const line of lines) {
      const cols = line.split(';;').map((c) => c.trim());
      if (cols.length < 3) continue;
      const linePrompt = cols[0];
      const lineOptions = cols[1]
        ? cols[1]
            .split('|')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const lineAnswer = cols[2];
      const linePoints = Number(cols[3]) > 0 ? Number(cols[3]) : 1;
      const linePassage = cols[4] || '';
      if (linePrompt && lineAnswer) {
        parsedLines.push({
          questionType: selectedType,
          gradeGroup: selectedGradeGroup,
          topic: fallbackTopic,
          section: fallbackSection,
          prompt: linePrompt,
          passage: linePassage,
          options: lineOptions,
          correctAnswer: lineAnswer,
          points: linePoints,
        });
      }
    }
    setBatchPreview(parsedLines);
  };

  const handleDownloadExcelTemplate = () => {
    const sampleRows = [
      {
        LoaiCauHoi: 'vocabulary',
        CapHoc: 'primary',
        ChuDe: 'Trường học',
        PhanDe: 'Phần Từ vựng (Vocabulary)',
        DoanVanDocHieu: '',
        NoiDungCauHoi: 'Choose the English word meaning "Bảng đen":',
        LuaChon: 'Blackboard | Textbook | Backpack | Ruler',
        DapAnDung: 'Blackboard',
        Diem: 1,
      },
      {
        LoaiCauHoi: 'grammar',
        CapHoc: 'secondary',
        ChuDe: 'Các thì trong tiếng Anh',
        PhanDe: 'Phần Ngữ pháp (Grammar)',
        DoanVanDocHieu: '',
        NoiDungCauHoi: 'She ______ to Da Lat with her family last summer.',
        LuaChon: 'traveled | travels | is traveling | has travel',
        DapAnDung: 'traveled',
        Diem: 1,
      },
      {
        LoaiCauHoi: 'fill_blank',
        CapHoc: 'all',
        ChuDe: 'Giới từ',
        PhanDe: 'Phần Điền từ (Fill in the blank)',
        DoanVanDocHieu: '',
        NoiDungCauHoi: 'Điền giới từ thích hợp (in / on / at): My birthday is ____ May 12th.',
        LuaChon: '',
        DapAnDung: 'on',
        Diem: 1,
      },
      {
        LoaiCauHoi: 'reading',
        CapHoc: 'high',
        ChuDe: 'Môi trường',
        PhanDe: 'Phần Đọc hiểu (Reading Comprehension)',
        DoanVanDocHieu:
          'Recycling paper saves trees and reduces energy used to manufacture new products.',
        NoiDungCauHoi: 'What does recycling paper help save?',
        LuaChon: 'Trees and energy | Plastic bottles | Oil tankers | Concrete',
        DapAnDung: 'Trees and energy',
        Diem: 1,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MauKhoCauHoi');
    XLSX.writeFile(workbook, 'mau_nhap_kho_de_mau_english_learning.xlsx');
    showToast('Đã tải về file Excel mẫu.', 'success');
  };

  const handleExcelFileUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

      const fallbackTopic = topicInput.trim() || 'Tổng hợp';
      const fallbackSection =
        sectionInput.trim() ||
        EXAM_QUESTION_TYPE_OPTIONS.find((t) => t.id === selectedType)?.defaultSection ||
        'Phần câu hỏi';

      const parsed: DraftBankQuestion[] = rows
        .map((row) => {
          const rawType = String(row.LoaiCauHoi ?? row.questionType ?? row['Loại câu hỏi'] ?? '');
          const rawGrade = String(row.CapHoc ?? row.gradeGroup ?? row['Cấp học'] ?? '');
          const rawTopic = String(row.ChuDe ?? row.topic ?? row['Chủ đề'] ?? '').trim();
          const rawSection = String(row.PhanDe ?? row.section ?? row['Phần đề'] ?? '').trim();
          const rawPassage = String(
            row.DoanVanDocHieu ?? row.passage ?? row['Đoạn văn'] ?? ''
          ).trim();
          const rawPrompt = String(
            row.NoiDungCauHoi ?? row.prompt ?? row['Nội dung câu hỏi'] ?? ''
          ).trim();
          const rawOpts = String(row.LuaChon ?? row.options ?? row['Lựa chọn'] ?? '');
          const rawAnswer = String(
            row.DapAnDung ?? row.correctAnswer ?? row['Đáp án đúng'] ?? ''
          ).trim();
          const rawPoints = Number(row.Diem ?? row.points ?? row['Điểm'] ?? 1);

          const options = rawOpts
            .split('|')
            .map((s) => s.trim())
            .filter(Boolean);

          return {
            questionType: normalizeQuestionType(rawType, selectedType),
            gradeGroup: normalizeGradeGroup(rawGrade, selectedGradeGroup),
            topic: rawTopic || fallbackTopic,
            section: rawSection || fallbackSection,
            passage: rawPassage,
            prompt: rawPrompt,
            options,
            correctAnswer: rawAnswer,
            points: rawPoints > 0 ? rawPoints : 1,
          };
        })
        .filter((item) => item.prompt && item.correctAnswer);

      setExcelFileName(file.name);
      setExcelPreview(parsed);
      if (parsed.length === 0) {
        showToast('Không tìm thấy dòng câu hỏi hợp lệ trong file Excel.', 'error');
      } else {
        showToast(`Đã đọc ${parsed.length} câu hỏi hợp lệ từ file "${file.name}".`, 'success');
      }
    } catch (error) {
      showToast('Không thể đọc file Excel. Vui lòng dùng đúng file mẫu .xlsx/.csv.', 'error');
      console.error('Excel parse error:', error);
    }
  };

  const handleAppendSingleQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGoogleAdminReady) {
      showToast('Vui lòng đăng nhập Google Admin (vanhayd2@gmail.com) để ghi dữ liệu lên Firebase.', 'error');
      onRequireGoogleAdmin();
      return;
    }
    if (!topicInput.trim() || !prompt.trim() || !correctAnswer.trim()) {
      showToast('Vui lòng nhập đầy đủ Chủ đề, Nội dung câu hỏi và Đáp án đúng.', 'error');
      return;
    }

    const opts = optionsText
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      await addDoc(collection(db, 'sampleQuestionBank'), {
        questionType: selectedType,
        gradeGroup: selectedGradeGroup,
        topic: topicInput.trim().slice(0, 120),
        section: (sectionInput.trim() || 'Phần tự luyện').slice(0, 150),
        prompt: prompt.trim().slice(0, 2000),
        passage: passage.trim().slice(0, 4000),
        options: opts.slice(0, 10),
        correctAnswer: correctAnswer.trim().slice(0, 1000),
        points: Number(points) > 0 ? Number(points) : 1,
        isActive: true,
        createdBy: adminUid!,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPrompt('');
      setPassage('');
      setOptionsText('');
      setCorrectAnswer('');
      showToast('Đã ghi tiếp câu hỏi mới vào kho đề mẫu vĩnh viễn trên Firebase!', 'success');
    } catch (error) {
      showToast('Không thể lưu câu hỏi lên Firebase. Kiểm tra quyền Admin Google.', 'error');
      handleFirestoreError(error, OperationType.CREATE, 'sampleQuestionBank');
    } finally {
      setSaving(false);
    }
  };

  const handleAppendMultipleQuestions = async (items: DraftBankQuestion[], sourceLabel: string) => {
    if (!isGoogleAdminReady) {
      showToast('Vui lòng đăng nhập Google Admin (vanhayd2@gmail.com) để ghi dữ liệu lên Firebase.', 'error');
      onRequireGoogleAdmin();
      return;
    }
    if (items.length === 0) {
      showToast('Chưa có câu hỏi hợp lệ để lưu.', 'error');
      return;
    }

    setSaving(true);
    try {
      // Firestore batch supports up to 500 writes; chunk safely by 200 (appends new IDs, never overwrites)
      for (let i = 0; i < items.length; i += 200) {
        const chunk = items.slice(i, i + 200);
        const batch = writeBatch(db);
        for (const item of chunk) {
          const newDocRef = doc(collection(db, 'sampleQuestionBank'));
          batch.set(newDocRef, {
            questionType: item.questionType,
            gradeGroup: item.gradeGroup,
            topic: item.topic.slice(0, 120),
            section: item.section.slice(0, 150),
            prompt: item.prompt.slice(0, 2000),
            passage: (item.passage || '').slice(0, 4000),
            options: item.options.slice(0, 10),
            correctAnswer: item.correctAnswer.slice(0, 1000),
            points: item.points > 0 ? item.points : 1,
            isActive: true,
            createdBy: adminUid!,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }

      if (sourceLabel === 'batch') {
        setBatchText('');
        setBatchPreview([]);
      } else {
        setExcelPreview([]);
        setExcelFileName('');
      }
      showToast(
        `Đã ghi tiếp ${items.length} câu hỏi vào kho đề mẫu vĩnh viễn trên Firebase (không ghi đè dữ liệu cũ).`,
        'success'
      );
    } catch (error) {
      showToast('Lỗi khi ghi danh sách câu hỏi lên Firebase.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'sampleQuestionBank');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBankQuestion = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'sampleQuestionBank', deleteTarget.id));
      showToast('Đã xóa câu hỏi khỏi kho đề mẫu Firebase.', 'success');
      setDeleteTarget(null);
    } catch (error) {
      showToast('Không thể xóa câu hỏi khỏi Firebase.', 'error');
      handleFirestoreError(error, OperationType.DELETE, `sampleQuestionBank/${deleteTarget.id}`);
    } finally {
      setDeleting(false);
    }
  };

  const filteredQuestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return bankQuestions.filter((item) => {
      if (filterType !== 'all' && item.questionType !== filterType) return false;
      if (filterGrade !== 'all' && item.gradeGroup !== filterGrade) return false;
      if (
        q &&
        !(item.topic || '').toLowerCase().includes(q) &&
        !(item.prompt || '').toLowerCase().includes(q) &&
        !(item.correctAnswer || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [bankQuestions, filterType, filterGrade, searchTerm]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-600" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Kho câu hỏi Đề mẫu (Lưu vĩnh viễn trên Firebase)
            </h2>
            <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700 tabular-nums">
              {bankQuestions.length} câu đã lưu
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Câu hỏi Admin nhập vào đây được lưu <strong>vĩnh viễn trên Firebase</strong> (không tự
            xóa sau 7 ngày), tự động hòa vào kho rút ngẫu nhiên cho các đề thi mẫu. Khi nhập thêm
            sẽ luôn <strong>ghi nối tiếp</strong>, không ghi đè dữ liệu cũ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadExcelTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            Tải file Excel mẫu
          </button>
          <button
            type="button"
            onClick={() => setShowImportPanel((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 cursor-pointer"
          >
            <BookPlus className="h-4 w-4" />
            {showImportPanel ? 'Thu gọn khung nhập' : 'Nhập câu hỏi vào kho'}
          </button>
        </div>
      </div>

      {/* Expandable Import Workspace */}
      {showImportPanel && (
        <div className="p-6 border-b border-slate-200 bg-slate-50/70 space-y-5">
          {!isGoogleAdminReady && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-amber-950">
                Để ghi dữ liệu vào kho vĩnh viễn trên Firebase, vui lòng xác thực bằng tài khoản
                Google Admin (<strong>vanhayd2@gmail.com</strong>).
              </p>
              <button
                type="button"
                onClick={onRequireGoogleAdmin}
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 shrink-0 cursor-pointer"
              >
                Đăng nhập Google Admin
              </button>
            </div>
          )}

          {/* Topic & Exam Question Type Metadata Row */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              1. Chọn thể loại đề mẫu &amp; nhập chủ đề
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Dạng câu hỏi đề mẫu
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => handleChangeType(e.target.value as ExamQuestionType)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {EXAM_QUESTION_TYPE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Áp dụng cho cấp đề mẫu
                </label>
                <select
                  value={selectedGradeGroup}
                  onChange={(e) =>
                    setSelectedGradeGroup(e.target.value as SampleQuestionGradeGroup)
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {SAMPLE_GRADE_GROUP_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Chủ đề (Chọn hoặc tự nhập)
                </label>
                <input
                  type="text"
                  list="admin-topic-suggestions"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="VD: Trường học, Câu điều kiện..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <datalist id="admin-topic-suggestions">
                  {TOPIC_SUGGESTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tên phần hiển thị trong đề
                </label>
                <input
                  type="text"
                  value={sectionInput}
                  onChange={(e) => setSectionInput(e.target.value)}
                  placeholder="VD: Phần Từ vựng (Vocabulary)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'single' as const, label: 'Nhập từng câu (Có mẫu)' },
              { id: 'batch' as const, label: 'Nhập nhiều câu nhanh (Text / JSON)' },
              { id: 'excel' as const, label: 'Import file Excel (.xlsx / .csv)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setImportMode(tab.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  importMode === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Single Question Input */}
          {importMode === 'single' && (
            <form
              onSubmit={handleAppendSingleQuestion}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Thêm 1 câu hỏi mới vào kho (Ghi nối tiếp vào Firebase)
                </h3>
                <button
                  type="button"
                  onClick={handleFillSingleTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Điền câu mẫu tham khảo
                </button>
              </div>

              {(selectedType === 'reading' || passage.trim().length > 0) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Đoạn văn đọc hiểu (Reading Passage)
                  </label>
                  <textarea
                    rows={3}
                    value={passage}
                    onChange={(e) => setPassage(e.target.value)}
                    placeholder="Dán đoạn văn tiếng Anh cho câu hỏi Đọc hiểu..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nội dung câu hỏi {selectedType === 'listening' ? '(Văn bản để AI đọc tiếng Anh)' : ''}
                </label>
                <textarea
                  rows={2}
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Nhập đề bài hoặc câu hỏi tiếng Anh..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Các lựa chọn A | B | C | D (Để trống nếu là câu tự điền / sắp xếp câu)
                  </label>
                  <input
                    type="text"
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder="Option A | Option B | Option C | Option D"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Điểm câu hỏi
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min={0.25}
                    max={100}
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value) || 1)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Đáp án đúng (Bắt buộc khớp chính xác với lựa chọn hoặc câu hoàn chỉnh)
                </label>
                <input
                  type="text"
                  required
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="Nhập đáp án đúng..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Lưu &amp; Ghi tiếp lên Firebase
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Batch Text/JSON Input */}
          {importMode === 'batch' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nhập hàng loạt câu hỏi theo chủ đề &ldquo;{topicInput || 'Tổng hợp'}&rdquo;
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hỗ trợ dán mảng JSON hoặc mỗi dòng theo mẫu:{' '}
                    <code>Nội dung câu hỏi ;; Lựa chọn A | B | C | D ;; Đáp án đúng ;; Điểm</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInsertBatchTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Chèn dữ liệu mẫu
                </button>
              </div>

              <textarea
                rows={8}
                value={batchText}
                onChange={(e) => {
                  setBatchText(e.target.value);
                  parseBatchInput(e.target.value);
                }}
                placeholder="Dán danh sách câu hỏi JSON hoặc cú pháp phân tách bởi ;; ..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-600">
                  Nhận diện hợp lệ: <strong className="text-sky-700">{batchPreview.length}</strong>{' '}
                  câu hỏi sẵn sàng ghi tiếp lên Firebase.
                </span>
                <button
                  type="button"
                  disabled={saving || batchPreview.length === 0}
                  onClick={() => handleAppendMultipleQuestions(batchPreview, 'batch')}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Ghi tiếp {batchPreview.length} câu vào Firebase
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Excel Import */}
          {importMode === 'excel' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nhập hàng loạt từ file Excel (.xlsx / .csv)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cột chuẩn: <code>LoaiCauHoi</code>, <code>CapHoc</code>, <code>ChuDe</code>,{' '}
                    <code>PhanDe</code>, <code>DoanVanDocHieu</code>, <code>NoiDungCauHoi</code>,{' '}
                    <code>LuaChon</code> (cách bởi <code>|</code>), <code>DapAnDung</code>,{' '}
                    <code>Diem</code>.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer shrink-0">
                  <FileSpreadsheet className="h-4 w-4" />
                  Chọn file Excel (.xlsx / .csv)
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => handleExcelFileUpload(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {excelFileName && (
                <div className="text-xs text-slate-700 bg-slate-50 rounded-lg px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Đã đọc từ file: <strong>{excelFileName}</strong> ({excelPreview.length} câu hợp
                    lệ)
                  </span>
                  <button
                    type="button"
                    disabled={saving || excelPreview.length === 0}
                    onClick={() => handleAppendMultipleQuestions(excelPreview, 'excel')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Ghi tiếp {excelPreview.length} câu vào Firebase
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Saved Permanent Bank List & Filters */}
      <div className="p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ExamQuestionType | 'all')}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="all">Tất cả dạng bài ({bankQuestions.length})</option>
              {EXAM_QUESTION_TYPE_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={filterGrade}
              onChange={(e) =>
                setFilterGrade(e.target.value as SampleQuestionGradeGroup | 'all')
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="all">Mọi cấp học</option>
              {SAMPLE_GRADE_GROUP_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo chủ đề hoặc câu hỏi..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>

        {loadingBank ? (
          <div className="py-8 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải kho câu hỏi vĩnh viễn từ Firebase...
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Chưa có câu hỏi Admin bổ sung nào khớp bộ lọc. Nhấn{' '}
            <strong>Nhập câu hỏi vào kho</strong> để thêm câu hỏi theo chủ đề lên Firebase.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredQuestions.map((item, idx) => {
              const typeLabel =
                EXAM_QUESTION_TYPE_OPTIONS.find((t) => t.id === item.questionType)?.label ||
                item.questionType;
              const gradeLabel =
                SAMPLE_GRADE_GROUP_OPTIONS.find((g) => g.id === item.gradeGroup)?.label ||
                item.gradeGroup;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50/70"
                >
                  <div className="space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-bold text-slate-700 tabular-nums">#{idx + 1}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        {typeLabel}
                      </span>
                      <span className="rounded bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                        Chủ đề: {item.topic}
                      </span>
                      <span>{gradeLabel}</span>
                    </div>
                    {item.passage && (
                      <p className="text-xs text-slate-600 italic line-clamp-2">{item.passage}</p>
                    )}
                    <p className="font-semibold text-slate-900">{item.prompt}</p>
                    <p className="text-xs text-emerald-700">
                      Đáp án đúng: <strong>{item.correctAnswer}</strong>
                      {item.options?.length > 0 ? ` · Lựa chọn: ${item.options.join(' | ')}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 shrink-0 self-start cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa câu hỏi khỏi kho"
        message={`Bạn có chắc muốn xóa câu hỏi "${deleteTarget?.prompt}" khỏi kho đề mẫu Firebase?`}
        confirmLabel="Xóa vĩnh viễn"
        loading={deleting}
        onConfirm={handleDeleteBankQuestion}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
