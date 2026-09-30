// Applies pending migrations. Run this as a deploy step: npm run migrate
import { closeDb, ready } from "../src/db";
ready().then(() => { console.log("Database is up to date."); return closeDb(); }).catch((e) => { console.error(e); process.exit(1); });
