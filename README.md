# LogiCal home server

LogiCal is a single-user React web app with a Node 24 server and SQLite. The server stores meals, favorites, dated goals, settings and Apple Health export receipts. Clients cache the last snapshot and queue individual changes until the server acknowledges them. Concurrent writes to the same meal use the last mutation accepted by the server.

## Run on the home Mac

Install Node 24 with npm. Keep this project in a permanent directory accessible to your macOS user, such as ~/Apps/LogiCal. From that directory run:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm start
```

Open http://127.0.0.1:4317 on the Mac. The database defaults to ~/Library/Application Support/LogiCal/nutrition.sqlite. Use Settings → Import LogiCal backup to merge a JSON backup from the original tracker. For development run the server and npm run dev in separate terminals.

## Private phone access and daily backup

1. Connect the Mac and phone to your tailnet. Enable HTTPS certificates and run `tailscale serve --bg http://127.0.0.1:4317` on the Mac. Use the HTTPS hostname printed by Tailscale. Review existing Serve configuration first if the Mac hosts other services. On the standalone macOS app, the CLI is also available at /Applications/Tailscale.app/Contents/MacOS/Tailscale.
2. In your tailnet access policy grant your login TCP 443 on the home Mac. Review existing grants for broader access. The installed service also checks the Tailscale-User-Login header against the owner you specify.
3. Stop the foreground npm start process. With an external backup volume mounted, run the installer as your normal user. Substitute the login, host and existing backup directory:
   
   ```sh
   python3 deploy/install-macos.py --owner 'you@example.com' --host 'your-mac.your-tailnet.ts.net' --backup-dir '/Volumes/Backup/LogiCal'
   ```
   
   The server starts at login and restarts after failure. The launch agent uses caffeinate on AC power. Keep the Mac plugged in with the lid open. Following a reboot, log in to start the user agent. Daily verified SQLite snapshots run at 03:15 local time. Logs are in ~/Library/Logs/LogiCal.
4. For a restore drill, start a separate instance with `LOGICAL_DB=/path/to/a/copy-of-the-backup.sqlite PORT=4318 npm start`. Open localhost:4318 and check a known meal and its goal. Keep the original backup intact.

## Set up the iPhone Shortcut

In Shortcuts on the iPhone create a shortcut named **LogiCal Meal**. The app passes a single meal as JSON text. The Shortcut needs permission to write the four dietary samples to Apple Health and contact your Tailscale URL.

1. Use **Get Dictionary from Input** with **Shortcut Input**. Assign the dictionary to a variable named Meal.
2. Get **date** from Meal and convert it using **Get Dates from Input**. Use that date for each Health sample.
3. For each row below, get the dictionary value and pass it to a **Log Health Sample** action with the listed type and unit.

   | Meal key | Health sample | Unit |
   | --- | --- | --- |
   | calories | Dietary Energy | kcal |
   | protein | Protein | g |
   | carbs | Carbohydrates | g |
   | fat | Total Fat | g |

4. After the four writes succeed, use **Get Contents of URL** to POST to your own LogiCal HTTPS address followed by /api/confirm. Select a JSON request body with a single text field **ticket**, using the ticket from Meal as its value.
5. In LogiCal, open Settings → Preview meal exports, check the date and values, then tap Export meal. A confirmed meal is blocked from subsequent export. If the Shortcut stops partway through, review the samples in Health before releasing the meal for retry. Later corrections to an exported meal must also be made in Health.

The daily CSV summarizes intake for spreadsheets. The JSON backup merges records by meal ID and date. The SQLite backup includes the full database and export ledger.
