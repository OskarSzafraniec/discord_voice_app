# Wirtualny Asystent Discord (Voice Bot)

Projekt na zaliczenie polegający na stworzeniu bota do Discorda, który odpowiada i reaguje na mowę użytkowników na kanałach głosowych. 

Bot wykorzystuje zoptymalizowane kosztowo technologie do działania:
* **STT** (przekształcanie mowy na tekst) – przetwarzanie lokalne przy użyciu biblioteki `SpeechRecognition`.
* **LLM** (generowanie inteligentnej odpowiedzi) – integracja z darmowym modelem sztucznej inteligencji za pomocą **Google Gemini API**.
* **TTS** (synteza mowy i odpowiadanie głosem) – lokalna generacja dźwięku za pomocą biblioteki `gTTS`.
  
Wszystkie logi zapytań są zapisywane w relacyjnej bazie danych PostgreSQL.

## 📚 Dokumentacja i Plan Projektu

Dokumentacja projektu prowadzona jest w systemie Atlassian Confluence. Z uwagi na to, że darmowy plan Confluence wymaga autoryzacji do wyświetlania stron, pełna i zaktualizowana kopia Planu Projektu (plik PDF) oraz diagramy (pliki PNG) zostały wgrane bezpośrednio do tego repozytorium.

🔗 https://o2-team-sgy9ya2w.atlassian.net/wiki/spaces/discordvoi/overview (może wymagać uprawnień)

📄 Plik PDF z planem projektu i diagramami znajdują się w plikach repozytorium powyżej.
