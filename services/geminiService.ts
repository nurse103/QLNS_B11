import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize Gemini AI Client
// Note: In a real production app, ensure your API key is secure.
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing!");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateHRResponse = async (
  prompt: string,
  onStream: (text: string) => void
): Promise<string> => {
  try {
    const modelId = 'gemini-3-flash-preview';

    const ai = getAiClient();
    if (!ai) return "Chưa cấu hình API Key. Vui lòng liên hệ Admin.";

    // System instruction to behave like an HR expert
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: `Bạn là một trợ lý ảo chuyên nghiệp về Quản trị Nhân sự (HR) cho một tổ chức tại Việt Nam. 
        Nhiệm vụ của bạn là hỗ trợ soạn thảo văn bản, tư vấn luật lao động, giải đáp thắc mắc về lương thưởng, và phân tích dữ liệu nhân sự.
        Hãy trả lời ngắn gọn, súc tích, chuyên nghiệp và lịch sự bằng tiếng Việt.`,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessageStream({ message: prompt });

    let fullText = '';
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
        onStream(fullText);
      }
    }
    return fullText;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Xin lỗi, hiện tại tôi không thể kết nối với hệ thống. Vui lòng kiểm tra lại cấu hình API Key.";
  }
};
