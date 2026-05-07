const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');

async function convertTextToAudioLocal(textResponse) {
    try {
        console.log(`🔊 Generuję głos z tekstu: "${textResponse.substring(0, 30)}..."`);

        // Zamiast getAudioUrl (limit 200 znaków), używamy getAllAudioUrls
        // Paczka sama potnie długi tekst na akceptowalne kawałki
        const audioUrls = googleTTS.getAllAudioUrls(textResponse, {
            lang: 'pl',
            slow: false,
            host: 'https://translate.google.com',
        });

        const buffers = [];

        // Przechodzimy przez każdy mały wygenerowany link i pobieramy audio
        for (const item of audioUrls) {
            const response = await fetch(item.url);
            const arrayBuffer = await response.arrayBuffer();
            buffers.push(Buffer.from(arrayBuffer)); // Zbieramy kawałki do tablicy
        }

        // Sklejamy wszystkie kawałki dźwięku w jeden kompletny plik
        const finalBuffer = Buffer.concat(buffers);
        
        // NOWE: Automatyczne tworzenie folderu temp_audio
        const tempDir = path.join(__dirname, 'temp_audio');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        const fileName = `odpowiedz_${Date.now()}.mp3`;
        const filePath = path.join(tempDir, fileName); // Plik trafia do temp_audio

        // Zapisujemy sklejony, pełny plik na dysku
        fs.writeFileSync(filePath, finalBuffer);
        console.log(`✅ Zapisano plik audio z odpowiedzią: ${fileName}`);
        
        return filePath;

    } catch (error) {
        console.error('⚠️ Błąd podczas generowania TTS:', error);
        return null;
    }
}

module.exports = { convertTextToAudioLocal };