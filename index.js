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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

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
                    if (currentlyRecording.has(userId)) return;
                    currentlyRecording.add(userId);
                    
                    const audioStream = connection.receiver.subscribe(userId, {
                        end: {
                            behavior: EndBehaviorType.AfterSilence,
                            duration: 1500, // Czekamy 1.5 sekundy ciszy
                        },
                    });

                    const timestamp = Date.now();
                    const pcmFilename = `nagranie_${userId}_${timestamp}.pcm`;
                    const wavFilename = `nagranie_${userId}_${timestamp}.wav`;
                    
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


                        console.log(`⏳ Zakończono mówienie. Konwertuję na plik: ${wavFilename}`);
                        
                        const ffmpegProcess = spawn(ffmpegPath, [
                            '-f', 's16le', '-ar', '48000', '-ac', '2', 
                            '-i', pcmFilename,
                            '-y', 
                            wavFilename
                        ]);

                        ffmpegProcess.on('close', async (code) => {
                            if (code === 0) {
                                message.channel.send(`✅ Utworzono nagranie: **${wavFilename}**`);
                                
                                // Bezpieczne usuwanie pliku .pcm
                                if (fs.existsSync(pcmFilename)) {
                                    fs.unlinkSync(pcmFilename); 
                                }


                                const text = await convertAudioToTextLocal(wavFilename);
                                if (text) {
                                    // message.channel.send(`📝 **Ty:** ${text}`);
                                    
                                    // --- KOD LLM ---
                                    const aiReply = await generateAiResponse(text);
                                    // message.channel.send(`🤖 **Asystent:** ${aiReply}`);
                                    
                                    // --- BRAKUJĄCY KOD TTS (ODTWARZANIE GŁOSU) ---
                                    const audioFilePath = await convertTextToAudioLocal(aiReply);
                                    
                                    if (audioFilePath) {
                                        const player = createAudioPlayer();
                                        const resource = createAudioResource(audioFilePath);
                                        
                                        player.play(resource);
                                        connection.subscribe(player); // Wpuszczamy bota na kanał głosowy, żeby to powiedział

                                        // Sprzątamy: Usuwamy plik z dysku, gdy bot skończy mówić
                                        player.on(AudioPlayerStatus.Idle, () => {
                                            if (fs.existsSync(audioFilePath)) {
                                                fs.unlinkSync(audioFilePath);
                                            }
                                        });
                                    }
                                    // --------------------------------
                                    
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
                                        });
                                    }
                                }

                                
                            } else {
                                console.error('⚠️ Błąd konwersji ffmpeg.');
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
});

client.login(process.env.DISCORD_TOKEN);