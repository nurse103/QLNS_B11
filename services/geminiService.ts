import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash", // ✅ ĐÚNG FREE
});

export async function generateAIResponse(
  question: string,
  context: string = ""
): Promise<string> {
  try {
    const prompt = `
Bạn là Trợ lý AI nội bộ bệnh viện.
Chỉ trả lời dựa trên dữ liệu được cung cấp.
Nếu không có thông tin → nói rõ không có.

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
        maxOutputTokens: 512,
      },
    });

    return result.response.text();
  } catch (err: any) {
    console.error("Gemini FREE error:", err);
    return "⚠️ Không thể xử lý yêu cầu AI lúc này. Vui lòng thử lại.";
  }
}
