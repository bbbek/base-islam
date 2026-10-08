# Nur Salah: Telegram Mini App

Prayer times, Qibla, Quran with translation and audio, dhikr counter. Free, no paywall.
"Nur Salah" is a working name: check trademark, domain and bot handle before launch.

```
docs/   the Mini App (static files, no build step). GitHub Pages serves this folder.
bot/    optional Adhan messages bot (server.py, standard library only) + tests
```

## 1. Publish on GitHub Pages
1. Create a repository and upload everything from this folder.
2. Settings -> Pages -> Source: "Deploy from a branch", branch `main`, folder `/docs`, Save.
3. After a minute the site is at `https://<user>.github.io/<repo>/`. Open it in a browser to check.

## 2. Connect it to Telegram
1. In @BotFather: `/newbot`, then save the token somewhere private. Never put it in the repository.
2. `/setmenubutton` -> choose the bot -> paste the Pages URL -> pick a button title.
   Or `/newapp` for a shareable `t.me/<bot>/<name>` link.
3. Open the bot on your phone and press the menu button.

## 3. Adhan messages (optional)
Needs a host that stays on (VPS, Fly.io). Prayer times and everything else work without it.
```bash
BOT_TOKEN=<token> WEBAPP_URL=<pages url> PORT=8080 python3 bot/server.py
```
Put the bot's public HTTPS URL into `docs/config.js` (`BOT_API_URL`), commit, and turn on the Adhan switch in the app's settings.
Users must press Start on the bot once.

## Tests
```bash
python3 -m unittest discover -s bot -v
```

## Data (loaded at runtime, nothing bundled)
Aladhan API (prayer times), alquran.cloud (text, translations), islamic.network (audio), Open-Meteo (city search).
Check each source's terms before a commercial launch.

## Not built
Dua, Names of Allah, group dhikr, guided rakah prompts, share-as-image, explicit offline download, offline audio.
Tested in a desktop browser and with unit tests, not yet inside the real Telegram app.
