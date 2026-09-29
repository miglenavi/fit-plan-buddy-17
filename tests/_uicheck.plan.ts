import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const d = JSON.parse(readFileSync("/tmp/browser/picker/setup.json","utf8"));
const c = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
await c.auth.setSession(d.session);
const p = await c.from("plans").insert({ trainer_id: d.t, name: "QA UI Plan", status: "active" }).select("id").single();
const t = await c.from("trainings").insert({ plan_id: p.data!.id, name: "QA Day", order_index: 0 }).select("id").single();
console.log(p.data!.id, t.data!.id);
