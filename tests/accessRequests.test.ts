import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { attachNames, loadPendingRequests } from "../src/lib/accessRequests";
import { cleanupUsers, createRawUser, createTestUser, signInAs, type TestUser } from "./helpers";

describe("trainer access requests list", () => {
  let trainer: TestUser;
  let other: TestUser;
  const ids: string[] = [];

  beforeAll(async () => {
    trainer = await createTestUser("reqTrainer", "trainer");
    other = await createTestUser("reqOther", "trainer");
    ids.push(trainer.id, other.id);
  });
  afterAll(async () => { await cleanupUsers(ids); });

  async function requester(label: string) {
    const u = await createRawUser(label, { full_name: `QA ${label}` });
    ids.push(u.id);
    const c = await signInAs(u.email);
    const { error } = await c.from("trainer_requests").insert({ client_id: u.id, trainer_id: trainer.id, note: "hi" });
    expect(error).toBeNull();
    return { ...u, client: c };
  }

  it("old embedded join is rejected by the server (why the list was empty)", async () => {
    const r = await trainer.client.from("trainer_requests").select("id, profiles:client_id(full_name)").limit(1);
    expect(r.error).not.toBeNull();
  });

  it("empty list is [] not an error", async () => {
    await expect(loadPendingRequests(trainer.client)).resolves.toEqual([]);
  });

  it("trainer sees request with name; approve connects and clears it", async () => {
    const u = await requester("reqApprove");
    const list = await loadPendingRequests(trainer.client);
    expect(list.map((r) => r.client_id)).toEqual([u.id]);
    expect(list[0].full_name).toBe("QA reqApprove");

    // Another trainer can neither see nor approve it.
    expect(await loadPendingRequests(other.client)).toEqual([]);
    const bad = await other.client.rpc("respond_to_trainer_request", { _request_id: list[0].id, _approve: true });
    expect(bad.error).not.toBeNull();

    const ok = await trainer.client.rpc("respond_to_trainer_request", { _request_id: list[0].id, _approve: true });
    expect(ok.error).toBeNull();
    expect(await loadPendingRequests(trainer.client)).toEqual([]);
    const { data: link } = await u.client.from("trainer_clients").select("trainer_id").eq("client_id", u.id);
    expect(link?.map((l) => l.trainer_id)).toEqual([trainer.id]);
  });

  it("decline clears it without connecting", async () => {
    const u = await requester("reqDecline");
    const [req] = await loadPendingRequests(trainer.client);
    const r = await trainer.client.rpc("respond_to_trainer_request", { _request_id: req.id, _approve: false, _reason: "full" });
    expect(r.error).toBeNull();
    expect(await loadPendingRequests(trainer.client)).toEqual([]);
    const { data: link } = await u.client.from("trainer_clients").select("id").eq("client_id", u.id);
    expect(link).toEqual([]);
  });

  it("a failed query throws instead of looking like no requests", async () => {
    const broken = createClient("http://127.0.0.1:1", "x", { auth: { persistSession: false } });
    await expect(loadPendingRequests(broken)).rejects.toBeTruthy();
  });

  it("missing name falls back to null", () => {
    expect(attachNames([{ id: "r", client_id: "c", note: null, created_at: "" }], [])[0].full_name).toBeNull();
  });
});
