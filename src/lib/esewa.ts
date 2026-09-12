import crypto from "node:crypto";

function getSecretKey() {
  const key = process.env.ESEWA_SECRET_KEY;
  if (!key) throw new Error("ESEWA_SECRET_KEY environment variable is not configured.");
  return key;
}

export function getEsewaConfig() {
  return {
    productCode: process.env.ESEWA_PRODUCT_CODE ?? "EPAYTEST",
    formUrl: process.env.ESEWA_FORM_URL ?? "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl: process.env.ESEWA_STATUS_URL ?? "https://rc.esewa.com.np/api/epay/transaction/status/",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

/**
 * eSewa signs a comma-joined string of `field=value` pairs, in the exact order
 * listed by signed_field_names, via HMAC-SHA256, base64-encoded.
 */
export function signEsewaFields(fields: [string, string][]) {
  const message = fields.map(([key, value]) => `${key}=${value}`).join(",");
  return crypto.createHmac("sha256", getSecretKey()).update(message).digest("base64");
}

export type EsewaResponsePayload = {
  transaction_code: string;
  status: string;
  total_amount: string | number;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
};

export function decodeEsewaResponse(data: string): EsewaResponsePayload {
  const json = Buffer.from(data, "base64").toString("utf-8");
  return JSON.parse(json);
}

export function verifyEsewaSignature(payload: EsewaResponsePayload) {
  const fieldNames = payload.signed_field_names.split(",");
  const fields: [string, string][] = fieldNames.map((field) => [field, String(payload[field as keyof EsewaResponsePayload] ?? "")]);
  const expected = signEsewaFields(fields);
  return expected === payload.signature;
}
