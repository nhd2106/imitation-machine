import { db } from "../db/client";
import { approvals } from "../db/schema";

function getApprovalSecret(): string {
  const secret = process.env["AGENTIC_APPROVAL_SECRET"];
  if (!secret || secret.trim().length === 0) {
    throw new Error("AGENTIC_APPROVAL_SECRET is required for approval signing");
  }
  return secret;
}

/**
 * Records an approval and returns its ID.
 * signature = HMAC-SHA256(artifactId + ":" + approver + ":" + approvedAt)
 */
export async function recordApproval(
  artifactType: "plan" | "pr" | "release",
  artifactId: string,
  approver: string
): Promise<string> {
  const id = `APR-${crypto.randomUUID().slice(0, 8)}`;
  const approvedAt = new Date().toISOString();
  const signature = await computeHmac(`${artifactId}:${approver}:${approvedAt}`);

  db.insert(approvals).values({
    id,
    artifactType,
    artifactId,
    approver,
    approvedAt,
    signature,
  }).run();

  return id;
}

export async function verifyApproval(approvalId: string): Promise<boolean> {
  const record = db.select().from(approvals).all().find((a) => a.id === approvalId);
  if (!record) return false;

  const expected = await computeHmac(
    `${record.artifactId}:${record.approver}:${record.approvedAt}`
  );
  return expected === record.signature;
}

async function computeHmac(message: string): Promise<string> {
  const approvalSecret = getApprovalSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(approvalSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Buffer.from(sig).toString("hex");
}
