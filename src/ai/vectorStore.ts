/**
 * Vector Store - Simple in-memory vector database
 * For production, consider Pinecone, Chroma, or Weaviate
 */

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export class SimpleVectorStore {
  private documents: VectorDocument[] = [];

  /**
   * Add document to vector store
   */
  addDocument(doc: VectorDocument): void {
    this.documents.push(doc);
  }

  /**
   * Add multiple documents
   */
  addDocuments(docs: VectorDocument[]): void {
    this.documents.push(...docs);
  }

  /**
   * Simple text-based search (TF-IDF style)
   */
  search(query: string, topK: number = 5): VectorDocument[] {
    const queryTokens = this.tokenize(query.toLowerCase());

    const scoredDocs = this.documents.map((doc) => ({
      doc,
      score: this.calculateScore(queryTokens, doc),
    }));

    return scoredDocs
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item) => item.doc);
  }

  /**
   * Calculate relevance score
   */
  private calculateScore(queryTokens: string[], doc: VectorDocument): number {
    const docTokens = this.tokenize(doc.content.toLowerCase());
    let score = 0;

    for (const token of queryTokens) {
      if (docTokens.includes(token)) {
        score += 1;
      }
    }

    // Boost metadata matches
    const metaStr = JSON.stringify(doc.metadata).toLowerCase();
    for (const token of queryTokens) {
      if (metaStr.includes(token)) {
        score += 0.5;
      }
    }

    return score;
  }

  /**
   * Tokenize text
   */
  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents = [];
  }

  /**
   * Get document count
   */
  count(): number {
    return this.documents.length;
  }
}

// Export singleton instance
export const vectorStore = new SimpleVectorStore();
