# Wirtualny Asystent Discord (Voice Bot)

Projekt polegający na stworzeniu bota do Discorda, który nasłuchuje mowy użytkowników na kanałach głosowych.

Bot przeszedł migrację technologiczną i obecnie działa w oparciu o środowisko **Node.js** w celu stabilniejszej obsługi połączeń głosowych. Wykorzystuje następujące technologie:
* **Discord.js & @discordjs/voice** – solidna obsługa łączności z Discordem i przechwytywanie strumieni audio.
* **Prism-media & FFmpeg** – dekodowanie w locie pakietów Opus i konwersja do formatu `.wav`.
* **LLM** – zintegrowano z darmowym modelem sztucznej inteligencji za pomocą **Google Gemini API**.
* **Baza Danych** – zapisywanie logów do chmury bazy PostgreSQL na platformie Neon.tech.

## 📚 Dokumentacja i Plan Projektu

Dokumentacja projektu prowadzona jest w systemie Atlassian Confluence. Z uwagi na to, że darmowy plan Confluence wymaga autoryzacji do wyświetlania stron, pełna i zaktualizowana kopia Planu Projektu (plik PDF) oraz diagramy (pliki PNG) zostały wgrane bezpośrednio do tego repozytorium.

🔗 https://o2-team-sgy9ya2w.atlassian.net/wiki/spaces/discordvoi/overview (może wymagać uprawnień)

📄 Plik PDF z planem projektu i diagramami znajdują się w plikach repozytorium powyżej.