require('dotenv').config();
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const prism = require('prism-media'); 
const { convertAudioToTextLocal } = require('./SpeechToText');
const { generateAiResponse } = require('./LLMService');
const { convertTextToAudioLocal } = require('./TextToSpeech');
const { createAudioResource, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');

// 🧹 SYSTEM CZYSZCZENIA PLIKÓW (TTL - Time To Live)

function cleanupOldAudioFiles() {
    const tempDir = path.join(__dirname, 'temp_audio');
    const TTL_MINUTES = 10; // Maksymalny czas życia pliku (w minutach)
    const TTL_MS = TTL_MINUTES * 60 * 1000;
    const now = Date.now();

    // Sprawdzamy, czy folder w ogóle istnieje
    if (fs.existsSync(tempDir)) {
        fs.readdir(tempDir, (err, files) => {
            if (err) {
                console.error('⚠️ [TTL] Błąd odczytu folderu temp_audio:', err);
                return;
            }

            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                
                // Pobieramy statystyki pliku (kiedy został stworzony/zmodyfikowany)
                fs.stat(filePath, (err, stats) => {
                    if (err) return;

                    const fileAge = now - stats.mtimeMs; // Wiek pliku w milisekundach
                    
                    // Jeśli plik jest starszy niż nasze TTL, usuwamy go
                    if (fileAge > TTL_MS) {
                        fs.unlink(filePath, err => {
                            if (!err) {
                                console.log(`🧹 [TTL] Usunięto przestarzały plik: ${file}`);
                            }
                        });
                    }
                });
            });
        });
    }
}

// Uruchamiamy nasz "odkurzacz" cyklicznie co 5 minut
setInterval(cleanupOldAudioFiles, 5 * 60 * 1000);
// Dodatkowo uruchamiamy go raz od razu przy starcie bota, żeby posprzątał po poprzedniej sesji
cleanupOldAudioFiles();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let isBotBusy = false; // Zmienna pilnująca, czy bot jest w trakcie przetwarzania

let connection = null;
const currentlyRecording = new Set(); 

client.once(Events.ClientReady, () => {
    console.log(`✅ Zalogowano pomyślnie jako: ${client.user.tag}`);
    console.log('✅ Bot głosowy gotowy do działania!');
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (message.content === '!start') {
        const voiceChannel = message.member?.voice.channel;

        if (!voiceChannel) {
            return message.reply('❌ Musisz najpierw wejść na kanał głosowy!');
        }

        try {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false 
            });

            message.reply(`🎙️ Połączono z **${voiceChannel.name}**! Możesz mówić.`);

            connection.on(VoiceConnectionStatus.Ready, () => {
                const receiver = connection.receiver;

                receiver.speaking.on('start', (userId) => {
                    // --- 1. BLOKADA: Ignorujemy dźwięk, jeśli bot myśli lub mówi ---
                    if (isBotBusy) return;

                    if (currentlyRecording.has(userId)) return;
                    currentlyRecording.add(userId);
                    
                    const audioStream = connection.receiver.subscribe(userId, {
                        end: {
                            behavior: EndBehaviorType.AfterSilence,
                            duration: 1500, // Czekamy 1.5 sekundy ciszy
                        },
                    });

                    const timestamp = Date.now();

                    // 1. Sprawdzamy, czy folder temp_audio istnieje (jeśli nie, tworzymy go)
                    const tempDir = path.join(__dirname, 'temp_audio');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir);
                    }

                    // 2. Dodajemy ścieżkę do folderu przed nazwą pliku
                    const pcmFilename = path.join(tempDir, `nagranie_${userId}_${timestamp}.pcm`);
                    const wavFilename = path.join(tempDir, `nagranie_${userId}_${timestamp}.wav`);
                    
                    const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
                    const fileStream = fs.createWriteStream(pcmFilename);
                    
                    audioStream.pipe(decoder).pipe(fileStream);

                    audioStream.on('error', (error) => {
                        if (error.message.includes('DecryptionFailed')) {
                            console.log('⚠️ Zignorowano uszkodzony pakiet szyfrowania Discorda (DAVE).');
                        } else {
                            console.error('⚠️ Błąd strumienia audio:', error);
                        }
                        audioStream.destroy();
                    });

                    audioStream.on('end', () => {
                        currentlyRecording.delete(userId); 
                        

                        if (fs.existsSync(pcmFilename)) {
                            const stats = fs.statSync(pcmFilename);
                            // Jeśli plik waży mniej niż 150 KB (czyli mniej niż ~0,75 sekundy)
                            if (stats.size < 150000) {
                                fs.unlinkSync(pcmFilename); // Usuwamy śmiecia po cichu
                                return; // Przerywamy działanie, brak spamu na Discordzie
                            }
                        }

                        // --- 2. ZABLOKOWANIE: Bot ma poprawne nagranie i zaczyna proces ---
                        isBotBusy = true;

                        console.log(`⏳ Zakończono mówienie. Konwertuję na plik: ${wavFilename}`);
                        
                        const ffmpegProcess = spawn(ffmpegPath, [
                            '-f', 's16le', '-ar', '48000', '-ac', '2', 
                            '-i', pcmFilename,
                            '-y', 
                            wavFilename
                        ]);

                        ffmpegProcess.on('close', async (code) => {
                            if (code === 0) {
                                // Zamiast spamu na Discordzie, mamy czysty log w terminalu pod bazę
                                console.log(`[BAZA DANYCH - PREP] Wygenerowano plik: ${wavFilename}`);
                                
                                // Bezpieczne usuwanie pliku .pcm
                                if (fs.existsSync(pcmFilename)) {
                                    fs.unlinkSync(pcmFilename); 
                                }

                                const text = await convertAudioToTextLocal(wavFilename);
                                if (text) {
                                    
                                    // Dyskretna, samo-usuwająca się wiadomość na czacie
                                    message.channel.send(`⚙️ *Przetwarzam zapytanie głosowe i odpowiadam na kanale audio...*`)
                                        .then(msg => {
                                            setTimeout(() => msg.delete().catch(console.error), 10000);
                                        });
                                    
                                    // --- KOD LLM ---
                                    const aiReply = await generateAiResponse(text);
                                    
                                    // --- BRAKUJĄCY KOD TTS (ODTWARZANIE GŁOSU) ---
                                    const audioFilePath = await convertTextToAudioLocal(aiReply);
                                    
                                    if (audioFilePath) {
                                        const player = createAudioPlayer();
                                        const resource = createAudioResource(audioFilePath);
                                        
                                        player.play(resource);
                                        connection.subscribe(player);

                                        // Sprzątamy: Usuwamy plik z dysku
                                        player.on(AudioPlayerStatus.Idle, () => {
                                            if (fs.existsSync(audioFilePath)) {
                                                fs.unlinkSync(audioFilePath);
                                            }
                                            // --- 3. ODBLOKOWANIE (SUKCES): Bot skończył odpowiadać ---
                                            isBotBusy = false;
                                        });
                                    }
                                    
                                } else {
                                    console.log(`🤷 Nie zrozumiałem, co powiedziałeś (lub serwer padł).`);
                                    
                                    // Dodajemy TTS dla błędu STT
                                    const errorAudioPath = await convertTextToAudioLocal("Przepraszam, nie dosłyszałem. Serwery są chyba przeciążone.");
                                    if (errorAudioPath) {
                                        const player = createAudioPlayer();
                                        const resource = createAudioResource(errorAudioPath);
                                        
                                        player.play(resource);
                                        connection.subscribe(player);

                                        player.on(AudioPlayerStatus.Idle, () => {
                                            if (fs.existsSync(errorAudioPath)) {
                                                fs.unlinkSync(errorAudioPath);
                                            }
                                            // --- 4. ODBLOKOWANIE (BŁĄD AI): Bot odczytał ostrzeżenie ---
                                            isBotBusy = false;
                                        });
                                    }
                                }

                            } else {
                                console.error('⚠️ Błąd konwersji ffmpeg.');
                                // --- 5. ODBLOKOWANIE AWARYJNE: Błąd FFmpeg ---
                                isBotBusy = false;
                            }
                        });
                    });
                });
            });

        } catch (error) {
            console.error('Błąd połączenia:', error);
            message.reply('⚠️ Wystąpił błąd podczas łączenia z kanałem.');
        }
    }

    if (message.content === '!stop') {
        if (connection) {
            connection.destroy();
            connection = null;
            message.reply('👋 Zakończyłem nasłuchiwanie i opuściłem kanał.');
        } else {
            message.reply('❌ Przecież nie ma mnie na żadnym kanale!');
        }
    }
        if (message.content === '!status') {
            const ping = client.ws.ping; // Pobieramy opóźnienie Discorda
            
            // Obliczamy czas działania bota (uptime)
            const uptime = Math.floor(process.uptime());
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;

            const statusMessage = `
**📊 Status Asystenta Głosowego**
🟢 **Stan:** Aktywny i gotowy do pracy
🏓 **Opóźnienie (Ping):** \`${ping}ms\`
⏱️ **Czas działania:** \`${hours}h ${minutes}m ${seconds}s\`
🧠 **Aktywny model AI:** \`Google Gemini 2.5 Flash\`
            `;
            
            message.channel.send(statusMessage);
        }

        // --- NOWA KOMENDA: !pomoc ---
        if (message.content === '!pomoc') {
            const helpMessage = `
**📖 Instrukcja Obsługi Asystenta**
Oto lista dostępnych komend:

> **!start** - Bot dołącza do Twojego kanału głosowego i zaczyna nasłuchiwać.
> **!stop** - Bot przerywa pracę, czyści pliki i opuszcza kanał głosowy.
> **!status** - Wyświetla techniczne informacje o bocie (ping, czas działania, model).
> **!pomoc** - Wyświetla tę listę komend.

*💡 Wskazówka: Po użyciu \`!start\`, upewnij się, że jesteś na kanale głosowym. Kiedy skończysz mówić do bota, po prostu zrób pauzę. Asystent sam wykryje koniec zdania!*
            `;
            
            message.channel.send(helpMessage);
        }
});

client.login(process.env.DISCORD_TOKEN);