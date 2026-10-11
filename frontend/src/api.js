export async function apiRequest(
  path,
  { method = 'GET', body, token } = {},
) {
  const headers = {}

  // Send JSON headers only when the request includes a JSON body.
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  // Keep the token in the request header rather than putting it in the URL.
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    // Show a useful message for connection failures and request timeouts.
    throw new Error('Palvelimeen ei saatu yhteyttä. Yritä uudelleen.')
  }

  // A proxy error may return plain text instead of the API's usual JSON.
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      data?.error || `Pyyntö epäonnistui (${response.status}).`,
    )

    // Let the UI distinguish an expired session from other failures.
    error.status = response.status
    throw error
  }

  if (data === null) {
    throw new Error('Palvelin palautti odottamattoman vastauksen.')
  }

  return data
}