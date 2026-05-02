# Wirtualny Asystent Discord (Voice Bot)

Projekt polegający na stworzeniu bota do Discorda, który nasłuchuje mowy użytkowników na kanałach głosowych.

Bot przeszedł migrację technologiczną i obecnie działa w oparciu o środowisko **Node.js** w celu stabilniejszej obsługi połączeń głosowych. Wykorzystuje następujące technologie:
* **Discord.js & @discordjs/voice** – solidna obsługa łączności z Discordem i przechwytywanie strumieni audio.
* **Prism-media & FFmpeg** – dekodowanie w locie pakietów Opus i konwersja do formatu `.wav`[cite: 3].
* (W planach) **LLM** – integracja z darmowym modelem sztucznej inteligencji za pomocą **Google Gemini API**[cite: 3].
* (W planach) **Baza Danych** – zapisywanie logów zapytań w relacyjnej bazie danych PostgreSQL[cite: 3].

## 📚 Dokumentacja i Plan Projektu

Dokumentacja projektu prowadzona jest w systemie Atlassian Confluence. Z uwagi na to, że darmowy plan Confluence wymaga autoryzacji do wyświetlania stron, pełna i zaktualizowana kopia Planu Projektu (plik PDF) oraz diagramy (pliki PNG) zostały wgrane bezpośrednio do tego repozytorium.

🔗 https://o2-team-sgy9ya2w.atlassian.net/wiki/spaces/discordvoi/overview (może wymagać uprawnień)

📄 Plik PDF z planem projektu i diagramami znajdują się w plikach repozytorium powyżej.