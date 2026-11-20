# KSU Schedule Planner

A website (that also installs like an app on phones) where Kennesaw State students pick their major, mark what they've finished, and get a year of courses plus conflict-free schedules built from real KSU sections.

```
ksu-planner/
├── app/                      the server (Python, Flask)
│   ├── main.py               serves the site, class data, and AI features
│   ├── refresh.py            downloads fresh KSU sections (automatically, once a day)
│   ├── ksu.py                talks to KSU's class search
│   ├── build_data.py         converts sections into the planner's format
│   └── config.py             settings (from .env or environment variables)
├── static/                   the website students see
│   ├── index.html            page layout
│   ├── css/planner.css       styles (light and dark)
│   ├── js/engine.js          the scheduler
│   ├── js/requirements.js    each major's requirements  ← update every catalog year
│   ├── js/planner.js         everything on screen
│   ├── js/theme.js           light / dark switch
│   └── manifest.webmanifest, sw.js, icons/   install on phones, work offline
├── data/planner-data.json    class data (starts with your Spring 2027 download)
├── tests/                    automated tests (GitHub runs them on every push)
├── docs/                     how it works, how to update requirements
├── tools/ksu_sections.py     the original stand-alone download script
├── .github/workflows/        the GitHub test setup
└── requirements.txt, requirements-dev.txt, render.yaml, .env.example
```

More detail: [how it works](docs/how-it-works.md) · [updating requirements](docs/updating-requirements.md)

> Unofficial student project, not affiliated with Kennesaw State University. Always confirm requirements in DegreeWorks and sections in Owl Express.

---

## Part 1 · Run it on your laptop

You already have Python, so this takes about five minutes.

1. **Unzip** the project somewhere easy, like `Documents\ksu-planner`.
2. **Open PowerShell in that folder.** In File Explorer, open the folder, click the address bar, type `powershell`, and press Enter.
3. **Install the three libraries it uses:**
   ```
   py -m pip install -r requirements.txt
   ```
4. **(Optional) turn on the AI features.** Copy `.env.example`, rename the copy to `.env`, open it in Notepad, and paste an API key from [console.anthropic.com](https://console.anthropic.com) after `ANTHROPIC_API_KEY=`. Without a key the planner works fine; the "Describe your week" and "Advisor notes" boxes are hidden. AI requests are billed per use to that key, so set a monthly spend limit in the Console.
5. **Start the server:**
   ```
   py -m app.main
   ```
   Open **http://localhost:5000** in your browser. Press `Ctrl+C` in PowerShell to stop it.
6. **Get every subject's data.** The starter data only has the 7 subjects you downloaded. In a second PowerShell window in the same folder, run:
   ```
   py -m app.refresh
   ```
   It downloads every subject the four majors use (about 50, a few minutes). Restart the server afterward. The server also does this by itself once a day while it's running.

**To change term** (for example when Fall 2027 sections are posted), set `KSU_TERM=202708` in `.env` and run `py -m app.refresh`. Term codes: `YYYY01` Spring, `YYYY05` Summer, `YYYY08` Fall.

---

## Part 2 · Put the code on GitHub

Hosting services deploy from GitHub, and it keeps a history of every change.

**Before you upload, check:**
- Your `.env` file (with the API key) is **not** going up. It's listed in `.gitignore`, so GitHub Desktop won't show it. If you ever see `.env` in the list of changed files, stop and don't commit.
- You don't need `data/sections.json`; it's ignored too. `data/planner-data.json` *does* go up, so the site has data the moment it starts.

**Upload with GitHub Desktop (easiest on Windows):**
1. Make a free account at [github.com](https://github.com) and install [GitHub Desktop](https://desktop.github.com). Sign in.
2. **File → Add local repository →** choose your `ksu-planner` folder. It says it isn't a repository yet; click **create a repository**, keep the name `ksu-planner`, leave the other options alone, and click **Create repository**.
3. Look at the **Changes** list on the left: you should see `app/`, `static/`, `README.md` and so on, and no `.env`.
4. Bottom left, type a summary like `First version of KSU Schedule Planner` and click **Commit to main**.
5. Click **Publish repository**. Leave **Keep this code private** checked, then **Publish**.

**After any change later:** open GitHub Desktop, write a short summary of what you changed, **Commit to main**, then **Push origin**.

**Check the tests:** on github.com, open your repository → **Actions** tab. A green check means all tests passed on GitHub's computers. A red X shows which test failed.

**Running the tests on your laptop (optional):**
```
py -m pip install -r requirements-dev.txt
py -m pytest
```
(The scheduler tests need Node.js: `node --test tests/engine.test.mjs`. GitHub runs both for you, so this is optional.)

---

## Part 3 · Put it online (Render)

[Render](https://render.com) runs Python sites straight from GitHub. This project includes a `render.yaml` that sets everything up.

1. Make a Render account and connect your GitHub.
2. **New → Blueprint →** choose your `ksu-planner` repository → **Apply**.
3. When it asks for `ANTHROPIC_API_KEY`, paste your key (or leave it blank for no AI).
4. Wait for the deploy to finish. Render gives you a web address like `https://ksu-planner.onrender.com`. That's your site.

Every time you push a change from GitHub Desktop, Render redeploys automatically.

Things to know:
- Check Render's current pricing. On a free plan the site goes to sleep when nobody's using it, so the first visit after a while takes up to a minute to wake up. A paid plan keeps it awake and keeps the daily data refresh running on time.
- Change settings (like `KSU_TERM`) under your service → **Environment**.
- `https://your-site/api/status` shows the term, when data was last refreshed, and any refresh error.

---

## Part 4 · Install it on a phone (no app store needed)

Once the site is online, students can install it like an app. It gets its own icon, opens full screen, and still opens offline with the last class data it saw.

- **iPhone (Safari):** open the site → tap **Share** → **Add to Home Screen**.
- **Android (Chrome):** open the site → tap **⋮** → **Install app** (or **Add to Home screen**).

This is the fastest way to "have an app," and updates go out the moment you redeploy.

---

## Part 5 · App Store and Google Play (later)

When the website is solid, the same code can be wrapped as real store apps with [Capacitor](https://capacitorjs.com). What that takes:

- **Node.js** (free) on your laptop, and **Android Studio** (free) to build the Android app.
- **A Mac with Xcode** to build the iPhone app; Windows can't build iOS apps.
- **Developer accounts:** Apple charges a yearly fee and Google Play a one-time fee (check their current prices).
- **Something app-like beyond the website.** Apple often rejects apps that are just a website in a wrapper. Features like registration-day notifications (a reminder when your time ticket opens) would help it pass review.

Ask Claude to set up the Capacitor project when you're ready.

---

## Before you share it with other students

- **Ask KSU.** The server downloads public class-search data once a day, slowly (`KSU_DELAY`). Before launching publicly, ask the Registrar or UITS whether that's OK, or whether they offer an official data feed.
- **Keep the disclaimer.** The page says it's unofficial and that DegreeWorks and the catalog win. Major requirements in `static/js/requirements.js` were entered by hand from the 2025–26 curriculum sheets; update them each catalog year ([how](docs/updating-requirements.md)).
- **Control AI costs.** Each visitor gets `AI_PER_HOUR` AI requests per hour (default 20). Also set a spend limit in the Anthropic Console.
- **Rate My Professors:** the planner links to their search rather than copying ratings, which keeps you clear of their terms.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `py` isn't recognized | Reinstall Python from python.org and tick **Add Python to PATH**. |
| `pip install` fails building something | Install Python 3.13 alongside 3.15 and use `py -3.13` instead of `py`. |
| The page says class data isn't ready | The server has no data yet; run `py -m app.refresh`. |
| Refresh says KSU sent a web page | KSU may now require a login for class search. Check `/api/status` and tell Claude the error. |
| AI boxes don't show up | No `ANTHROPIC_API_KEY` set, or the server wasn't restarted after adding it. |
