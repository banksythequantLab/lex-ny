# Storyblok Blog Post — "The Citation Graph Is the Moat"

**To publish:** copy each field below into the corresponding Storyblok Story content type. Storyblok web UI → Content → blog/ → "New Story" → use the `blog_post` content type. The Lex.NY frontend (`/blog`) expects this exact shape, defined in `nota-shared/src/cms/storyblok-client.ts`:

```ts
content: {
  title: string;       // headline
  intro: string;       // dek / subhead
  body: rich_text;     // article body — paste markdown, Storyblok converts
  author: string;
}
```

The slug must be **under `blog/`** (the listing query uses `starts_with: "blog/"`).

---

## Field-by-field

### Slug
```
blog/citation-graph-is-the-moat
```

### Tags (Storyblok tag_list)
```
graphrag, neo4j, courtlistener, hackathon, attorney-supervised
```

### `content.title`
```
The Citation Graph Is the Moat
```

### `content.author`
```
Derek Soltis
```

### `content.intro`
```
A 6.3 million-edge citation graph in Neo4j is the difference between AI that sounds like a lawyer and AI that gives a lawyer real answers. Here is how Lex.NY uses GraphRAG to find leading precedent that pure vector search would have missed.
```

### `content.body` — paste this as rich text

(Storyblok's web UI accepts markdown paste. Headings/lists/code blocks all convert.)

---

When I started building Lex.NY, the question wasn't *"can a language model write something that sounds like legal research?"* That answer has been yes for two years. The question was *"can a language model find the case I'd actually cite?"* For a long time, the answer was no — and the reason was the retrieval layer, not the model.

Vector search is excellent at semantic similarity. If you ask *"what's the standard for summary judgment in a negligence case?"*, a 1024-dimensional embedding will return cases that *talk about* summary judgment in similar language. That's useful. But the controlling case in New York is *Winegrad v. New York University Medical Center*, 64 N.Y.2d 851 (1985), and the reason every NY litigator knows that name is not because *Winegrad* is the most semantically similar case to your query. It's because *Winegrad* is the most *cited* one.

That's a graph problem, not a vector problem.

## The shape of the data

CourtListener publishes monthly bulk dumps of every U.S. court opinion they've digitized: a 50 GB compressed opinions file, a 4.6 GB dockets file, a 498 MB citation map. I wrote a streaming Python pipeline that filters to NY courts (state appellate plus federal NY) and turns every citation into a row in a Postgres table called `opinion_citations`.

After it ran:

| | Count |
|---|---:|
| NY case decisions in the corpus | **1,322,766** |
| NY-to-NY citation edges | **4,940,299** |
| NY statute sections (all 137 Consolidated Laws) | **40,428** |

The citation map is the interesting half. Every row is a directed edge: opinion *X* cites opinion *Y*. Build that graph in Neo4j and a one-line Cypher query gives you the most-cited NY opinions in the entire corpus:

```cypher
MATCH (citer:Opinion)-[:CITES]->(o:Opinion)
RETURN o.case_name, count(citer) AS times_cited
ORDER BY times_cited DESC LIMIT 5
```

What came back was exactly what an experienced NY litigator would put at the top of a research treatise:

| Opinion | Court | Citations |
|---|---|---:|
| People v. Bleakley | NY Court of Appeals | 11,064 |
| People v. Contes | NY Court of Appeals | 10,824 |
| People v. Gonzalez | NY Court of Appeals | 9,538 |
| People v. Danielson | NY Court of Appeals | 9,314 |
| People v. Lopez | NY Court of Appeals | 8,302 |

The graph computed that list. Nobody hand-curated it.

## GraphRAG, concretely

Once that graph exists, the retrieval pipeline gets meaningfully smarter. Lex.NY's `/api/ask` endpoint runs five steps:

1. **Embed the question** with `mxbai-embed-large` (1,024-dimensional vectors, locally via Ollama on an RTX 3090).
2. **pgvector ANN search** against the indexed opinions and statutes — the top-K semantic matches.
3. **Neo4j graph expansion.** Take the top opinions from step 2 and run a Cypher traversal: what cites them, what they cite, what statutes they apply. That's GraphRAG. The neighbors come back with context the pure vector search didn't have.
4. **Bright Data Web Unlocker** fires three parallel calls to current, authoritative NY sources (nysenate.gov, law.justia.com, courtlistener.com) for any post-cutoff updates.
5. **Groq's Llama 3.3 70B** drafts the answer under a strict system prompt that requires a `[N]` citation marker after every factual claim — and refuses to write the claim at all if no source from steps 1–4 supports it.

Typical answer: 25 citations, 7–11 seconds end-to-end, every claim traceable.

## What this looks like in practice

The cited-by traversal is the demo moment. Click on *People v. Bleakley* in the Lex.NY UI and the graph returns its top citers, ranked by *their own* inbound citation count:

- *People v. Danielson* — 9,294 cites
- *People v. Romero* — 4,061 cites
- *People v. Mateo* — 2,763 cites

That ranking matters. *Danielson* (2007) is the modern restatement of the weight-of-evidence appellate review standard from *Bleakley* (1987) — and the graph found it without anyone telling it that Danielson was important. The 9,294 cites is the signal.

Westlaw and Lexis sell this kind of traversal as "KeyCite" and "Shepard's" — premium features bundled into five-figure annual subscriptions. Lex.NY exposes it as a free JSON endpoint at `/api/cited-by/{cluster_id}` and a clickable page at `/cited-by/{cluster_id}`. Both are open source, Apache-2.0.

## The thing nobody told me about CSV parsing

If you try to build this yourself, the part that will burn three days is the data format. CourtListener's opinions CSV has backslash-escaped quotes and literal newlines inside text fields. Python's default `csv.reader` misaligns 99.9% of rows. The fix is `doublequote=False, escapechar='\\\\'`, plus a `csv.field_size_limit` bump for summary cells that exceed 130 KB. Without those two flags, my opinion-to-cluster ID map matched 2 rows out of 5.6 million.

The other thing nobody mentions: CourtListener uses *cluster IDs* and *opinion IDs* as separate keyspaces. The citation map references opinion IDs. The opinions table uses cluster IDs. Bridging them required streaming the 50 GB opinions file once just to build a 28.8 MB `opinion_id → cluster_id` map. That's two hours of disk I/O for a hash join you didn't know you needed.

## Why this matters beyond New York

The architecture generalizes. Every expert domain — medical research, regulatory filings, patent prior art — has a citation network. Embeddings find documents that read similarly. Graph traversal finds documents that *matter*. The combination is the difference between a chatbot and a tool you can sign your name to.

I'm a NY-licensed attorney, SDNY/EDNY. Under Rule of Professional Conduct 7.1, I can't ship a system that invents case names. The citation graph is the architecture that makes that possible.

The corpus, the pipeline, the prompt, the smoke tests — all open source at [github.com/banksythequantLab/lex-ny](https://github.com/banksythequantLab/lex-ny).

Every case. Every statute. Every cite verifiable.

---

## Step-by-step Storyblok publishing (3 minutes)

If you've never done this before, here's the click-by-click:

1. Open [app.storyblok.com](https://app.storyblok.com) → your Lex.NY space
2. Left sidebar → **Content** → click the **blog** folder (or create it if it doesn't exist; click "+" and choose "New folder", name it `blog`)
3. Inside `blog/`, click **+ Entry** → choose the `blog_post` content type
4. **Name**: `The Citation Graph Is the Moat`
5. **Slug**: `citation-graph-is-the-moat`
6. Fill the content fields with the blocks above
7. **Tags** (top right): paste `graphrag, neo4j, courtlistener, hackathon, attorney-supervised`
8. Click the green **Publish** button (top right)
9. Visit `https://iam.nota.lawyer/blog` — your post should appear in the listing

**If the `blog_post` content type doesn't exist yet:**
1. Left sidebar → **Block Library** → **+ New block**
2. Name it `blog_post`
3. Add fields: `title` (Text), `intro` (Textarea), `body` (Richtext), `author` (Text)
4. Save the block, then go back to step 3 above

That's the whole flow.
