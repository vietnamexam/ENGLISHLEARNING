import type {
  ExamQuestion,
  ExamQuestionType,
  ExamRecord,
  SampleBankQuestion,
  SampleQuestionGradeGroup,
} from '../types';

export const EXAM_QUESTION_TYPE_OPTIONS: {
  id: ExamQuestionType;
  label: string;
  defaultSection: string;
}[] = [
  { id: 'vocabulary', label: 'Từ vựng (Vocabulary)', defaultSection: 'Phần Từ vựng (Vocabulary)' },
  { id: 'grammar', label: 'Ngữ pháp (Grammar)', defaultSection: 'Phần Ngữ pháp (Grammar)' },
  {
    id: 'multiple_choice',
    label: 'Trắc nghiệm tổng hợp (Multiple Choice)',
    defaultSection: 'Phần Trắc nghiệm tổng hợp (Multiple Choice)',
  },
  { id: 'fill_blank', label: 'Điền từ (Fill in the blank)', defaultSection: 'Phần Điền từ (Fill in the blank)' },
  {
    id: 'sentence_order',
    label: 'Sắp xếp câu (Sentence Ordering)',
    defaultSection: 'Phần Sắp xếp câu (Sentence Ordering)',
  },
  {
    id: 'reading',
    label: 'Đọc hiểu (Reading Comprehension)',
    defaultSection: 'Phần Đọc hiểu (Reading Comprehension)',
  },
  { id: 'listening', label: 'Nghe hiểu (Listening)', defaultSection: 'Phần Nghe hiểu (Listening)' },
  {
    id: 'other',
    label: 'Tìm lỗi sai & Viết lại câu',
    defaultSection: 'Phần Tìm lỗi sai & Viết lại câu (Error & Transformation)',
  },
];

export const SAMPLE_GRADE_GROUP_OPTIONS: {
  id: SampleQuestionGradeGroup;
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả cấp học (Lớp 1–12)' },
  { id: 'primary', label: 'Tiểu học (Lớp 1–5)' },
  { id: 'secondary', label: 'THCS (Lớp 6–9)' },
  { id: 'high', label: 'THPT (Lớp 10–12)' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffleArray(arr).slice(0, Math.min(count, arr.length));
}

export const EXAM_QUESTION_BANK: Record<ExamQuestionType, ExamQuestion[]> = {
  vocabulary: [
    {
      id: 'ev1',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'Choose the English word meaning "Thư viện":',
      options: ['Library', 'Bookstore', 'Museum', 'Laboratory'],
      correctAnswer: 'Library',
      points: 1,
    },
    {
      id: 'ev2',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'Which word means "Tự tin" in English?',
      options: ['Confident', 'Careful', 'Polite', 'Friendly'],
      correctAnswer: 'Confident',
      points: 1,
    },
    {
      id: 'ev3',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'Choose the antonym (từ trái nghĩa) of "generous":',
      options: ['selfish', 'kind', 'helpful', 'honest'],
      correctAnswer: 'selfish',
      points: 1,
    },
    {
      id: 'ev4',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'A person who designs buildings is an ______.',
      options: ['architect', 'engineer', 'accountant', 'astronaut'],
      correctAnswer: 'architect',
      points: 1,
    },
    {
      id: 'ev5',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'Which of the following is NOT a flower?',
      options: ['Pineapple', 'Lotus', 'Sunflower', 'Orchid'],
      correctAnswer: 'Pineapple',
      points: 1,
    },
    {
      id: 'ev6',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'Solar energy is a ______ source of power that does not harm nature.',
      options: ['renewable', 'polluted', 'temporary', 'dangerous'],
      correctAnswer: 'renewable',
      points: 1,
    },
    {
      id: 'ev7',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'What is the Vietnamese meaning of "environment"?',
      options: ['Môi trường', 'Kinh nghiệm', 'Thiết bị', 'Thí nghiệm'],
      correctAnswer: 'Môi trường',
      points: 1,
    },
    {
      id: 'ev8',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'Students should review their notes ______ before the final test.',
      options: ['regularly', 'rarely', 'hardly', 'carelessly'],
      correctAnswer: 'regularly',
      points: 1,
    },
    {
      id: 'ev9',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'Choose the closest synonym (từ đồng nghĩa) to "enormous":',
      options: ['huge', 'tiny', 'narrow', 'weak'],
      correctAnswer: 'huge',
      points: 1,
    },
    {
      id: 'ev10',
      section: 'Phần Từ vựng (Vocabulary)',
      questionType: 'vocabulary',
      prompt: 'Which animal lives in the ocean and breathes air?',
      options: ['Dolphin', 'Elephant', 'Eagle', 'Giraffe'],
      correctAnswer: 'Dolphin',
      points: 1,
    },
  ],
  grammar: [
    {
      id: 'eg1',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'Every morning, Mai ______ up at 6 o’clock and brushes her teeth.',
      options: ['gets', 'get', 'getting', 'got'],
      correctAnswer: 'gets',
      points: 1,
    },
    {
      id: 'eg2',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'While I ______ dinner yesterday, my friend called me.',
      options: ['was cooking', 'cooked', 'cook', 'am cooking'],
      correctAnswer: 'was cooking',
      points: 1,
    },
    {
      id: 'eg3',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'If we plant more trees, the air ______ cleaner.',
      options: ['will become', 'became', 'would become', 'had become'],
      correctAnswer: 'will become',
      points: 1,
    },
    {
      id: 'eg4',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'This historic bridge ______ more than a hundred years ago.',
      options: ['was built', 'built', 'is built', 'has built'],
      correctAnswer: 'was built',
      points: 1,
    },
    {
      id: 'eg5',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'She asked me where ______ from.',
      options: ['I came', 'did I come', 'do I come', 'came I'],
      correctAnswer: 'I came',
      points: 1,
    },
    {
      id: 'eg6',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'If Minh had studied harder, he ______ the scholarship.',
      options: ['would have won', 'will win', 'won', 'would win'],
      correctAnswer: 'would have won',
      points: 1,
    },
    {
      id: 'eg7',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'You have finished the project, ______?',
      options: ['haven’t you', 'have you', 'didn’t you', 'aren’t you'],
      correctAnswer: 'haven’t you',
      points: 1,
    },
    {
      id: 'eg8',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'The teacher, ______ classes are always lively, won an award.',
      options: ['whose', 'who', 'which', 'whom'],
      correctAnswer: 'whose',
      points: 1,
    },
    {
      id: 'eg9',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'No sooner ______ the classroom than the bell rang.',
      options: ['had we entered', 'we had entered', 'did we enter', 'we entered'],
      correctAnswer: 'had we entered',
      points: 1,
    },
    {
      id: 'eg10',
      section: 'Phần Ngữ pháp (Grammar)',
      questionType: 'grammar',
      prompt: 'The number of students participating in the English club ______ increasing.',
      options: ['is', 'are', 'were', 'have been'],
      correctAnswer: 'is',
      points: 1,
    },
  ],
  multiple_choice: [
    {
      id: 'emc1',
      section: 'Phần Trắc nghiệm tổng hợp (Multiple Choice)',
      questionType: 'multiple_choice',
      prompt: '“Thank you very much for helping me.” — “______”',
      options: ['You’re welcome.', 'Yes, please.', 'I’m sorry.', 'Good luck!'],
      correctAnswer: 'You’re welcome.',
      points: 1,
    },
    {
      id: 'emc2',
      section: 'Phần Trắc nghiệm tổng hợp (Multiple Choice)',
      questionType: 'multiple_choice',
      prompt: 'Which word has a different underlined vowel sound? (b_oo_k / l_oo_k / f_oo_d / g_oo_d)',
      options: ['food', 'book', 'look', 'good'],
      correctAnswer: 'food',
      points: 1,
    },
    {
      id: 'emc3',
      section: 'Phần Trắc nghiệm tổng hợp (Multiple Choice)',
      questionType: 'multiple_choice',
      prompt: 'Choose the word with a different stress pattern:',
      options: ['engineer', 'teacher', 'student', 'doctor'],
      correctAnswer: 'engineer',
      points: 1,
    },
    {
      id: 'emc4',
      section: 'Phần Trắc nghiệm tổng hợp (Multiple Choice)',
      questionType: 'multiple_choice',
      prompt: '“Would you like to join our English speaking contest?” — “______”',
      options: ['Yes, I’d love to.', 'No, I am not.', 'See you yesterday.', 'I’m fine, thanks.'],
      correctAnswer: 'Yes, I’d love to.',
      points: 1,
    },
    {
      id: 'emc5',
      section: 'Phần Trắc nghiệm tổng hợp (Multiple Choice)',
      questionType: 'multiple_choice',
      prompt: 'She is keen ______ playing the piano in her free time.',
      options: ['on', 'at', 'for', 'with'],
      correctAnswer: 'on',
      points: 1,
    },
    {
      id: 'emc6',
      section: 'Phần Trắc nghiệm tổng hợp (Multiple Choice)',
      questionType: 'multiple_choice',
      prompt: 'Despite ______ heavy rain, the students arrived on time.',
      options: ['the', 'although', 'because', 'of'],
      correctAnswer: 'the',
      points: 1,
    },
    {
      id: 'emc7',
      section: 'Phần Trắc nghiệm tổng hợp (Multiple Choice)',
      questionType: 'multiple_choice',
      prompt: 'How often do you practice English? — “______.”',
      options: ['Three times a week', 'For two hours', 'By bus', 'At 8 a.m.'],
      correctAnswer: 'Three times a week',
      points: 1,
    },
    {
      id: 'emc8',
      section: 'Phần Trắc nghiệm tổng hợp (Multiple Choice)',
      questionType: 'multiple_choice',
      prompt: 'It is very important ______ polite to elders.',
      options: ['to be', 'being', 'be', 'been'],
      correctAnswer: 'to be',
      points: 1,
    },
  ],
  fill_blank: [
    {
      id: 'efb1',
      section: 'Phần Điền từ (Fill in the blank)',
      questionType: 'fill_blank',
      prompt: 'Điền đúng 1 từ còn thiếu (a / an / the): My brother wants to buy ____ umbrella because it is raining.',
      options: [],
      correctAnswer: 'an',
      points: 1,
    },
    {
      id: 'efb2',
      section: 'Phần Điền từ (Fill in the blank)',
      questionType: 'fill_blank',
      prompt: 'Điền đúng giới từ (in / on / at): We celebrate Vietnamese Teachers’ Day ____ November 20th.',
      options: [],
      correctAnswer: 'on',
      points: 1,
    },
    {
      id: 'efb3',
      section: 'Phần Điền từ (Fill in the blank)',
      questionType: 'fill_blank',
      prompt: 'Điền dạng đúng của động từ trong ngoặc: Look! The children (sing) ____ an English song.',
      options: [],
      correctAnswer: 'are singing',
      points: 1,
    },
    {
      id: 'efb4',
      section: 'Phần Điền từ (Fill in the blank)',
      questionType: 'fill_blank',
      prompt: 'Điền dạng đúng của động từ trong ngoặc: Yesterday, Lan (write) ____ a postcard to her pen pal.',
      options: [],
      correctAnswer: 'wrote',
      points: 1,
    },
    {
      id: 'efb5',
      section: 'Phần Điền từ (Fill in the blank)',
      questionType: 'fill_blank',
      prompt: 'Điền từ so sánh đúng (good): Speaking is often harder than listening, but practice makes it ____.',
      options: [],
      correctAnswer: 'better',
      points: 1,
    },
    {
      id: 'efb6',
      section: 'Phần Điền từ (Fill in the blank)',
      questionType: 'fill_blank',
      prompt: 'Điền từ để hỏi phù hợp (How many / How much): ____ water should we drink every day?',
      options: [],
      correctAnswer: 'How much',
      points: 1,
    },
    {
      id: 'efb7',
      section: 'Phần Điền từ (Fill in the blank)',
      questionType: 'fill_blank',
      prompt: 'Điền đại từ quan hệ thích hợp (who / which): The dictionary ____ I bought last week is very helpful.',
      options: [],
      correctAnswer: 'which',
      points: 1,
    },
    {
      id: 'efb8',
      section: 'Phần Điền từ (Fill in the blank)',
      questionType: 'fill_blank',
      prompt: 'Điền từ nối phù hợp (because / although): She got high marks ____ she revised every lesson carefully.',
      options: [],
      correctAnswer: 'because',
      points: 1,
    },
  ],
  sentence_order: [
    {
      id: 'eso1',
      section: 'Phần Sắp xếp câu (Sentence Ordering)',
      questionType: 'sentence_order',
      prompt: 'Sắp xếp thành câu hoàn chỉnh: subject / favorite / is / My / English.',
      options: [],
      correctAnswer: 'My favorite subject is English.',
      points: 1,
    },
    {
      id: 'eso2',
      section: 'Phần Sắp xếp câu (Sentence Ordering)',
      questionType: 'sentence_order',
      prompt: 'Sắp xếp thành câu hoàn chỉnh: goes / library / to / week. / twice / a / She / the',
      options: [],
      correctAnswer: 'She goes to the library twice a week.',
      points: 1,
    },
    {
      id: 'eso3',
      section: 'Phần Sắp xếp câu (Sentence Ordering)',
      questionType: 'sentence_order',
      prompt: 'Sắp xếp thành câu hoàn chỉnh: should / trees / protect / We / plant / to / nature.',
      options: [],
      correctAnswer: 'We should plant trees to protect nature.',
      points: 1,
    },
    {
      id: 'eso4',
      section: 'Phần Sắp xếp câu (Sentence Ordering)',
      questionType: 'sentence_order',
      prompt: 'Sắp xếp thành câu hoàn chỉnh: sunny / If / is / tomorrow, / will / go / we / camping. / it',
      options: [],
      correctAnswer: 'If it is sunny tomorrow, we will go camping.',
      points: 1,
    },
    {
      id: 'eso5',
      section: 'Phần Sắp xếp câu (Sentence Ordering)',
      questionType: 'sentence_order',
      prompt: 'Sắp xếp thành câu hoàn chỉnh: spoken / is / around / English / the / world.',
      options: [],
      correctAnswer: 'English is spoken around the world.',
      points: 1,
    },
    {
      id: 'eso6',
      section: 'Phần Sắp xếp câu (Sentence Ordering)',
      questionType: 'sentence_order',
      prompt: 'Sắp xếp thành câu hoàn chỉnh: you / more / The / read, / learn. / more / you / the',
      options: [],
      correctAnswer: 'The more you read, the more you learn.',
      points: 1,
    },
  ],
  reading: [
    {
      id: 'er1',
      section: 'Phần Đọc hiểu (Reading Comprehension)',
      questionType: 'reading',
      passage:
        'Reading Passage 1: Reading English stories every day is one of the best ways for students to improve their vocabulary. When you read in context, you naturally understand how words work together. Even spending just fifteen minutes before bedtime can help you remember dozens of new phrases each month.',
      prompt: 'According to the passage, how long should students spend reading before bedtime?',
      options: ['Fifteen minutes', 'Two hours', 'Five seconds', 'All night'],
      correctAnswer: 'Fifteen minutes',
      points: 1,
    },
    {
      id: 'er2',
      section: 'Phần Đọc hiểu (Reading Comprehension)',
      questionType: 'reading',
      passage:
        'Reading Passage 1: Reading English stories every day is one of the best ways for students to improve their vocabulary. When you read in context, you naturally understand how words work together. Even spending just fifteen minutes before bedtime can help you remember dozens of new phrases each month.',
      prompt: 'Why is reading in context helpful?',
      options: [
        'It helps you understand how words work together',
        'It replaces all school exams',
        'It teaches only Mathematics',
        'It makes books shorter',
      ],
      correctAnswer: 'It helps you understand how words work together',
      points: 1,
    },
    {
      id: 'er3',
      section: 'Phần Đọc hiểu (Reading Comprehension)',
      questionType: 'reading',
      passage:
        'Reading Passage 2: Green schools around the world encourage students to save electricity, reduce plastic waste, and plant trees in the schoolyard. In Vietnam, many classrooms organize recycling clubs where students turn old paper into useful notebooks and art projects.',
      prompt: 'What do students in recycling clubs turn old paper into?',
      options: [
        'Notebooks and art projects',
        'Plastic bottles',
        'Glass windows',
        'Computers',
      ],
      correctAnswer: 'Notebooks and art projects',
      points: 1,
    },
    {
      id: 'er4',
      section: 'Phần Đọc hiểu (Reading Comprehension)',
      questionType: 'reading',
      passage:
        'Reading Passage 2: Green schools around the world encourage students to save electricity, reduce plastic waste, and plant trees in the schoolyard. In Vietnam, many classrooms organize recycling clubs where students turn old paper into useful notebooks and art projects.',
      prompt: 'Which activity is NOT mentioned as part of green schools?',
      options: [
        'Buying new cars',
        'Saving electricity',
        'Reducing plastic waste',
        'Planting trees',
      ],
      correctAnswer: 'Buying new cars',
      points: 1,
    },
    {
      id: 'er5',
      section: 'Phần Đọc hiểu (Reading Comprehension)',
      questionType: 'reading',
      passage:
        'Reading Passage 3: Artificial intelligence is transforming language education by providing instant pronunciation feedback and personalized grammar exercises. However, teachers remain essential because they inspire curiosity, guide critical thinking, and build warm classroom communities.',
      prompt: 'What is the main idea of the passage?',
      options: [
        'AI supports language learning, while teachers remain essential',
        'AI will completely replace all schools next year',
        'Grammar exercises are no longer useful',
        'Students should never talk in class',
      ],
      correctAnswer: 'AI supports language learning, while teachers remain essential',
      points: 1,
    },
    {
      id: 'er6',
      section: 'Phần Đọc hiểu (Reading Comprehension)',
      questionType: 'reading',
      passage:
        'Reading Passage 3: Artificial intelligence is transforming language education by providing instant pronunciation feedback and personalized grammar exercises. However, teachers remain essential because they inspire curiosity, guide critical thinking, and build warm classroom communities.',
      prompt: 'How does AI help learners according to the text?',
      options: [
        'By giving instant pronunciation feedback and personalized exercises',
        'By building physical school buildings',
        'By grading sports competitions',
        'By printing paper textbooks',
      ],
      correctAnswer: 'By giving instant pronunciation feedback and personalized exercises',
      points: 1,
    },
  ],
  listening: [
    {
      id: 'el1',
      section: 'Phần Nghe hiểu (Listening)',
      questionType: 'listening',
      prompt: 'My favorite subject at school is English because I love communicating with friends.',
      options: [
        'English',
        'History',
        'Chemistry',
        'Geography',
      ],
      correctAnswer: 'English',
      points: 1,
    },
    {
      id: 'el2',
      section: 'Phần Nghe hiểu (Listening)',
      questionType: 'listening',
      prompt: 'The train to Da Nang leaves at half past eight in the morning.',
      options: ['8:30 a.m.', '7:30 a.m.', '9:15 a.m.', '6:45 p.m.'],
      correctAnswer: '8:30 a.m.',
      points: 1,
    },
    {
      id: 'el3',
      section: 'Phần Nghe hiểu (Listening)',
      questionType: 'listening',
      prompt: 'Please remember to bring your umbrella because the weather forecast says it will rain.',
      options: ['Rainy', 'Snowy', 'Sunny and dry', 'Windy'],
      correctAnswer: 'Rainy',
      points: 1,
    },
    {
      id: 'el4',
      section: 'Phần Nghe hiểu (Listening)',
      questionType: 'listening',
      prompt: 'Linh wants to become a doctor to take care of patients in her hometown.',
      options: ['Doctor', 'Pilot', 'Artist', 'Journalist'],
      correctAnswer: 'Doctor',
      points: 1,
    },
    {
      id: 'el5',
      section: 'Phần Nghe hiểu (Listening)',
      questionType: 'listening',
      prompt: 'There are thirty-five students in class seven A.',
      options: ['35', '25', '45', '53'],
      correctAnswer: '35',
      points: 1,
    },
    {
      id: 'el6',
      section: 'Phần Nghe hiểu (Listening)',
      questionType: 'listening',
      prompt: 'Our school library opens from Monday to Saturday every week.',
      options: ['Monday to Saturday', 'Only Sunday', 'Tuesday to Thursday', 'Every night'],
      correctAnswer: 'Monday to Saturday',
      points: 1,
    },
  ],
  other: [
    {
      id: 'eo1',
      section: 'Phần Tìm lỗi sai & Viết lại câu (Error & Transformation)',
      questionType: 'other',
      prompt: 'Tìm từ sai trong câu: "She don’t like eating fast food very much."',
      options: ['don’t', 'like', 'eating', 'very much'],
      correctAnswer: 'don’t',
      points: 1,
    },
    {
      id: 'eo2',
      section: 'Phần Tìm lỗi sai & Viết lại câu (Error & Transformation)',
      questionType: 'other',
      prompt: 'Chọn câu đồng nghĩa: "He is taller than his brother."',
      options: [
        'His brother is not as tall as him.',
        'His brother is taller than him.',
        'They have the same height.',
        'He is the shortest in his family.',
      ],
      correctAnswer: 'His brother is not as tall as him.',
      points: 1,
    },
    {
      id: 'eo3',
      section: 'Phần Tìm lỗi sai & Viết lại câu (Error & Transformation)',
      questionType: 'other',
      prompt: 'Tìm từ sai trong câu: "Although it rained heavily, but they still went to school."',
      options: ['but', 'Although', 'heavily', 'went'],
      correctAnswer: 'but',
      points: 1,
    },
    {
      id: 'eo4',
      section: 'Phần Tìm lỗi sai & Viết lại câu (Error & Transformation)',
      questionType: 'other',
      prompt: 'Chọn câu tường thuật đúng cho: Lan said, "I am doing my homework now."',
      options: [
        'Lan said she was doing her homework then.',
        'Lan said she is doing her homework now.',
        'Lan said I was doing my homework then.',
        'Lan asked she was doing her homework.',
      ],
      correctAnswer: 'Lan said she was doing her homework then.',
      points: 1,
    },
    {
      id: 'eo5',
      section: 'Phần Tìm lỗi sai & Viết lại câu (Error & Transformation)',
      questionType: 'other',
      prompt: 'Chọn câu bị động đúng cho: "Students clean the classroom every afternoon."',
      options: [
        'The classroom is cleaned by students every afternoon.',
        'The classroom was cleaned every afternoon.',
        'Students are cleaned by the classroom.',
        'The classroom is cleaning every afternoon.',
      ],
      correctAnswer: 'The classroom is cleaned by students every afternoon.',
      points: 1,
    },
    {
      id: 'eo6',
      section: 'Phần Tìm lỗi sai & Viết lại câu (Error & Transformation)',
      questionType: 'other',
      prompt: 'Tìm từ sai trong câu: "If I will have enough money, I will buy a new bicycle."',
      options: ['will have', 'enough', 'will buy', 'a new'],
      correctAnswer: 'will have',
      points: 1,
    },
  ],
};

interface SampleExamSpec {
  id: string;
  title: string;
  gradeLevel: number;
  topic: string;
  durationMinutes: number;
  distribution: { type: ExamQuestionType; count: number }[];
}

export const SAMPLE_EXAM_SPECS: SampleExamSpec[] = [
  {
    id: 'sample-exam-1',
    title: 'Đề mẫu 1 · Luyện tập tổng hợp Tiểu học (Từ vựng, Ngữ pháp, Điền từ, Nghe)',
    gradeLevel: 5,
    topic: 'Tổng hợp Tiểu học (Lớp 1–5)',
    durationMinutes: 25,
    distribution: [
      { type: 'vocabulary', count: 2 },
      { type: 'grammar', count: 2 },
      { type: 'multiple_choice', count: 2 },
      { type: 'fill_blank', count: 2 },
      { type: 'sentence_order', count: 1 },
      { type: 'listening', count: 1 },
    ],
  },
  {
    id: 'sample-exam-2',
    title: 'Đề mẫu 2 · Luyện tập đủ 8 dạng bài THCS (Đọc hiểu, Nghe, Sắp xếp, Lỗi sai)',
    gradeLevel: 8,
    topic: 'Tổng hợp THCS (Lớp 6–9)',
    durationMinutes: 35,
    distribution: [
      { type: 'vocabulary', count: 2 },
      { type: 'grammar', count: 2 },
      { type: 'multiple_choice', count: 2 },
      { type: 'fill_blank', count: 2 },
      { type: 'sentence_order', count: 2 },
      { type: 'reading', count: 2 },
      { type: 'listening', count: 2 },
      { type: 'other', count: 2 },
    ],
  },
  {
    id: 'sample-exam-3',
    title: 'Đề mẫu 3 · Luyện tập nâng cao THPT (Đủ thể loại câu hỏi thi chuẩn)',
    gradeLevel: 11,
    topic: 'Tổng hợp THPT (Lớp 10–12)',
    durationMinutes: 45,
    distribution: [
      { type: 'vocabulary', count: 2 },
      { type: 'grammar', count: 3 },
      { type: 'multiple_choice', count: 2 },
      { type: 'fill_blank', count: 2 },
      { type: 'sentence_order', count: 2 },
      { type: 'reading', count: 2 },
      { type: 'listening', count: 1 },
      { type: 'other', count: 2 },
    ],
  },
];

function getGradeGroupForLevel(gradeLevel: number): SampleQuestionGradeGroup {
  if (gradeLevel <= 5) return 'primary';
  if (gradeLevel <= 9) return 'secondary';
  return 'high';
}

export function buildSampleExamFromSpec(
  spec: SampleExamSpec,
  extraBankQuestions: SampleBankQuestion[] = []
): ExamRecord {
  const targetGroup = getGradeGroupForLevel(spec.gradeLevel);
  const matchingExtras = extraBankQuestions.filter(
    (q) => q.isActive !== false && (q.gradeGroup === 'all' || q.gradeGroup === targetGroup)
  );

  const questions: ExamQuestion[] = [];
  for (const slot of spec.distribution) {
    const basePool = EXAM_QUESTION_BANK[slot.type] || [];
    const extraPool: ExamQuestion[] = matchingExtras
      .filter((q) => q.questionType === slot.type)
      .map((q) => ({
        id: `fb-${q.id}`,
        section: q.section || 'Phần bổ sung từ kho Admin',
        questionType: q.questionType,
        prompt: q.prompt,
        passage: q.passage || undefined,
        options: Array.isArray(q.options) ? q.options.filter(Boolean) : [],
        correctAnswer: q.correctAnswer,
        points: Number(q.points) || 1,
      }));

    const combinedPool = [...basePool, ...extraPool];
    const chosen = pickRandom(combinedPool, slot.count).map((q) => ({
      ...q,
      options: q.options ? shuffleArray(q.options) : [],
    }));
    questions.push(...chosen);
  }

  return {
    id: spec.id,
    teacherId: 'system-sample',
    title: spec.title,
    gradeLevel: spec.gradeLevel,
    topic: spec.topic,
    durationMinutes: spec.durationMinutes,
    maxScore: 10,
    allowViewAnswers: true,
    allowRetake: true,
    isActive: true,
    questions,
  };
}

export function buildAllSampleExams(
  extraBankQuestions: SampleBankQuestion[] = []
): ExamRecord[] {
  return SAMPLE_EXAM_SPECS.map((spec) => buildSampleExamFromSpec(spec, extraBankQuestions));
}

export function rerollSampleExamById(
  examId: string,
  extraBankQuestions: SampleBankQuestion[] = []
): ExamRecord | null {
  const spec = SAMPLE_EXAM_SPECS.find((s) => s.id === examId);
  return spec ? buildSampleExamFromSpec(spec, extraBankQuestions) : null;
}
