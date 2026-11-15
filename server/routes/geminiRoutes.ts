import { Type } from '@google/genai';
import express from 'express';
import mammoth from 'mammoth';
import multer from 'multer';
import {
  optionalFirebaseAuth,
  requireTeacherAndVipCheck,
  type RequestWithAuth,
} from '../authMiddleware.ts';
import { formatGeminiError, GEMINI_MODEL, getGeminiClient } from '../geminiClient.ts';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const ttsCache = new Map<string, string>();

router.post('/tts', optionalFirebaseAuth, async (req: RequestWithAuth, res) => {
  try {
    const { text, lang } = req.body as { text?: string; lang?: 'vi' | 'en' };
    const cleanText = String(text || '').trim().slice(0, 600);
    if (!cleanText) {
      res.status(400).json({ error: 'Vui lòng cung cấp nội dung cần đọc.' });
      return;
    }
    const targetLang = lang === 'en' ? 'en' : 'vi';
    const cacheKey = `${targetLang}:${cleanText}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({ audioBase64: cached, mimeType: 'audio/wav' });
      return;
    }

    const ai = getGeminiClient();
    const style =
      targetLang === 'vi'
        ? 'Clear, warm, natural standard Vietnamese teacher voice, accurate tones and pronunciation'
        : 'Clear, natural standard American English teacher voice, articulate pronunciation';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: targetLang === 'vi' ? 'Zephyr' : 'Kore',
            },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(500).json({ error: 'Không tạo được dữ liệu âm thanh TTS.' });
      return;
    }

    if (ttsCache.size >= 120) {
      const oldestKey = ttsCache.keys().next().value;
      if (oldestKey) ttsCache.delete(oldestKey);
    }
    ttsCache.set(cacheKey, base64Audio);
    res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

router.post('/vocab', optionalFirebaseAuth, async (req: RequestWithAuth, res) => {
  try {
    const { words, topic } = req.body as { words?: string[]; topic?: string };
    if (!Array.isArray(words) || words.length === 0) {
      res.status(400).json({ error: 'Vui lòng nhập ít nhất một từ tiếng Việt.' });
      return;
    }
    const sanitizedWords = words
      .map((w) => String(w || '').trim())
      .filter(Boolean)
      .slice(0, 15);

    if (sanitizedWords.length === 0) {
      res.status(400).json({ error: 'Danh sách từ không hợp lệ.' });
      return;
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Chủ đề từ vựng: "${topic || 'Chung'}".
Hãy dịch và phân tích các từ/cụm từ tiếng Việt sau sang tiếng Anh chuẩn cho học sinh phổ thông (lớp 1-12):
${sanitizedWords.map((w, i) => `${i + 1}. ${w}`).join('\n')}`,
      config: {
        systemInstruction:
          'Bạn là giáo viên tiếng Anh chuyên nghiệp. Hãy trả về kết quả JSON chính xác gồm từ tiếng Anh, phiên âm IPA chuẩn Anh-Anh/Anh-Mỹ, loại từ (noun/verb/adjective/adverb/preposition/phrase...), nghĩa tiếng Việt ngắn gọn, và 1 câu ví dụ tiếng Anh tự nhiên kèm nghĩa tiếng Việt.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              vietnamese: { type: Type.STRING },
              english: { type: Type.STRING },
              ipa: { type: Type.STRING },
              partOfSpeech: { type: Type.STRING },
              exampleEn: { type: Type.STRING },
              exampleVi: { type: Type.STRING },
            },
            required: ['vietnamese', 'english', 'ipa', 'partOfSpeech', 'exampleEn', 'exampleVi'],
          },
        },
      },
    });

    const items = JSON.parse((response.text ?? '[]').trim());
    res.json({ items });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

router.post('/grammar-analyze', optionalFirebaseAuth, async (req: RequestWithAuth, res) => {
  try {
    const { sentence, topicTitle, gradeLevel } = req.body as {
      sentence?: string;
      topicTitle?: string;
      gradeLevel?: string;
    };
    const cleanSentence = String(sentence || '').trim();
    if (!cleanSentence) {
      res.status(400).json({ error: 'Vui lòng nhập câu tiếng Việt cần phân tích.' });
      return;
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Chuyên đề đang học: "${topicTitle || 'Ngữ pháp tổng hợp'}" (${gradeLevel || 'Lớp 1-12'}).
Câu tiếng Việt học sinh nhập: "${cleanSentence}"`,
      config: {
        systemInstruction:
          'Bạn là giáo viên tiếng Anh từ lớp 1 đến lớp 12. Hãy dịch câu tiếng Việt sang tiếng Anh tự nhiên và chính xác, xác định cấu trúc ngữ pháp được sử dụng, giải thích rõ ràng bằng tiếng Việt tại sao sử dụng cấu trúc đó, và lưu ý lỗi dễ mắc nếu có.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            englishTranslation: { type: Type.STRING },
            grammarStructure: { type: Type.STRING },
            explanationVi: { type: Type.STRING },
            notes: { type: Type.STRING },
          },
          required: ['englishTranslation', 'grammarStructure', 'explanationVi', 'notes'],
        },
      },
    });

    const result = JSON.parse((response.text ?? '{}').trim());
    res.json(result);
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

router.post('/grammar-examples', optionalFirebaseAuth, async (req: RequestWithAuth, res) => {
  try {
    const { topicTitle, formula, gradeLevel } = req.body as {
      topicTitle?: string;
      formula?: string;
      gradeLevel?: string;
    };
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Hãy tạo đúng 3 câu mẫu tiếng Anh ngẫu nhiên, đa dạng ngữ cảnh học đường và đời sống, phù hợp với chuyên đề: "${topicTitle || 'Ngữ pháp'}" (Công thức tham khảo: ${formula || 'chuẩn'}), trình độ ${gradeLevel || 'Lớp 1-12'}.`,
      config: {
        systemInstruction:
          'Mỗi câu mẫu gồm: câu tiếng Anh tự nhiên, nghĩa tiếng Việt chính xác, và phân tích cấu trúc ngữ pháp chi tiết bằng tiếng Việt.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING },
              vietnamese: { type: Type.STRING },
              analysis: { type: Type.STRING },
            },
            required: ['english', 'vietnamese', 'analysis'],
          },
        },
      },
    });

    const examples = JSON.parse((response.text ?? '[]').trim());
    res.json({ examples });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

router.post('/translate', optionalFirebaseAuth, async (req: RequestWithAuth, res) => {
  try {
    const { text, direction, explainDetails } = req.body as {
      text?: string;
      direction?: 'en-vi' | 'vi-en';
      explainDetails?: boolean;
    };
    const cleanText = String(text || '').trim();
    if (!cleanText) {
      res.status(400).json({ error: 'Vui lòng nhập nội dung cần dịch.' });
      return;
    }

    const dirLabel =
      direction === 'vi-en' ? 'từ Tiếng Việt sang Tiếng Anh' : 'từ Tiếng Anh sang Tiếng Việt';

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Hãy dịch toàn bộ nội dung sau ${dirLabel}. Không bỏ sót bất kỳ câu hoặc đoạn nào:\n\n${cleanText}`,
      config: {
        systemInstruction: `Bạn là dịch giả song ngữ Anh - Việt xuất sắc. Yêu cầu bắt buộc:
1. Dịch chính xác về ngữ nghĩa và tự nhiên trong cách diễn đạt.
2. Giữ nguyên đầy đủ toàn bộ nội dung gốc, tuyệt đối không tự ý lược bỏ câu hay đoạn.
${
  explainDetails
    ? '3. Liệt kê các từ vựng khó/quan trọng (kèm IPA, nghĩa) và giải thích các cấu trúc ngữ pháp nổi bật bằng tiếng Việt.'
    : '3. Để trống mảng difficultWords và chuỗi grammarNotes nếu không được yêu cầu giải thích.'
}`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            difficultWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  ipa: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  usage: { type: Type.STRING },
                },
                required: ['word', 'ipa', 'meaning', 'usage'],
              },
            },
            grammarNotes: { type: Type.STRING },
          },
          required: ['translatedText', 'difficultWords', 'grammarNotes'],
        },
      },
    });

    const result = JSON.parse((response.text ?? '{}').trim());
    res.json(result);
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

router.post('/generate-game', requireTeacherAndVipCheck, async (req: RequestWithAuth, res) => {
  try {
    const { gameType, topic, difficulty, questionCount } = req.body as {
      gameType?: string;
      topic?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      questionCount?: number;
    };

    const count = Math.min(Math.max(Number(questionCount) || 5, 1), 20);
    const ai = getGeminiClient();

    const typeInstructionMap: Record<string, string> = {
      match:
        'Dạng ghép từ: mỗi item có prompt (từ tiếng Anh), correctAnswer (nghĩa tiếng Việt ngắn gọn), hint (phiên âm IPA).',
      multiple_choice:
        'Dạng chọn đáp án đúng: prompt là câu hỏi tiếng Anh/ngữ pháp, options gồm đúng 4 lựa chọn, correctAnswer là 1 trong 4 lựa chọn, explanation là giải thích tiếng Việt.',
      fill_blank:
        'Dạng điền từ còn thiếu: prompt là câu tiếng Anh có đúng một chỗ trống "____", correctAnswer là từ cần điền, hint là gợi ý tiếng Việt, options là 4 từ gợi ý (gồm cả đáp án đúng).',
      sentence_order:
        'Dạng sắp xếp từ thành câu: prompt là nghĩa tiếng Việt của câu, correctAnswer là câu tiếng Anh hoàn chỉnh đúng trật tự từ, options là mảng các từ/cụm từ đã xáo trộn.',
      image_guess:
        'Dạng nhìn hình đoán từ tiếng Anh: visualCue là 1 biểu tượng emoji rõ nghĩa (ví dụ 🍎, 🐘, 🏫) + mô tả ngắn bằng tiếng Việt trong prompt, correctAnswer là từ tiếng Anh chuẩn, options gồm 4 từ tiếng Anh để học sinh chọn hoặc gõ.',
      listening_choice:
        'Dạng nghe phát âm và chọn từ đúng: audioText là từ hoặc cụm từ tiếng Anh cần đọc bằng TTS, options gồm 4 từ tiếng Anh có cách phát âm/chính tả gần nhau, correctAnswer trùng khớp 100% với audioText, explanation là nghĩa tiếng Việt.',
    };

    const instruction = typeInstructionMap[gameType || 'multiple_choice'] || typeInstructionMap.multiple_choice;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Hãy tạo ${count} câu hỏi trò chơi tiếng Anh.
- Dạng trò chơi: ${gameType}
- Chủ đề: ${topic || 'Từ vựng tổng hợp'}
- Độ khó: ${difficulty || 'medium'}
- Hướng dẫn định dạng: ${instruction}`,
      config: {
        systemInstruction:
          'Bạn là chuyên gia thiết kế trò chơi giáo dục tiếng Anh cho học sinh lớp 1-12. Hãy tạo nội dung chính xác, không trùng lặp, phù hợp lứa tuổi.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              prompt: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctAnswer: { type: Type.STRING },
              hint: { type: Type.STRING },
              explanation: { type: Type.STRING },
              visualCue: { type: Type.STRING },
              audioText: { type: Type.STRING },
            },
            required: ['id', 'prompt', 'options', 'correctAnswer'],
          },
        },
      },
    });

    const questions = JSON.parse((response.text ?? '[]').trim());
    res.json({ questions });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

router.post(
  '/parse-exam',
  requireTeacherAndVipCheck,
  upload.single('file'),
  async (req: RequestWithAuth, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Vui lòng chọn tệp Word (.docx) hoặc PDF (.pdf) để phân tích.' });
        return;
      }

      const lowerName = file.originalname.toLowerCase();
      const isPdf = file.mimetype === 'application/pdf' || lowerName.endsWith('.pdf');
      const isDocx =
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        lowerName.endsWith('.docx');

      if (!isPdf && !isDocx) {
        res.status(400).json({
          error: 'Định dạng tệp chưa được hỗ trợ phân tích tự động. Vui lòng dùng tệp .docx hoặc .pdf.',
        });
        return;
      }

      const ai = getGeminiClient();
      const systemInstruction = `Bạn là trợ lý chuyển đổi đề thi tiếng Anh từ tài liệu Word/PDF sang cấu trúc đề thi trực tuyến.
NGUYÊN TẮC BẮT BUỘC:
1. Đọc chính xác nội dung từng phần (Reading, Grammar, Vocabulary, Listening, Writing...) và từng câu hỏi trong tài liệu.
2. KHÔNG ĐƯỢC TỰ SUY ĐOÁN đáp án hoặc tự bịa câu hỏi/cấu trúc nếu trong tệp không ghi rõ.
3. Nếu câu hỏi không có đáp án rõ ràng trong tài liệu, hoặc nội dung/lựa chọn bị mờ/thiếu/không chắc chắn, BẮT BUỘC đặt:
   - "needsReview": true
   - "reviewNote": mô tả cụ thể bằng tiếng Việt (ví dụ: "Không tìm thấy đáp án trong file gốc, giáo viên cần kiểm tra và chọn đáp án đúng.")
   - "correctAnswer": "" (nếu không tìm thấy đáp án rõ ràng).
4. Phân loại questionType vào đúng một trong các giá trị: "multiple_choice", "fill_blank", "sentence_order", "reading", "grammar", "vocabulary", "listening", "other".`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          suggestedTitle: { type: Type.STRING },
          detectedSections: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                section: { type: Type.STRING },
                questionType: { type: Type.STRING },
                prompt: { type: Type.STRING },
                passage: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctAnswer: { type: Type.STRING },
                points: { type: Type.NUMBER },
                needsReview: { type: Type.BOOLEAN },
                reviewNote: { type: Type.STRING },
              },
              required: [
                'id',
                'section',
                'questionType',
                'prompt',
                'options',
                'correctAnswer',
                'points',
                'needsReview',
                'reviewNote',
              ],
            },
          },
        },
        required: ['suggestedTitle', 'detectedSections', 'questions'],
      };

      let response;
      if (isDocx) {
        const extracted = await mammoth.extractRawText({ buffer: file.buffer });
        const rawText = extracted.value.trim();
        if (!rawText) {
          res.status(400).json({ error: 'Không trích xuất được nội dung văn bản từ tệp Word này.' });
          return;
        }
        response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Hãy đọc và phân tích đề kiểm tra tiếng Anh trích xuất từ tệp "${file.originalname}" dưới đây:\n\n${rawText}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
      } else {
        const base64Data = file.buffer.toString('base64');
        response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: `Hãy đọc và phân tích đề kiểm tra tiếng Anh trong tệp PDF "${file.originalname}". Không suy đoán đáp án nếu không có trong đề.`,
              },
            ],
          },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
      }

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message });
    }
  }
);

export default router;
