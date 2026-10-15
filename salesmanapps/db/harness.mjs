/* Shared Playwright harness for the test suites in this folder.
   ---------------------------------------------------------------------------
   The suites drive the real application in a real browser and sign in with
   real credentials, so that the tokens, the row-level security policies and
   the posting functions exercised are the same ones a salesman's phone uses.
   None of them holds a service-role key.

   Two things are environment-specific and are therefore read from the
   environment rather than hard-coded:

     PLAYWRIGHT_MODULE    path to the playwright module, if it is not
                          resolvable from this folder
     CHROME_PATH          path to a Chromium binary, if Playwright's own
                          download is not present
     TLS_VIA_NODE=1       route the page's https requests through Node

   The last one exists because a sandboxed Chromium cannot always verify a
   local proxy's certificate authority -- there is no certutil to import it
   into the NSS store -- so every https request from the page fails with
   ERR_CERT_AUTHORITY_INVALID. Rather than switch certificate checking off in
   the browser, the harness performs those requests itself with Node, which
   does trust the bundle, and fulfils them. Verification stays on; it just
   happens one process over. Unset, the browser makes its own requests. */

const mod = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = (await import(mod)).default ?? await import(mod);

export async function browser() {
  const executablePath = process.env.CHROME_PATH || undefined;
  return chromium.launch(executablePath ? { executablePath } : {});
}

export async function page(b, viewport = { width: 1440, height: 900 }) {
  const pg = await b.newPage({ viewport });
  if (process.env.TLS_VIA_NODE !== '1') return pg;

  await pg.route(u => u.protocol === 'https:', async route => {
    const rq = route.request();
    try {
      const r = await fetch(rq.url(), {
        method: rq.method(),
        headers: Object.fromEntries(Object.entries(rq.headers())
          .filter(([k]) => !['host', 'connection', 'content-length'].includes(k.toLowerCase()))),
        body: ['GET', 'HEAD'].includes(rq.method()) ? undefined : rq.postData() || undefined,
        redirect: 'follow',
      });
      const buf = Buffer.from(await r.arrayBuffer());
      const h = {};
      r.headers.forEach((v, k) => {
        if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) h[k] = v;
      });
      /* The page is served from localhost and the API from Supabase, so the
         fulfilled response has to carry its own CORS headers. */
      h['access-control-allow-origin'] = '*';
      h['access-control-allow-headers'] = '*';
      h['access-control-expose-headers'] = '*';
      await route.fulfill({ status: r.status, headers: h, body: buf });
    } catch (e) { await route.abort(); }
  });
  return pg;
}
