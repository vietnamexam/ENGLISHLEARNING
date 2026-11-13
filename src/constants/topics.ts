import type { GameType, GrammarTopic } from '../types';

export interface VocabTopicMeta {
  id: string;
  name: string;
  englishName: string;
  description: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  samplePrompts: string[];
}

export const VOCAB_TOPICS: VocabTopicMeta[] = [
  {
    id: 'objects',
    name: 'Đồ vật',
    englishName: 'Objects & Things',
    description: 'Đồ dùng hằng ngày, vật dụng trong nhà và đồ dùng cá nhân.',
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-200',
    samplePrompts: ['cái bàn', 'chiếc đèn', 'quyển sách', 'cái đồng hồ'],
  },
  {
    id: 'flowers',
    name: 'Hoa',
    englishName: 'Flowers',
    description: 'Tên các loài hoa quen thuộc và từ vựng miêu tả hương sắc.',
    accentBg: 'bg-rose-50',
    accentText: 'text-rose-700',
    accentBorder: 'border-rose-200',
    samplePrompts: ['hoa hồng', 'hoa hướng dương', 'hoa sen', 'hoa cúc'],
  },
  {
    id: 'fruits',
    name: 'Quả',
    englishName: 'Fruits',
    description: 'Các loại trái cây nhiệt đới, ôn đới và tính từ miêu tả vị.',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    accentBorder: 'border-amber-200',
    samplePrompts: ['quả xoài', 'quả táo', 'quả dưa hấu', 'quả cam'],
  },
  {
    id: 'animals',
    name: 'Động vật',
    englishName: 'Animals',
    description: 'Thú nuôi, động vật hoang dã, sinh vật biển và côn trùng.',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    accentBorder: 'border-emerald-200',
    samplePrompts: ['con voi', 'chim đại bàng', 'cá heo', 'con mèo'],
  },
  {
    id: 'family',
    name: 'Gia đình',
    englishName: 'Family',
    description: 'Các thành viên trong gia đình và mối quan hệ thân thuộc.',
    accentBg: 'bg-orange-50',
    accentText: 'text-orange-700',
    accentBorder: 'border-orange-200',
    samplePrompts: ['ông bà', 'anh trai', 'em gái', 'gia đình'],
  },
  {
    id: 'school',
    name: 'Trường học',
    englishName: 'School',
    description: 'Lớp học, môn học, thiết bị dạy học và hoạt động ở trường.',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200',
    samplePrompts: ['bảng đen', 'thư viện', 'bài tập về nhà', 'phòng thí nghiệm'],
  },
  {
    id: 'jobs',
    name: 'Nghề nghiệp',
    englishName: 'Occupations',
    description: 'Các ngành nghề phổ biến và nơi làm việc.',
    accentBg: 'bg-cyan-50',
    accentText: 'text-cyan-700',
    accentBorder: 'border-cyan-200',
    samplePrompts: ['giáo viên', 'kỹ sư', 'bác sĩ', 'phi công'],
  },
  {
    id: 'colors',
    name: 'Màu sắc',
    englishName: 'Colors',
    description: 'Bảng màu cơ bản và sắc thái màu sắc trong tiếng Anh.',
    accentBg: 'bg-fuchsia-50',
    accentText: 'text-fuchsia-700',
    accentBorder: 'border-fuchsia-200',
    samplePrompts: ['màu xanh ngọc', 'màu vàng', 'màu tím', 'màu cam'],
  },
  {
    id: 'numbers',
    name: 'Số đếm',
    englishName: 'Numbers',
    description: 'Số đếm, số thứ tự và cách đọc số lượng.',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-700',
    accentBorder: 'border-teal-200',
    samplePrompts: ['hai mươi lăm', 'thứ nhất', 'một trăm', 'một nghìn'],
  },
  {
    id: 'verbs',
    name: 'Động từ',
    englishName: 'Verbs',
    description: 'Động từ hành động, động từ trạng thái và cụm động từ thông dụng.',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-700',
    accentBorder: 'border-blue-200',
    samplePrompts: ['khám phá', 'giải thích', 'luyện tập', 'ghi nhớ'],
  },
  {
    id: 'nouns',
    name: 'Danh từ',
    englishName: 'Nouns',
    description: 'Danh từ đếm được, không đếm được và danh từ trừu tượng.',
    accentBg: 'bg-slate-100',
    accentText: 'text-slate-800',
    accentBorder: 'border-slate-300',
    samplePrompts: ['kiến thức', 'kinh nghiệm', 'môi trường', 'thành công'],
  },
  {
    id: 'adjectives',
    name: 'Tính từ',
    englishName: 'Adjectives',
    description: 'Tính từ miêu tả tính cách, cảm xúc, kích thước và chất lượng.',
    accentBg: 'bg-violet-50',
    accentText: 'text-violet-700',
    accentBorder: 'border-violet-200',
    samplePrompts: ['thông minh', 'tự tin', 'kiên nhẫn', 'tuyệt vời'],
  },
  {
    id: 'adverbs',
    name: 'Trạng từ',
    englishName: 'Adverbs',
    description: 'Trạng từ chỉ cách thức, tần suất, thời gian và mức độ.',
    accentBg: 'bg-lime-50',
    accentText: 'text-lime-700',
    accentBorder: 'border-lime-200',
    samplePrompts: ['cẩn thận', 'thường xuyên', 'nhanh chóng', 'hoàn toàn'],
  },
  {
    id: 'prepositions',
    name: 'Giới từ',
    englishName: 'Prepositions',
    description: 'Giới từ chỉ nơi chốn, thời gian và phương hướng.',
    accentBg: 'bg-yellow-50',
    accentText: 'text-yellow-800',
    accentBorder: 'border-yellow-200',
    samplePrompts: ['ở phía trước', 'bên cạnh', 'giữa hai vật', 'trong suốt'],
  },
  {
    id: 'other',
    name: 'Các chủ đề khác',
    englishName: 'Other Topics',
    description: 'Thời tiết, giao thông, công nghệ, sức khỏe và văn hóa.',
    accentBg: 'bg-stone-100',
    accentText: 'text-stone-700',
    accentBorder: 'border-stone-300',
    samplePrompts: ['biến đổi khí hậu', 'trí tuệ nhân tạo', 'giao thông', 'sức khỏe'],
  },
];

export const GRAMMAR_CATEGORIES = [
  'Tất cả chuyên đề',
  'Các loại câu',
  'Câu khẳng định',
  'Câu phủ định',
  'Câu nghi vấn',
  'Các thì trong tiếng Anh',
  'Câu điều kiện',
  'Câu bị động',
  'Câu tường thuật',
  'Câu so sánh',
  'Mệnh đề quan hệ',
  'Cấu trúc câu',
  'Các loại từ',
  'Các cấu trúc ngữ pháp khác',
];

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: 'sentence-types',
    category: 'Các loại câu',
    title: 'Phân loại câu: Đơn, Ghép, Phức & Mệnh lệnh',
    gradeRange: 'Lớp 1–12',
    minGrade: 1,
    maxGrade: 12,
    formula: 'Câu đơn: S + V (+ O) | Câu ghép: Clause 1 + FANBOYS + Clause 2 | Câu phức: Mệnh đề chính + Liên từ phụ thuộc + Mệnh đề phụ',
    usage: 'Dùng để diễn đạt ý từ mức độ cơ bản (lớp 1–5) đến viết đoạn văn học thuật nâng cao (lớp 6–12).',
    explanationVi:
      'Câu đơn có một mệnh đề độc lập. Câu ghép nối hai mệnh đề độc lập bằng liên từ (and, but, or, so...). Câu phức kết hợp mệnh đề chính và mệnh đề phụ thuộc (because, although, when, if...).',
    examples: [
      { en: 'I read books every evening.', vi: 'Tôi đọc sách mỗi tối.' },
      { en: 'She was tired, so she went to bed early.', vi: 'Cô ấy mệt nên đã đi ngủ sớm.' },
      { en: 'Although it rained, they played football.', vi: 'Mặc dù trời mưa, họ vẫn chơi bóng đá.' },
    ],
    commonMistakes: [
      'Nối hai mệnh đề độc lập chỉ bằng dấu phẩy mà thiếu liên từ (comma splice).',
      'Dùng cả "Although" và "but" trong cùng một câu.',
    ],
  },
  {
    id: 'affirmative-sentences',
    category: 'Câu khẳng định',
    title: 'Câu khẳng định cơ bản (Động từ To Be & Động từ thường)',
    gradeRange: 'Lớp 1–5',
    minGrade: 1,
    maxGrade: 5,
    formula: 'S + am/is/are + N/Adj  |  S + V(s/es) + O',
    usage: 'Dùng để giới thiệu bản thân, miêu tả sự vật, trạng thái hoặc thói quen hằng ngày.',
    explanationVi:
      'Với chủ ngữ số ít (he, she, it) ở thì hiện tại đơn, động từ To Be là "is", động từ thường thêm "-s" hoặc "-es". Với I dùng "am"; we/you/they dùng "are" và động từ nguyên mẫu.',
    examples: [
      { en: 'My classroom is very bright and clean.', vi: 'Phòng học của tôi rất sáng và sạch sẽ.' },
      { en: 'Nam goes to school by bicycle every morning.', vi: 'Nam đi học bằng xe đạp mỗi sáng.' },
    ],
    commonMistakes: [
      'Quên chia động từ thêm -s/-es với chủ ngữ ngôi thứ ba số ít (He go -> He goes).',
      'Dùng thừa động từ To Be trước động từ thường (I am like music -> I like music).',
    ],
  },
  {
    id: 'negative-sentences',
    category: 'Câu phủ định',
    title: 'Câu phủ định với To Be, Trợ động từ & Động từ khuyết thiếu',
    gradeRange: 'Lớp 1–9',
    minGrade: 1,
    maxGrade: 9,
    formula: 'S + am/is/are + not + ... | S + do/does/did + not + V(nguyên mẫu) | S + can/must/should + not + V',
    usage: 'Diễn đạt hành động không xảy ra, sự việc không đúng hoặc điều không được phép làm.',
    explanationVi:
      'Khi câu có To Be hoặc động từ khuyết thiếu, chỉ cần thêm "not" ngay sau chúng. Khi câu dùng động từ thường, mượn trợ động từ "do/does/did + not" và đưa động từ chính về nguyên mẫu.',
    examples: [
      { en: 'They do not live near the city center.', vi: 'Họ không sống gần trung tâm thành phố.' },
      { en: 'She did not forget her English notebook yesterday.', vi: 'Hôm qua cô ấy đã không quên vở tiếng Anh.' },
    ],
    commonMistakes: [
      'Vẫn chia động từ chính sau "does not" hoặc "did not" (She doesn’t likes -> She doesn’t like).',
      'Dùng "no" thay cho "not" trước động từ (I no know -> I do not know).',
    ],
  },
  {
    id: 'interrogative-sentences',
    category: 'Câu nghi vấn',
    title: 'Câu hỏi Yes/No, Câu hỏi Wh- & Câu hỏi đuôi',
    gradeRange: 'Lớp 2–12',
    minGrade: 2,
    maxGrade: 12,
    formula: 'Yes/No: (Do/Does/Did/Is/Are/Can) + S + V? | Wh-: Wh-word + Trợ động từ + S + V? | Tag: Mệnh đề +, trợ ĐT phủ định + đại từ?',
    usage: 'Dùng để hỏi thông tin, xác nhận sự việc hoặc giao tiếp lịch sự trong học tập và đời sống.',
    explanationVi:
      'Đảo trợ động từ hoặc To Be lên trước chủ ngữ để tạo câu hỏi. Trong câu hỏi đuôi, vế chính khẳng định thì đuôi phủ định và ngược lại.',
    examples: [
      { en: 'Where do you usually practice speaking English?', vi: 'Bạn thường luyện nói tiếng Anh ở đâu?' },
      { en: 'You finished your homework, didn’t you?', vi: 'Bạn đã làm xong bài tập rồi phải không?' },
    ],
    commonMistakes: [
      'Quên đảo trợ động từ lên trước chủ ngữ trong câu hỏi Wh- (Where you live? -> Where do you live?).',
      'Dùng danh từ riêng ở câu hỏi đuôi thay vì đại từ nhân xưng (Lan is here, isn’t Lan? -> isn’t she?).',
    ],
  },
  {
    id: 'tenses-present-simple-cont',
    category: 'Các thì trong tiếng Anh',
    title: 'Hiện tại đơn & Hiện tại tiếp diễn',
    gradeRange: 'Lớp 3–12',
    minGrade: 3,
    maxGrade: 12,
    formula: 'HTĐ: S + V(s/es) | HTTD: S + am/is/are + V-ing',
    usage: 'Hiện tại đơn chỉ thói quen, lịch trình, sự thật hiển nhiên. Hiện tại tiếp diễn chỉ hành động đang diễn ra ngay lúc nói hoặc kế hoạch gần.',
    explanationVi:
      'Dấu hiệu HTĐ: always, usually, often, every day. Dấu hiệu HTTD: now, right now, at the moment, Look!, Listen!.',
    examples: [
      { en: 'Water boils at 100 degrees Celsius.', vi: 'Nước sôi ở 100 độ C.' },
      { en: 'Listen! The students are singing an English song.', vi: 'Nghe kìa! Các học sinh đang hát một bài hát tiếng Anh.' },
    ],
    commonMistakes: [
      'Dùng hiện tại tiếp diễn cho động từ chỉ trạng thái/cảm xúc (know, love, want, understand).',
      'Quên động từ To Be trong thì hiện tại tiếp diễn (She reading -> She is reading).',
    ],
  },
  {
    id: 'tenses-past-perfect',
    category: 'Các thì trong tiếng Anh',
    title: 'Quá khứ đơn, Quá khứ tiếp diễn & Hiện tại hoàn thành',
    gradeRange: 'Lớp 5–12',
    minGrade: 5,
    maxGrade: 12,
    formula: 'QKĐ: S + V2/V-ed | QKTD: S + was/were + V-ing | HTHT: S + have/has + V3/V-ed',
    usage: 'QKĐ diễn tả việc đã chấm dứt trong quá khứ. QKTD diễn tả việc đang xảy ra tại một thời điểm quá khứ. HTHT nối quá khứ với hiện tại.',
    explanationVi:
      'Dùng QKĐ khi có mốc thời gian xác định (yesterday, last week, in 2020). Dùng HTHT với since, for, already, yet, ever, never khi không nêu rõ thời điểm cụ thể.',
    examples: [
      { en: 'I have studied English for six years.', vi: 'Tôi đã học tiếng Anh được sáu năm rồi.' },
      { en: 'While I was doing my homework, my friend called me.', vi: 'Trong khi tôi đang làm bài tập thì bạn tôi gọi điện.' },
    ],
    commonMistakes: [
      'Dùng thì hiện tại hoàn thành với mốc thời gian quá khứ xác định như "yesterday" hoặc "last year".',
      'Nhầm lẫn dạng quá khứ phân từ (V3) của động từ bất quy tắc.',
    ],
  },
  {
    id: 'tenses-future-perfect',
    category: 'Các thì trong tiếng Anh',
    title: 'Tương lai đơn, Tương lai gần & Quá khứ hoàn thành',
    gradeRange: 'Lớp 6–12',
    minGrade: 6,
    maxGrade: 12,
    formula: 'TLĐ: S + will + V | TLG: S + am/is/are + going to + V | QKHT: S + had + V3/V-ed',
    usage: 'Will dùng cho quyết định tức thời/dự đoán không có căn cứ rõ; be going to dùng cho dự định sẵn; Quá khứ hoàn thành chỉ hành động xảy ra trước một hành động quá khứ khác.',
    explanationVi:
      'Trong chuỗi sự kiện quá khứ, hành động xảy ra trước dùng Quá khứ hoàn thành (had + V3), hành động xảy ra sau dùng Quá khứ đơn.',
    examples: [
      { en: 'By the time we arrived at the station, the train had left.', vi: 'Khi chúng tôi tới ga thì tàu đã rời đi rồi.' },
      { en: 'Look at those dark clouds! It is going to rain.', vi: 'Nhìn những đám mây đen kìa! Trời sắp mưa rồi.' },
    ],
    commonMistakes: [
      'Chia động từ sau "will" ở dạng số nhiều hoặc thêm "to" (will to go -> will go).',
      'Nhầm lẫn thứ tự trước/sau giữa Quá khứ đơn và Quá khứ hoàn thành.',
    ],
  },
  {
    id: 'conditionals',
    category: 'Câu điều kiện',
    title: 'Câu điều kiện Loại 0, 1, 2, 3 & Hỗn hợp',
    gradeRange: 'Lớp 7–12',
    minGrade: 7,
    maxGrade: 12,
    formula: 'Loại 1: If + S + V(HTĐ), S + will + V | Loại 2: If + S + V2/were, S + would + V | Loại 3: If + S + had + V3, S + would have + V3',
    usage: 'Loại 1: có thật ở hiện tại/tương lai. Loại 2: không có thật ở hiện tại. Loại 3: trái với quá khứ.',
    explanationVi:
      'Ở điều kiện loại 2, động từ To Be luôn ưu tiên dùng "were" cho tất cả các ngôi (If I were you...). Có thể đảo ngữ bỏ "If" với Should / Were / Had ở bậc THPT.',
    examples: [
      { en: 'If you practice every day, your English will improve quickly.', vi: 'Nếu bạn luyện tập mỗi ngày, tiếng Anh của bạn sẽ tiến bộ nhanh chóng.' },
      { en: 'If I had known about the test, I would have reviewed earlier.', vi: 'Nếu tôi biết về bài kiểm tra, tôi đã ôn tập sớm hơn rồi.' },
    ],
    commonMistakes: [
      'Dùng "will" hoặc "would" ngay bên trong mệnh đề If.',
      'Nhầm lẫn giữa điều kiện loại 2 và loại 3 khi dịch câu ước hoặc giả định.',
    ],
  },
  {
    id: 'passive-voice',
    category: 'Câu bị động',
    title: 'Câu bị động qua các thì & Bị động đặc biệt',
    gradeRange: 'Lớp 7–12',
    minGrade: 7,
    maxGrade: 12,
    formula: 'S + be (chia theo thì) + V3/V-ed (+ by O)',
    usage: 'Nhấn mạnh đối tượng chịu tác động của hành động hoặc khi không cần nêu rõ người thực hiện.',
    explanationVi:
      'Lấy tân ngữ của câu chủ động làm chủ ngữ câu bị động. Động từ "be" luôn giữ đúng thì của câu gốc, động từ chính chuyển thành quá khứ phân từ (V3/V-ed).',
    examples: [
      { en: 'English is spoken all over the world.', vi: 'Tiếng Anh được nói trên toàn thế giới.' },
      { en: 'The school library was renovated last summer.', vi: 'Thư viện trường đã được sửa sang vào mùa hè năm ngoái.' },
    ],
    commonMistakes: [
      'Quên chia đúng thì cho động từ "be" hoặc bỏ quên V3/V-ed.',
      'Đặt trạng từ chỉ nơi chốn sau "by O" (thứ tự chuẩn: Nơi chốn + by O + Thời gian).',
    ],
  },
  {
    id: 'reported-speech',
    category: 'Câu tường thuật',
    title: 'Câu tường thuật (Câu kể, Câu hỏi & Câu mệnh lệnh)',
    gradeRange: 'Lớp 8–12',
    minGrade: 8,
    maxGrade: 12,
    formula: 'S + said (to O) / told O + (that) + S + V(lùi thì) | S + asked (O) + if/whether/Wh- + S + V(lùi thì)',
    usage: 'Dùng để thuật lại lời nói, câu hỏi hoặc yêu cầu của người khác.',
    explanationVi:
      'Khi động từ tường thuật ở quá khứ (said, told, asked), phải lùi 1 thì, đổi đại từ nhân xưng và đổi trạng từ chỉ thời gian/nơi chốn (now -> then, today -> that day, here -> there).',
    examples: [
      { en: 'The teacher told us that we would have a quiz the next day.', vi: 'Giáo viên bảo chúng tôi rằng ngày hôm sau chúng tôi sẽ có bài kiểm tra ngắn.' },
      { en: 'Minh asked me whether I liked learning grammar.', vi: 'Minh hỏi tôi liệu tôi có thích học ngữ pháp không.' },
    ],
    commonMistakes: [
      'Vẫn giữ dấu chấm hỏi hoặc đảo trợ động từ trong câu hỏi tường thuật.',
      'Quên lùi thì hoặc quên đổi trạng từ thời gian (tomorrow -> the next day).',
    ],
  },
  {
    id: 'comparisons',
    category: 'Câu so sánh',
    title: 'So sánh bằng, So sánh hơn, So sánh nhất & So sánh kép',
    gradeRange: 'Lớp 4–12',
    minGrade: 4,
    maxGrade: 12,
    formula: 'Bằng: as + adj/adv + as | Hơn: adj-er / more + adj + than | Nhất: the + adj-est / the most + adj | Kép: The + so sánh hơn..., the + so sánh hơn...',
    usage: 'So sánh đặc điểm, mức độ giữa hai hoặc nhiều người/vật/sự việc.',
    explanationVi:
      'Tính từ/trạng từ ngắn (1 âm tiết hoặc 2 âm tiết kết thúc bằng -y, -er, -ow, -et) thêm -er/-est. Tính từ dài dùng more/the most. Bất quy tắc: good -> better -> best; bad -> worse -> worst.',
    examples: [
      { en: 'This grammar lesson is clearer than the previous one.', vi: 'Bài học ngữ pháp này rõ ràng hơn bài trước.' },
      { en: 'The more you read, the wider your vocabulary becomes.', vi: 'Bạn càng đọc nhiều, vốn từ vựng của bạn càng rộng mở.' },
    ],
    commonMistakes: [
      'Dùng cả "more" và đuôi "-er" cùng lúc (more taller -> taller).',
      'Quên "the" trước tính từ so sánh nhất.',
    ],
  },
  {
    id: 'relative-clauses',
    category: 'Mệnh đề quan hệ',
    title: 'Mệnh đề quan hệ xác định, không xác định & Rút gọn',
    gradeRange: 'Lớp 9–12',
    minGrade: 9,
    maxGrade: 12,
    formula: 'N (người) + who/whom/whose + ... | N (vật) + which/whose + ... | where/when/why | Rút gọn: V-ing / V3 / to-V',
    usage: 'Bổ sung ý nghĩa chi tiết cho danh từ đứng trước để ghép câu mạch lạc và tự nhiên.',
    explanationVi:
      'Mệnh đề không xác định có dấu phẩy ngăn cách và KHÔNG được dùng "that". Rút gọn chủ động dùng V-ing, bị động dùng V3/V-ed, sau số thứ tự/so sánh nhất dùng to-V.',
    examples: [
      { en: 'The student who won the English contest is in class 10A.', vi: 'Học sinh người mà đã thắng cuộc thi tiếng Anh học lớp 10A.' },
      { en: 'The dictionary lying on the desk belongs to our teacher.', vi: 'Quyển từ điển đang nằm trên bàn thuộc về giáo viên của chúng tôi.' },
    ],
    commonMistakes: [
      'Dùng "that" sau dấu phẩy trong mệnh đề quan hệ không xác định.',
      'Lặp lại đại từ tân ngữ thừa ở cuối mệnh đề quan hệ (the book which I bought it -> which I bought).',
    ],
  },
  {
    id: 'sentence-structures',
    category: 'Cấu trúc câu',
    title: 'Các cấu trúc câu thông dụng (Used to, Too/Enough, It takes, Prefer)',
    gradeRange: 'Lớp 6–12',
    minGrade: 6,
    maxGrade: 12,
    formula: 'S + used to + V | S + be/get used to + V-ing | It takes + O + time + to V | S + prefer + V-ing + to + V-ing',
    usage: 'Diễn đạt thói quen quá khứ, sự quen thuộc, thời gian thực hiện hoặc sở thích/mức độ.',
    explanationVi:
      'Phân biệt kỹ "used to + V" (đã từng làm trong quá khứ, nay không còn) và "be used to + V-ing" (quen với việc gì ở hiện tại).',
    examples: [
      { en: 'It takes me 20 minutes to review vocabulary every evening.', vi: 'Tôi mất 20 phút để ôn tập từ vựng mỗi tối.' },
      { en: 'She is used to speaking English in front of her classmates.', vi: 'Cô ấy đã quen với việc nói tiếng Anh trước các bạn cùng lớp.' },
    ],
    commonMistakes: [
      'Dùng V nguyên mẫu sau "be used to" thay vì V-ing.',
      'Nhầm giới từ "than" với "to" trong cấu trúc prefer A to B.',
    ],
  },
  {
    id: 'parts-of-speech',
    category: 'Các loại từ',
    title: 'Từ loại: Danh từ, Động từ, Tính từ, Trạng từ, Giới từ & Mạo từ',
    gradeRange: 'Lớp 1–12',
    minGrade: 1,
    maxGrade: 12,
    formula: 'Mạo từ (a/an/the) + Adv + Adj + N | S + V + Adv',
    usage: 'Nhận biết vị trí và chức năng của từng loại từ để làm bài tập biến đổi từ (Word Form) và viết câu chuẩn.',
    explanationVi:
      'Tính từ đứng trước danh từ hoặc sau động từ liên kết (be, look, feel, seem, become). Trạng từ bổ nghĩa cho động từ thường, tính từ hoặc cả câu.',
    examples: [
      { en: 'She answered the difficult question very confidently.', vi: 'Cô ấy đã trả lời câu hỏi khó một cách rất tự tin.' },
      { en: 'An honest student always respects school rules.', vi: 'Một học sinh trung thực luôn tôn trọng nội quy trường học.' },
    ],
    commonMistakes: [
      'Dùng tính từ để bổ nghĩa cho động từ thường (speak fluent -> speak fluently).',
      'Chọn sai "a/an" dựa vào chữ cái viết thay vì âm đọc (a hour -> an hour; an university -> a university).',
    ],
  },
  {
    id: 'other-grammar',
    category: 'Các cấu trúc ngữ pháp khác',
    title: 'Đảo ngữ, Giả định thức & Sự hòa hợp Chủ ngữ – Động từ',
    gradeRange: 'Lớp 10–12',
    minGrade: 10,
    maxGrade: 12,
    formula: 'Đảo ngữ phủ định: Never/Seldom/Not only + Trợ ĐT + S + V | Giả định: S + suggest/recommend + that + S + (should) + V(nguyên mẫu)',
    usage: 'Nâng cao văn phong viết luận học thuật, bài thi THPT Quốc gia và IELTS/TOEFL.',
    explanationVi:
      'Khi từ phủ định đứng đầu câu (Never, Rarely, Hardly... when, No sooner... than), phải đảo trợ động từ lên trước chủ ngữ. Cấu trúc "The number of + N số nhiều" chia động từ số ít, còn "A number of + N số nhiều" chia số nhiều.',
    examples: [
      { en: 'Not only did she win the gold medal, but she also broke the record.', vi: 'Cô ấy không chỉ giành huy chương vàng mà còn phá kỷ lục.' },
      { en: 'The teacher suggested that every student practice listening daily.', vi: 'Giáo viên đề nghị rằng mỗi học sinh nên luyện nghe hằng ngày.' },
    ],
    commonMistakes: [
      'Chia động từ số nhiều cho "The number of students" hoặc "Each of the students".',
      'Quên đảo trợ động từ khi đưa "Only after / Not until" lên đầu câu.',
    ],
  },
];

export const GAME_TYPES: { id: GameType; label: string; description: string }[] = [
  {
    id: 'match',
    label: 'Ghép từ tiếng Anh với nghĩa tiếng Việt',
    description: 'Nối cặp từ tiếng Anh và nghĩa tiếng Việt tương ứng nhanh nhất.',
  },
  {
    id: 'multiple_choice',
    label: 'Chọn đáp án đúng',
    description: 'Trả lời câu hỏi trắc nghiệm 4 lựa chọn về từ vựng và ngữ pháp.',
  },
  {
    id: 'fill_blank',
    label: 'Điền từ còn thiếu',
    description: 'Hoàn thành câu tiếng Anh bằng cách điền hoặc chọn từ thích hợp.',
  },
  {
    id: 'sentence_order',
    label: 'Sắp xếp từ thành câu',
    description: 'Sắp xếp các thẻ từ bị xáo trộn thành câu tiếng Anh hoàn chỉnh.',
  },
  {
    id: 'image_guess',
    label: 'Nhìn hình đoán từ tiếng Anh',
    description: 'Quan sát biểu tượng hình ảnh trực quan và đoán đúng từ tiếng Anh.',
  },
  {
    id: 'listening_choice',
    label: 'Nghe phát âm và chọn từ đúng',
    description: 'Nghe giọng đọc chuẩn qua Web Speech API và chọn từ tương ứng.',
  },
];
