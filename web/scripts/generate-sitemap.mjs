import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const siteUrl = "https://stay.dovail.com";
const apiUrl = process.env.VITE_API_URL || `${siteUrl}/api`;
const output = fileURLToPath(new URL("../public/sitemap.xml", import.meta.url));
const staticPaths = ["/", "/experiences", "/services", "/help", "/support", "/privacy", "/terms"];

async function catalogPaths(endpoint, prefix) {
  try {
    const response = await fetch(`${apiUrl}/${endpoint}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    return (Array.isArray(data) ? data : [])
      .filter((item) => item?.id != null)
      .map((item) => `${prefix}/${encodeURIComponent(item.id)}`);
  } catch (error) {
    console.warn(`Sitemap: skipped ${endpoint} (${error.message})`);
    return [];
  }
}

const dynamicGroups = await Promise.all([
  catalogPaths("properties", "/reserve"),
  catalogPaths("experiences", "/experiences"),
  catalogPaths("services", "/service"),
]);
const paths = [...new Set([...staticPaths, ...dynamicGroups.flat()])];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join("\n")}
</urlset>
`;

await writeFile(output, xml, "utf8");
console.log(`Sitemap: wrote ${paths.length} canonical URLs`);
