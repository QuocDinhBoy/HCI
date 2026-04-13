import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Config helpers ───────────────────────────────────────────────────────────

function getApiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
}

function getOpenRouterKey() {
  return (process.env.OPENROUTER_API_KEY || '').trim();
}

function getProviderMode() {
  return (process.env.AI_PROVIDER || 'auto').trim().toLowerCase();
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

/**
 * Cố gắng parse JSON từ response text của AI.
 * Xử lý cả trường hợp AI bọc trong markdown fences.
 */
function parseModelJson(text) {
  const raw = String(text || '').trim();

  try {
    return JSON.parse(raw);
  } catch {
    // tiếp tục với fallback
  }

  const withoutFence = raw.replace(/```json|```/gi, '').trim();
  const first = withoutFence.indexOf('{');
  const last = withoutFence.lastIndexOf('}');

  if (first >= 0 && last > first) {
    const candidate = withoutFence.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      throw new Error('Không thể parse JSON từ phản hồi AI');
    }
  }

  throw new Error('Phản hồi AI không có định dạng JSON hợp lệ');
}

// ─── Error payload builder ────────────────────────────────────────────────────

function toClientErrorPayload(errorCode, message, tip) {
  return {
    isMatch: false,
    confidence: 0,
    emoji: '🤖',
    message,
    tip,
    errorCode,
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Xây dựng vision prompt chuẩn cho AI.
 * Viết đầy đủ tiếng Việt có dấu để AI phản hồi đúng ngôn ngữ.
 */
function buildVisionPrompt(targetEmotion) {
  return `Bạn là trợ lý AI thân thiện chuyên hỗ trợ trẻ tự kỷ học nhận biết và thể hiện cảm xúc.

**Nhiệm vụ:** Hãy quan sát khuôn mặt trong ảnh và đánh giá xem trẻ có đang thể hiện cảm xúc "${targetEmotion}" không.

**Cách phân tích:**
1. Quan sát các đặc điểm: đôi mắt, lông mày, miệng, má và toàn bộ khuôn mặt
2. So sánh sự phù hợp với biểu cảm "${targetEmotion}"
3. Đưa ra điểm confidence (0-100) phản ánh mức độ khớp

**Yêu cầu phản hồi (JSON thuần, không markdown):**
{
  "isMatch": boolean,
  "confidence": number (0-100),
  "emoji": string (1 emoji phù hợp với cảm xúc phát hiện được),
  "message": string (1-2 câu ngắn gọn, vui vẻ, khích lệ trẻ bằng tiếng Việt),
  "tip": string (1 lời gợi ý cụ thể để cải thiện biểu cảm nếu chưa đúng, bằng tiếng Việt; để rỗng nếu isMatch = true)
}

**Quy tắc quan trọng:**
- isMatch = true khi confidence >= 65
- Tất cả text PHẢI bằng tiếng Việt có dấu đầy đủ
- Giọng điệu phải ấm áp, kiên nhẫn, phù hợp với trẻ em
- Nếu không thấy mặt rõ trong ảnh, đặt isMatch = false, confidence = 0
- Chỉ trả về JSON, không có giải thích thêm`;
}

// ─── Gemini provider ──────────────────────────────────────────────────────────

async function analyzeWithGemini(imageBase64, targetEmotion) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw Object.assign(new Error('Gemini key chưa được cấu hình'), {
      provider: 'gemini',
      isConfigError: true,
      errorCode: 'GEMINI_KEY_MISSING',
      tip: 'Thêm GEMINI_API_KEY vào file .env của backend.',
    });
  }

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  // gemini-1.5-flash: stable, nhanh, hỗ trợ vision tốt
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,         // ít ngẫu nhiên hơn → JSON ổn định hơn
      responseMimeType: 'application/json', // yêu cầu JSON output trực tiếp
    },
  });

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: 'image/jpeg',
    },
  };

  try {
    const result = await model.generateContent([buildVisionPrompt(targetEmotion), imagePart]);
    const responseText = result.response.text();
    const parsed = parseModelJson(responseText);

    const confidence = Number(parsed?.confidence ?? 50);
    const isMatch = parsed?.isMatch === true || confidence >= 65;

    return {
      isMatch,
      confidence,
      emoji: parsed?.emoji || '🙂',
      message: parsed?.message || 'Con đang cố gắng rất tốt, thử thêm một chút nữa nhé!',
      tip: parsed?.tip || '',
      provider: 'gemini',
    };
  } catch (error) {
    const status = Number(error?.status) || 500;
    const reason = Array.isArray(error?.errorDetails)
      ? error.errorDetails.find((item) => item?.reason)?.reason
      : undefined;
    const lowerMessage = String(error?.message || '').toLowerCase();

    if (status === 400 && reason === 'API_KEY_INVALID') {
      throw Object.assign(new Error('Gemini key không hợp lệ'), {
        provider: 'gemini',
        isConfigError: true,
        errorCode: 'GEMINI_KEY_INVALID',
        tip: 'Tạo key mới trên Google AI Studio và cập nhật file .env.',
      });
    }

    if (status === 403 && lowerMessage.includes('reported as leaked')) {
      throw Object.assign(new Error('Gemini key đã bị lộ'), {
        provider: 'gemini',
        isConfigError: true,
        errorCode: 'GEMINI_KEY_LEAKED',
        tip: 'Thu hồi key cũ, tạo key mới và cập nhật file .env.',
      });
    }

    if (status === 403 && lowerMessage.includes('project has been denied access')) {
      throw Object.assign(new Error('Gemini project bị từ chối truy cập'), {
        provider: 'gemini',
        isConfigError: true,
        errorCode: 'GEMINI_PROJECT_DENIED',
        tip: 'Tạo project mới, bật Generative Language API và kích hoạt billing.',
      });
    }

    if (status === 429) {
      throw Object.assign(new Error('Gemini vượt quota'), {
        provider: 'gemini',
        isConfigError: false,
        errorCode: 'GEMINI_QUOTA_EXCEEDED',
        tip: 'Chờ một lúc hoặc đổi key có quota cao hơn.',
      });
    }

    throw Object.assign(error, {
      provider: 'gemini',
      isConfigError: false,
      errorCode: 'GEMINI_UPSTREAM_ERROR',
      tip: 'Kiểm tra kết nối mạng hoặc trạng thái dịch vụ Gemini.',
    });
  }
}

// ─── OpenRouter provider ──────────────────────────────────────────────────────

async function analyzeWithOpenRouter(imageBase64, targetEmotion) {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw Object.assign(new Error('OpenRouter key chưa được cấu hình'), {
      provider: 'openrouter',
      isConfigError: true,
      errorCode: 'OPENROUTER_KEY_MISSING',
      tip: 'Thêm OPENROUTER_API_KEY vào file .env của backend.',
    });
  }

  const modelName = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  const body = {
    model: modelName,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildVisionPrompt(targetEmotion) },
          {
            type: 'image_url',
            image_url: { url: imageBase64 },
          },
        ],
      },
    ],
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'EmpathyKids Emotion Analyzer',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    const lower = txt.toLowerCase();

    if (response.status === 401 || response.status === 403) {
      throw Object.assign(new Error('OpenRouter key không hợp lệ hoặc bị từ chối'), {
        provider: 'openrouter',
        isConfigError: true,
        errorCode: 'OPENROUTER_KEY_INVALID',
        tip: 'Kiểm tra OPENROUTER_API_KEY và quyền truy cập model.',
      });
    }

    if (response.status === 429 || lower.includes('quota') || lower.includes('rate limit')) {
      throw Object.assign(new Error('OpenRouter vượt quota'), {
        provider: 'openrouter',
        isConfigError: false,
        errorCode: 'OPENROUTER_QUOTA_EXCEEDED',
        tip: 'Chờ một lúc hoặc nâng cấp hạn mức OpenRouter.',
      });
    }

    throw Object.assign(new Error(`Lỗi OpenRouter upstream: ${response.status}`), {
      provider: 'openrouter',
      isConfigError: false,
      errorCode: 'OPENROUTER_UPSTREAM_ERROR',
      tip: 'Kiểm tra model OPENROUTER_MODEL hoặc thử lại sau.',
    });
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || '{}';
  const parsed = parseModelJson(content);

  const confidence = Number(parsed?.confidence ?? 50);
  const isMatch = parsed?.isMatch === true || confidence >= 65;

  return {
    isMatch,
    confidence,
    emoji: parsed?.emoji || '🙂',
    message: parsed?.message || 'Con đang cố gắng rất tốt, thử thêm một chút nữa nhé!',
    tip: parsed?.tip || '',
    provider: 'openrouter',
  };
}

// ─── Provider orchestration ───────────────────────────────────────────────────

async function analyzeWithProviders(imageBase64, targetEmotion) {
  const mode = getProviderMode();

  const order =
    mode === 'gemini'
      ? ['gemini']
      : mode === 'openrouter'
        ? ['openrouter']
        : ['gemini', 'openrouter']; // auto: thử gemini trước

  const failures = [];

  for (const provider of order) {
    try {
      if (provider === 'gemini') return await analyzeWithGemini(imageBase64, targetEmotion);
      if (provider === 'openrouter') return await analyzeWithOpenRouter(imageBase64, targetEmotion);
    } catch (error) {
      console.warn(`[AI] Provider "${provider}" thất bại:`, error?.errorCode || error?.message);
      failures.push({
        provider,
        status: Number(error?.status) || null,
        errorCode: error?.errorCode || `${provider.toUpperCase()}_ERROR`,
        tip: error?.tip,
        message: error?.message,
        isConfigError: Boolean(error?.isConfigError),
      });

      // Nếu là lỗi config (key sai, không có key) → không thử fallback cùng loại lỗi này
      if (error?.isConfigError && order.length === 1) break;
    }
  }

  const primary = failures[0] || { errorCode: 'AI_PROVIDER_ALL_FAILED', tip: 'Không có provider AI nào sẵn sàng.' };
  const allConfig = failures.length > 0 && failures.every((f) => f.isConfigError);

  throw Object.assign(new Error(primary.message || 'Tất cả AI providers đều thất bại'), {
    isConfigError: allConfig,
    errorCode: allConfig ? primary.errorCode : 'AI_PROVIDER_ALL_FAILED',
    tip: primary.tip || 'Kiểm tra cấu hình AI providers trong file .env backend.',
    failures,
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const analyzeEmotion = async (req, res) => {
  const startTime = Date.now();

  try {
    const { imageBase64, targetEmotion } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        isMatch: false,
        confidence: 0,
        emoji: '❓',
        message: 'Thiếu dữ liệu ảnh.',
        tip: 'Vui lòng chụp lại ảnh.',
        errorCode: 'MISSING_IMAGE',
      });
    }

    if (!targetEmotion || typeof targetEmotion !== 'string') {
      return res.status(400).json({
        isMatch: false,
        confidence: 0,
        emoji: '❓',
        message: 'Thiếu thông tin cảm xúc mục tiêu.',
        tip: 'Vui lòng chọn bài học và thử lại.',
        errorCode: 'MISSING_TARGET_EMOTION',
      });
    }

    const analysisData = await analyzeWithProviders(imageBase64, targetEmotion.trim());

    const elapsed = Date.now() - startTime;
    console.log(`[AI] Phân tích hoàn tất | emotion="${targetEmotion}" | isMatch=${analysisData.isMatch} | confidence=${analysisData.confidence} | provider=${analysisData.provider} | ${elapsed}ms`);

    return res.status(200).json(analysisData);

  } catch (error) {
    const elapsed = Date.now() - startTime;
    const code = error?.errorCode || 'AI_PROVIDER_ALL_FAILED';
    const isConfigError = Boolean(error?.isConfigError);

    const message = isConfigError
      ? 'Dịch vụ AI chưa được cấu hình đúng. Vui lòng thử lại sau.'
      : 'Không thể kết nối dịch vụ AI lúc này. Con thử lại nhé!';

    const tip = error?.tip || 'Kiểm tra GEMINI_API_KEY / OPENROUTER_API_KEY và thử lại.';

    console.error(`[AI] Lỗi providers | code=${code} | ${elapsed}ms`, {
      message: error?.message,
      failures: error?.failures,
    });

    return res.status(isConfigError ? 503 : 502).json(
      toClientErrorPayload(code, message, tip)
    );
  }
};