export function isD1Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_API_TOKEN &&
      process.env.D1_DATABASE_ID,
  );
}

export type D1QueryResult = {
  success: boolean
  results: Record<string, unknown>[]
  meta: {
    changes?: number
    last_row_id?: number
  }
}

export async function queryD1(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<D1QueryResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.D1_DATABASE_ID;
  if (!accountId || !apiToken || !databaseId) {
    throw new Error('D1 not configured');
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    },
  );

  if (!res.ok) {
    throw new Error(`D1 query failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    success: boolean
    result?: D1QueryResult[]
  };
  const result = data.result?.[0];
  if (!data.success || !result?.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return result;
}
