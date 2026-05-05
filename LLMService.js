const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inicjalizacja Gemini za pomocą klucza z .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateAiResponse(text) {
    try {
        console.log(`🧠 Przetwarzam zapytanie przez LLM: "${text}"...`);
        
        // Wybieramy nasz sprawdzony model i nadajemy mu osobowość
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: "Jesteś wirtualnym asystentem głosowym na serwerze Discord. Odpowiadaj krótko, naturalnie i zwięźle. Pamiętaj, że twoja odpowiedź będzie czytana na głos przez syntezator mowy, więc unikaj znaków specjalnych, list i długich esejów. Mów potocznie, bądź pomocny i miej poczucie humoru."
        });

        // Wysyłamy tekst wyciągnięty z Twojego głosu
        const result = await model.generateContent(text);
        const responseText = result.response.text();

        console.log(`💡 Wygenerowano odpowiedź: "${responseText.trim()}"`);
        return responseText.trim();

    } catch (error) {
        console.error('⚠️ Błąd podczas generowania odpowiedzi LLM:', error);
        return "Przepraszam, mam chwilowe problemy z myśleniem.";
    }
}

// Eksportujemy funkcję
module.exports = { generateAiResponse };