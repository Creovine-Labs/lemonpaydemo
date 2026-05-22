/**
 * Africa's Talking SMS wrapper. Server-only.
 *
 * Used by /api/otp/send to deliver the 6-digit code. We use the REST endpoint
 * directly (no npm SDK dep) for simplicity and clearer error handling.
 *
 * Sandbox vs production is chosen by AT_USERNAME — when it's `sandbox`,
 * we hit the sandbox host. Real demos use a production account.
 */

const PROD_BASE = "https://api.africastalking.com";
const SANDBOX_BASE = "https://api.sandbox.africastalking.com";

export type SmsResult =
  | { ok: true; data: { message_id: string; cost: string; status: string } }
  | { ok: false; error: { code: string; message: string; status?: number } };

interface AtResponse {
  SMSMessageData?: {
    Message: string;
    Recipients: Array<{
      number: string;
      status: string;
      statusCode: number;
      cost: string;
      messageId: string;
    }>;
  };
}

interface SendSmsInput {
  to: string; // E.164
  message: string;
}

function getCreds(): { username: string; apiKey: string; senderId: string; base: string } {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const senderId = process.env.AT_SENDER_ID ?? "LEMONPAY";
  if (!username || !apiKey) {
    throw new Error(
      "Africa's Talking credentials missing. Set AT_USERNAME and AT_API_KEY in .env.local.",
    );
  }
  const base = username === "sandbox" ? SANDBOX_BASE : PROD_BASE;
  return { username, apiKey, senderId, base };
}

export async function sendSms(input: SendSmsInput): Promise<SmsResult> {
  const { username, apiKey, senderId, base } = getCreds();

  const body = new URLSearchParams({
    username,
    to: input.to,
    message: input.message,
    from: senderId,
  });

  let res: Response;
  try {
    res = await fetch(`${base}/version1/messaging`, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "network_error",
        message: err instanceof Error ? err.message : "Network error",
      },
    };
  }

  let payload: AtResponse;
  try {
    payload = (await res.json()) as AtResponse;
  } catch {
    return {
      ok: false,
      error: {
        code: "invalid_response",
        message: `Non-JSON response (${res.status})`,
        status: res.status,
      },
    };
  }

  const recipient = payload.SMSMessageData?.Recipients?.[0];
  if (!res.ok || !recipient) {
    return {
      ok: false,
      error: {
        code: `http_${res.status}`,
        message: payload.SMSMessageData?.Message ?? "Africa's Talking send failed",
        status: res.status,
      },
    };
  }

  // Status codes 100–102 are accepted. 4xx/5xx codes mean failure.
  if (recipient.statusCode >= 400) {
    return {
      ok: false,
      error: {
        code: `at_${recipient.statusCode}`,
        message: recipient.status,
        status: recipient.statusCode,
      },
    };
  }

  return {
    ok: true,
    data: {
      message_id: recipient.messageId,
      cost: recipient.cost,
      status: recipient.status,
    },
  };
}
