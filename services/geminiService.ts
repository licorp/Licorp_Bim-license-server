
import {GoogleGenAI} from "@google/genai";
import { User, Session } from '../types';

declare const process: { env: any };

const getClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateLicenseReport = async (users: User[], sessions: Session[], query: string): Promise<string> => {
    try {
        const client = getClient();
        
        const systemInstruction = `
            Bạn là một trợ lý quản trị viên chuyên nghiệp cho hệ thống quản lý License BIM Tool.
            Bạn sẽ nhận được dữ liệu JSON về người dùng và các phiên đăng nhập.
            
            Nhiệm vụ:
            1. Trả lời câu hỏi dựa trên dữ liệu thật.
            2. Phân tích xu hướng (phiên bản phần mềm, công ty hoạt động mạnh).
            3. Cảnh báo rủi ro (license sắp hết hạn, IP lạ, nhiều máy dùng chung 1 account).
            
            Trả lời bằng Tiếng Việt, ngắn gọn, súc tích, định dạng Markdown đẹp mắt.
        `;

        const dataContext = JSON.stringify({
            totalUsers: users.length,
            activeSessions: sessions.length,
            usersData: users,
            sessionsData: sessions
        });

        const prompt = `
            Dữ liệu hệ thống hiện tại:
            ${dataContext}

            Câu hỏi từ quản trị viên: "${query}"
        `;

        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        return response.text || "Xin lỗi, tôi không thể xử lý yêu cầu lúc này.";

    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại sau.";
    }
};
