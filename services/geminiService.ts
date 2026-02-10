import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Khởi tạo Gemini – FREE PLAN
 */
const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

// Sử dụng model 1.5 Flash vì ổn định hơn 2.0 Flash (preview)
// Nếu muốn dùng 2.0, đổi thành "gemini-2.0-flash-exp" hoặc tương tự nếu có quyền truy cập
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

/**
 * Sinh câu trả lời AI (HR / Điều dưỡng)
 * @param question Câu hỏi người dùng
 * @param context Dữ liệu nội bộ (đã lọc từ Supabase)
 */
export async function generateAIResponse(
  question: string,
  context: string = ""
): Promise<string> {
  try {
    const prompt = `
Bạn là **Trợ lý AI nội bộ bệnh viện**.

NGUYÊN TẮC BẮT BUỘC:
- Chỉ sử dụng thông tin trong "DỮ LIỆU NỘI BỘ" được cung cấp bên dưới.
- KHÔNG suy đoán, KHÔNG bịa đặt thông tin.
- Nếu không có thông tin trong dữ liệu → trả lời: "Không tìm thấy dữ liệu phù hợp trong hệ thống."
- Trả lời ngắn gọn, rõ ràng, ưu tiên dạng gạch đầu dòng.
- Ngôn ngữ: Tiếng Việt, văn phong chuyên môn y tế – hành chính.

=== DỮ LIỆU NỘI BỘ ===
${context || "Không có dữ liệu"}

=== CÂU HỎI ===
${question}
`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 1000,
      },
    });

    return result.response.text().trim();
  } catch (error: any) {
    console.error("Gemini FREE error:", error);

    if (error?.message?.includes("quota")) {
      return "⚠️ AI đã vượt giới hạn miễn phí trong ngày. Vui lòng thử lại sau.";
    }

    return "⚠️ Không thể xử lý yêu cầu AI lúc này. Vui lòng thử lại.";
  }
}
