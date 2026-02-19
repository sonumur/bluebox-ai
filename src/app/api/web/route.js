import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    try {
        // Check if the query is a URL
        const isUrl = /^(https?:\/\/[^\s]+)$/.test(query);

        if (isUrl) {
            console.log(`Web API: Scraping URL: ${query}`);
            const res = await fetch(query, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch URL: ${res.status}`);
            }

            const html = await res.text();
            // Basic HTML stripping (highly simplified)
            const text = html
                .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 5000); // Limit context size

            return NextResponse.json({
                type: "scrape",
                content: text,
                url: query
            });
        } else {
            console.log(`Web API: Searching DuckDuckGo for: ${query}`);
            const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const searchRes = await fetch(searchUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });

            if (searchRes.status === 403 || searchRes.status === 429) {
                return NextResponse.json({
                    error: "Search service is temporarily limited",
                    details: "DuckDuckGo is blocking the request. Please try again later or use Live News."
                }, { status: 503 });
            }

            if (!searchRes.ok) {
                throw new Error(`DuckDuckGo error: ${searchRes.status}`);
            }

            const searchHtml = await searchRes.text();

            // Parse DDG HTML results
            const results = [];
            const resultBlocks = searchHtml.split('class="result__body"').slice(1, 4); // Top 3 results (fewer but better context)

            resultBlocks.forEach(block => {
                const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
                const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

                if (titleMatch && snippetMatch) {
                    const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
                    const snippet = snippetMatch[1].replace(/<[^>]+>/g, "").trim();
                    results.push(`🔹 ${title}\n   ${snippet}`);
                }
            });

            return NextResponse.json({
                type: "search",
                content: results.length > 0
                    ? `Top web results for "${query}":\n\n` + results.join("\n\n")
                    : "I searched the web but couldn't find a direct answer. Please try a different query or use the Live News feature.",
                query
            });
        }
    } catch (error) {
        console.error("Web API Error:", error);
        return NextResponse.json({
            error: "Could not access the web",
            details: error.message
        }, { status: 500 });
    }
}
