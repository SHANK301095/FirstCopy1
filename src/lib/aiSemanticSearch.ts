/**
 * Phase 4: AI Semantic Search for Knowledge Base
 * Simple TF-IDF based semantic search over copilot knowledge
 * No external embeddings needed — runs client-side
 */

interface SearchDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tokens?: string[];
  tfidf?: Map<string, number>;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  score: number;
  snippet: string;
}

// Stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'ought',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it',
  'they', 'them', 'their', 'this', 'that', 'these', 'those', 'what',
  'which', 'who', 'whom', 'where', 'when', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'between', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'and', 'but',
  'or', 'nor', 'if', 'kya', 'hai', 'ko', 'ka', 'ki', 'ke', 'se',
  'me', 'ye', 'wo', 'aur', 'ya', 'par', 'bhi', 'nahi', 'kaise',
]);

/**
 * Tokenize and normalize text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

/**
 * Build inverted index for fast search
 */
class SemanticSearchIndex {
  private documents: SearchDocument[] = [];
  private invertedIndex: Map<string, Set<number>> = new Map();
  private docFrequency: Map<string, number> = new Map();
  private avgDocLength = 0;

  /**
   * Add documents to the index
   */
  index(docs: Omit<SearchDocument, 'tokens' | 'tfidf'>[]): void {
    this.documents = docs.map(doc => ({
      ...doc,
      tokens: tokenize(`${doc.title} ${doc.content}`),
      tfidf: new Map(),
    }));

    // Build inverted index
    this.invertedIndex.clear();
    this.docFrequency.clear();

    let totalLength = 0;
    this.documents.forEach((doc, idx) => {
      const seen = new Set<string>();
      totalLength += doc.tokens!.length;

      for (const token of doc.tokens!) {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Set());
        }
        this.invertedIndex.get(token)!.add(idx);

        if (!seen.has(token)) {
          seen.add(token);
          this.docFrequency.set(token, (this.docFrequency.get(token) || 0) + 1);
        }
      }
    });

    this.avgDocLength = totalLength / Math.max(1, this.documents.length);

    // Compute TF-IDF for each document
    const N = this.documents.length;
    for (const doc of this.documents) {
      const termFreq = new Map<string, number>();
      for (const token of doc.tokens!) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      }

      for (const [term, tf] of termFreq) {
        const df = this.docFrequency.get(term) || 1;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1); // BM25 IDF
        const k1 = 1.2;
        const b = 0.75;
        const docLen = doc.tokens!.length;
        const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLen / this.avgDocLength));
        doc.tfidf!.set(term, tfNorm * idf);
      }
    }
  }

  /**
   * Search documents using BM25 scoring
   */
  search(query: string, topK = 5): SearchResult[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scores: { idx: number; score: number }[] = [];

    // Find candidate documents
    const candidates = new Set<number>();
    for (const token of queryTokens) {
      const docs = this.invertedIndex.get(token);
      if (docs) docs.forEach(idx => candidates.add(idx));
    }

    // Score candidates
    for (const idx of candidates) {
      const doc = this.documents[idx];
      let score = 0;

      for (const token of queryTokens) {
        score += doc.tfidf!.get(token) || 0;
      }

      // Boost exact phrase match
      const combined = doc.tokens!.join(' ');
      const queryStr = queryTokens.join(' ');
      if (combined.includes(queryStr)) score *= 1.5;

      // Boost title match
      const titleTokens = tokenize(doc.title).join(' ');
      if (titleTokens.includes(queryStr)) score *= 2;

      if (score > 0) scores.push({ idx, score });
    }

    // Sort and return top K
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map(({ idx, score }) => {
      const doc = this.documents[idx];
      const snippet = extractSnippet(doc.content, queryTokens);
      return {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        category: doc.category,
        score,
        snippet,
      };
    });
  }

  get documentCount(): number {
    return this.documents.length;
  }
}

/**
 * Extract relevant snippet from content
 */
function extractSnippet(content: string, queryTokens: string[], maxLen = 200): string {
  const lower = content.toLowerCase();
  let bestStart = 0;
  let bestScore = 0;

  // Sliding window to find best snippet
  const words = content.split(/\s+/);
  const windowSize = 30;

  for (let i = 0; i < words.length - windowSize; i++) {
    const window = words.slice(i, i + windowSize).join(' ').toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (window.includes(token)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  const snippet = words.slice(bestStart, bestStart + windowSize).join(' ');
  return snippet.length > maxLen ? snippet.slice(0, maxLen) + '...' : snippet;
}

// Singleton index
let searchIndex: SemanticSearchIndex | null = null;

/**
 * Initialize or get the search index
 */
export function getSearchIndex(): SemanticSearchIndex {
  if (!searchIndex) {
    searchIndex = new SemanticSearchIndex();
  }
  return searchIndex;
}

/**
 * Index copilot knowledge documents
 */
export function indexKnowledgeBase(documents: Omit<SearchDocument, 'tokens' | 'tfidf'>[]): void {
  const index = getSearchIndex();
  index.index(documents);
}

/**
 * Search the knowledge base
 */
export function searchKnowledge(query: string, topK = 5): SearchResult[] {
  const index = getSearchIndex();
  if (index.documentCount === 0) return [];
  return index.search(query, topK);
}

export type { SearchDocument, SearchResult };
