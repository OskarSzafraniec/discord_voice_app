const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');

async function convertTextToAudioLocal(textResponse) {
    try {
        console.log(`🔊 Generuję głos z tekstu: "${textResponse.substring(0, 30)}..."`);

        // Pobieramy link do audio (API Google Translate)
        const url = googleTTS.getAudioUrl(textResponse, {
            lang: 'pl',
            slow: false,
            host: 'https://translate.google.com',
        });

        // Pobieramy plik
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();

        // Zapisujemy na dysku
        const fileName = `odpowiedz_${Date.now()}.mp3`;
        const filePath = path.join(__dirname, fileName);

        fs.writeFileSync(filePath, Buffer.from(buffer));
        console.log(`✅ Zapisano plik audio z odpowiedzią: ${fileName}`);
        
        return filePath;

    } catch (error) {
        console.error('⚠️ Błąd podczas generowania TTS:', error);
        return null;
    }
}

module.exports = { convertTextToAudioLocal };