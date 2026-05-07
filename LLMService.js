const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inicjalizacja Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Definiujemy model i jego osobowość na samym początku (poza funkcją)
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: "Jesteś wirtualnym asystentem głosowym na serwerze Discord. Odpowiadaj krótko, naturalnie i zwięźle. Pamiętaj, że twoja odpowiedź będzie czytana na głos przez syntezator mowy, więc unikaj znaków specjalnych, list i długich esejów. Mów potocznie, bądź pomocny i miej poczucie humoru."
});

// 2. Inicjalizujemy globalną sesję czatu (to jest nasza "pamięć")
// Zmienna 'chat' znajduje się poza funkcją, więc nie resetuje się przy każdym zapytaniu!
const chat = model.startChat({
    history: [], // Na start historia jest pusta
});

async function generateAiResponse(text) {
    try {
        console.log(`🧠 Przetwarzam zapytanie przez LLM: "${text}"...`);
        
        // 3. Używamy chat.sendMessage zamiast model.generateContent
        const result = await chat.sendMessage(text);
        const responseText = result.response.text().replace(/[*_]/g, '');

        console.log(`💡 Wygenerowano odpowiedź: "${responseText.trim()}"`);
        return responseText.trim();

    } catch (error) {
        console.error('⚠️ Błąd podczas generowania odpowiedzi LLM:', error);
        return "Przepraszam, mam chwilowe problemy z myśleniem.";
    }
}

module.exports = { generateAiResponse };