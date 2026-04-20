import discord
from discord.ext import commands
import os
from dotenv import load_dotenv

# 1. Wczytanie zmiennych środowiskowych z pliku .env
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')

# 2. Konfiguracja uprawnień bota (Intents)
intents = discord.Intents.default()
intents.message_content = True  # Pozwala botowi czytać wiadomości na kanałach tekstowych

# 3. Inicjalizacja bota z prefiksem '/'
bot = commands.Bot(command_prefix='!', intents=intents)

# 4. Wydarzenie: Bot pomyślnie połączył się z Discordem
@bot.event
async def on_ready():
    print(f'✅ Zalogowano pomyślnie jako: {bot.user}')
    print('✅ Bot jest podłączony do serwera i gotowy do działania!')

# 5. Prosta komenda testowa
@bot.command()
async def ping(ctx):
    await ctx.send('Pong! Słyszę Cię i działam prawidłowo. 🤖')
# Komenda do dołączania na kanał głosowy
@bot.command()
async def start(ctx):
    # Sprawdzamy, czy użytkownik, który wpisał komendę, jest na jakimś kanale głosowym
    if ctx.author.voice:
        channel = ctx.author.voice.channel
        # Bot dołącza do kanału
        await channel.connect()
        await ctx.send(f'✅ Dołączyłem do kanału głosowego: **{channel.name}** i nasłuchuję!')
    else:
        await ctx.send('❌ Musisz najpierw wejść na kanał głosowy, żebym mógł do Ciebie dołączyć!')

# Komenda do opuszczania kanału głosowego
@bot.command()
async def stop(ctx):
    # Sprawdzamy, czy bot jest obecnie połączony z jakimś kanałem głosowym na tym serwerze
    if ctx.voice_client:
        await ctx.guild.voice_client.disconnect()
        await ctx.send('👋 Opuściłem kanał głosowy.')
    else:
        await ctx.send('❌ Przecież nie ma mnie na żadnym kanale!')
# 6. Uruchomienie bota
if __name__ == '__main__':
    if TOKEN is None:
        print("❌ BŁĄD: Nie znaleziono tokenu Discord. Sprawdź plik .env!")
    else:
        bot.run(TOKEN)
