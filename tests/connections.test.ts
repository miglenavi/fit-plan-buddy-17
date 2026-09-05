import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  cleanupUsers,
  createTestUser,
  signInAs,
  createRawUser,
  type TestUser,
} from "./helpers";

/** The three ways a trainer<->client connection is made, plus trainer onboarding. */
describe("connections", () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    await cleanupUsers(createdIds);
  }, 120_000);

  describe("invite links", () => {
    let trainer: TestUser;
    let newClient: TestUser;
    let token: string;

    beforeAll(async () => {
      trainer = await createTestUser("trainer-invite", "trainer");
      newClient = await createTestUser("client-invite", "client");
      createdIds.push(trainer.id, newClient.id);
    }, 90_000);

    it("trainer creates an invite with a 30-day expiry", async () => {
      token = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const expires = new Date(Date.now() + 30 * 86400_000).toISOString();
      const res = await trainer.client
        .from("client_invites")
        .insert({
          trainer_id: trainer.id,
          token,
          email: newClient.email,
          full_name: "QA Invitee",
          expires_at: expires,
        })
        .select("id, status")
        .single();
      expect(res.error).toBeNull();
      expect(res.data!.status).toBe("pending");
    });

    it("get_invite_info returns valid info for a good token and nothing for a bogus one", async () => {
      const good = await newClient.client.rpc("get_invite_info", { _token: token });
      expect(good.error).toBeNull();
      expect(good.data).toHaveLength(1);
      expect(good.data![0].valid).toBe(true);
      expect(good.data![0].email).toBe(newClient.email);

      const bad = await newClient.client.rpc("get_invite_info", { _token: "not-a-real-token" });
      expect(bad.error).toBeNull();
      expect(bad.data ?? []).toHaveLength(0);
    });

    it("an expired invite reports valid: false", async () => {
      const expiredToken = `qa-exp-${Date.now()}`;
      await admin.from("client_invites").insert({
        trainer_id: trainer.id,
        token: expiredToken,
        expires_at: new Date(Date.now() - 86400_000).toISOString(),
      });
      const info = await newClient.client.rpc("get_invite_info", { _token: expiredToken });
      expect(info.data![0].valid).toBe(false);

      const accept = await newClient.client.rpc("accept_client_invite", { _token: expiredToken });
      expect(accept.error?.message).toMatch(/expired/i);
    });

    it("a client accepting the invite gets linked and the invite is marked accepted", async () => {
      const res = await newClient.client.rpc("accept_client_invite", { _token: token });
      expect(res.error).toBeNull();
      expect(res.data).toBe(trainer.id);

      const link = await admin
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", trainer.id)
        .eq("client_id", newClient.id);
      expect(link.data).toHaveLength(1);

      const invite = await admin
        .from("client_invites")
        .select("status, accepted_by")
        .eq("token", token)
        .single();
      expect(invite.data!.status).toBe("accepted");
      expect(invite.data!.accepted_by).toBe(newClient.id);
    });

    it("re-accepting the same token fails and does not double-link", async () => {
      const res = await newClient.client.rpc("accept_client_invite", { _token: token });
      expect(res.error).not.toBeNull();
      expect(res.error!.message).toMatch(/already been used/i);

      const link = await admin
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", trainer.id)
        .eq("client_id", newClient.id);
      expect(link.data).toHaveLength(1);
    });
  });

  describe("access requests", () => {
    let trainer: TestUser;
    let otherTrainer: TestUser;
    let client: TestUser;
    let client2: TestUser;

    beforeAll(async () => {
      trainer = await createTestUser("trainer-req", "trainer");
      otherTrainer = await createTestUser("trainer2-req", "trainer");
      client = await createTestUser("client-req", "client");
      client2 = await createTestUser("client2-req", "client");
      createdIds.push(trainer.id, otherTrainer.id, client.id, client2.id);
    }, 90_000);

    it("approving a request creates the trainer<->client link", async () => {
      const req = await client.client
        .from("trainer_requests")
        .insert({ client_id: client.id, trainer_id: trainer.id, note: "please take me on" })
        .select("id, status")
        .single();
      expect(req.error).toBeNull();
      expect(req.data!.status).toBe("pending");

      // an unrelated trainer cannot act on it
      const foreign = await otherTrainer.client.rpc("respond_to_trainer_request", {
        _request_id: req.data!.id,
        _approve: true,
      });
      expect(foreign.error).not.toBeNull();

      // the client cannot approve their own request
      const selfApprove = await client.client.rpc("respond_to_trainer_request", {
        _request_id: req.data!.id,
        _approve: true,
      });
      expect(selfApprove.error).not.toBeNull();

      const ok = await trainer.client.rpc("respond_to_trainer_request", {
        _request_id: req.data!.id,
        _approve: true,
      });
      expect(ok.error).toBeNull();

      const link = await admin
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", trainer.id)
        .eq("client_id", client.id);
      expect(link.data).toHaveLength(1);

      const row = await admin
        .from("trainer_requests")
        .select("status")
        .eq("id", req.data!.id)
        .single();
      expect(row.data!.status).toBe("approved");
    });

    it("declining a request stores the reason and creates no link", async () => {
      const req = await client2.client
        .from("trainer_requests")
        .insert({ client_id: client2.id, trainer_id: trainer.id })
        .select("id")
        .single();
      expect(req.error).toBeNull();

      const res = await trainer.client.rpc("respond_to_trainer_request", {
        _request_id: req.data!.id,
        _approve: false,
        _reason: "Full at the moment",
      });
      expect(res.error).toBeNull();

      const row = await admin
        .from("trainer_requests")
        .select("status, decline_reason")
        .eq("id", req.data!.id)
        .single();
      expect(row.data!.status).toBe("declined");
      expect(row.data!.decline_reason).toBe("Full at the moment");

      const link = await admin
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", trainer.id)
        .eq("client_id", client2.id);
      expect(link.data ?? []).toHaveLength(0);
    });
  });

  describe("trainer applications", () => {
    let applicant: { id: string; email: string };
    let applicantClient: Awaited<ReturnType<typeof signInAs>>;
    let rejectee: { id: string; email: string };
    let superAdmin: TestUser;
    let plainTrainer: TestUser;

    beforeAll(async () => {
      applicant = await createRawUser("applicant", { role: "trainer" });
      rejectee = await createRawUser("rejectee", { role: "trainer" });
      applicantClient = await signInAs(applicant.email);
      superAdmin = await createTestUser("superadmin", "trainer");
      plainTrainer = await createTestUser("trainer-plain", "trainer");
      await admin.from("user_roles").insert({ user_id: superAdmin.id, role: "super_admin" });
      createdIds.push(applicant.id, rejectee.id, superAdmin.id, plainTrainer.id);
    }, 90_000);

    it("self-signup as trainer creates a pending application and grants no role", async () => {
      const app = await admin
        .from("trainer_applications")
        .select("status")
        .eq("user_id", applicant.id)
        .single();
      expect(app.data!.status).toBe("pending");

      const roles = await admin.from("user_roles").select("role").eq("user_id", applicant.id);
      expect(roles.data ?? []).toHaveLength(0);
    });

    it("a non-super-admin cannot approve or reject", async () => {
      const approve = await plainTrainer.client.rpc("approve_trainer", { _user_id: applicant.id });
      expect(approve.error).not.toBeNull();

      const reject = await plainTrainer.client.rpc("reject_trainer", {
        _user_id: applicant.id,
        _reason: "nope",
      });
      expect(reject.error).not.toBeNull();

      const applicantSelf = await applicantClient.rpc("approve_trainer", {
        _user_id: applicant.id,
      });
      expect(applicantSelf.error).not.toBeNull();

      const roles = await admin.from("user_roles").select("role").eq("user_id", applicant.id);
      expect(roles.data ?? []).toHaveLength(0);
    });

    it("a super admin can approve an application and the trainer role is granted", async () => {
      const res = await superAdmin.client.rpc("approve_trainer", { _user_id: applicant.id });
      expect(res.error).toBeNull();

      const roles = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", applicant.id)
        .eq("role", "trainer");
      expect(roles.data).toHaveLength(1);

      const app = await admin
        .from("trainer_applications")
        .select("status, reviewed_by")
        .eq("user_id", applicant.id)
        .single();
      expect(app.data!.status).toBe("approved");
      expect(app.data!.reviewed_by).toBe(superAdmin.id);
    });

    it("a super admin can reject an application with a reason", async () => {
      const res = await superAdmin.client.rpc("reject_trainer", {
        _user_id: rejectee.id,
        _reason: "Needs certification",
      });
      expect(res.error).toBeNull();

      const app = await admin
        .from("trainer_applications")
        .select("status, rejection_reason")
        .eq("user_id", rejectee.id)
        .single();
      expect(app.data!.status).toBe("rejected");
      expect(app.data!.rejection_reason).toBe("Needs certification");

      const roles = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", rejectee.id)
        .eq("role", "trainer");
      expect(roles.data ?? []).toHaveLength(0);
    });
  });
});
