import { GoogleGenAI } from "@google/genai";

// 为了避免前端因为无效 Key 崩溃，这里强制走本地 Mock，不再真实调用 Gemini。
// 如果以后需要接正式 Gemini，再把 hasApiKey 改成基于环境变量的检测即可。
const hasApiKey = false;
const ai = hasApiKey ? new GoogleGenAI({ apiKey: process.env.API_KEY! }) : null;

export const parseIntent = async (query: string) => {
  if (!hasApiKey) {
    // 本地 / 无 Key 模式：直接返回稳定的 Mock，避免报错影响体验
    return {
      entity: 'Model Y',
      platform: '小红书',
      timeRange: '近 7 天'
    };
  }

  try {
    if (!ai) throw new Error('Gemini client not initialized');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract the Entity, Platform, and Time Range from this user query: "${query}". 
      Return JSON only with keys: entity, platform, timeRange. Translate values to Chinese if needed.`,
      config: {
        responseMimeType: 'application/json'
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Intent Error", error);
    // 出错时也回退到安全的 Mock，保证前端不中断
    return { entity: '未知目标', platform: '全平台', timeRange: '近期' };
  }
};

export const analyzeSemantics = async (text: string) => {
  if (!hasApiKey) return { isSpam: text.length < 15, reason: '模拟分析' };

  try {
    if (!ai) throw new Error('Gemini client not initialized');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze if this text is spam/ad or irrelevant. Text: "${text}". 
      Return JSON: { "isSpam": boolean, "reason": string }. Reason should be in Chinese.`,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { isSpam: false, reason: 'API 错误' };
  }
};

export const rewriteContent = async (text: string, style: string) => {
    if (!hasApiKey) return `(AI 重写 - ${style}): ${text}`;

    try {
        if (!ai) throw new Error('Gemini client not initialized');
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Rewrite the following Chinese text to be more "${style}": ${text}`,
        });
        return response.text;
    } catch (e) {
        return text;
    }
}
