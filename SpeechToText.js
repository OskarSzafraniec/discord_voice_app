const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function convertAudioToTextLocal(filePath) {
    try {
        console.log(`⏳ Wysyłam nagranie do Google Gemini w celu rozpoznania tekstu...`);
        
        const audioBytes = fs.readFileSync(filePath).toString("base64");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = "Jesteś transkryptorem. Przetłumacz to nagranie głosowe na tekst. Zwróć TYLKO i WYŁĄCZNIE to, co usłyszysz na nagraniu, bez absolutnie żadnego dodatkowego komentarza z Twojej strony. Język polski.";

        const audioPart = {
            inlineData: {
                data: audioBytes,
                mimeType: "audio/wav"
            }
        };

        const result = await model.generateContent([prompt, audioPart]);
        const text = result.response.text();

        if (text && text.trim().length > 0) {
            const cleanText = text.trim();
            console.log(`✅ Rozpoznano tekst: "${cleanText}"`);
            return cleanText;
        } else {
            console.log(`⚠️ Gemini nic nie usłyszało.`);
            return null;
        }

    } catch (error) {
        console.error('⚠️ Błąd podczas transkrypcji Gemini:', error);
        return null;
    }
}

module.exports = { convertAudioToTextLocal };