"""
Offline Vector & Semantic Incident Correlation Engine (Zero Cloud / 100% Air-Gapped)
Performs local semantic indexing and similarity matching over NOC Runbooks for Root-Cause Analysis (RCA).
"""

import json
import math
import logging
import re
from typing import List, Dict, Any, Tuple
import numpy as np
from app.core.config import RUNBOOKS_FILE_PATH

logger = logging.getLogger("OfflineRAG")

class LocalVectorRunbookIndex:
    def __init__(self):
        self.runbooks: List[Dict[str, Any]] = []
        self.vocabulary: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.doc_vectors: np.ndarray = np.array([])
        self.load_and_index()

    def _tokenize(self, text: str) -> List[str]:
        tokens = re.findall(r'\b[a-zA-Z0-9_\-\.]+\b', text.lower())
        return tokens

    def load_and_index(self):
        try:
            with open(RUNBOOKS_FILE_PATH, "r", encoding="utf-8") as f:
                self.runbooks = json.load(f)
        except Exception as e:
            logger.error(f"Could not load runbooks from {RUNBOOKS_FILE_PATH}: {e}")
            self.runbooks = []

        if not self.runbooks:
            return

        # Build document corpus strings
        docs = []
        for rb in self.runbooks:
            doc_str = f"{rb.get('title', '')} {' '.join(rb.get('trigger_symptoms', []))} {' '.join(rb.get('root_cause_categories', []))} {' '.join(rb.get('remediation_actions', []))}"
            docs.append(doc_str)

        # Build vocab and compute TF-IDF
        all_tokens_per_doc = [self._tokenize(d) for d in docs]
        vocab_set = set()
        for tokens in all_tokens_per_doc:
            vocab_set.update(tokens)

        self.vocabulary = {term: idx for idx, term in enumerate(sorted(vocab_set))}
        N = len(docs)

        # IDF calculation
        self.idf = {}
        for term in self.vocabulary:
            doc_freq = sum(1 for tokens in all_tokens_per_doc if term in tokens)
            self.idf[term] = math.log((N + 1) / (doc_freq + 1)) + 1.0

        # Create dense vector matrix
        num_terms = len(self.vocabulary)
        vectors = np.zeros((N, num_terms), dtype=np.float32)

        for doc_idx, tokens in enumerate(all_tokens_per_doc):
            tf = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            for term, count in tf.items():
                if term in self.vocabulary:
                    term_idx = self.vocabulary[term]
                    vectors[doc_idx, term_idx] = count * self.idf[term]

            # L2 normalize
            norm = np.linalg.norm(vectors[doc_idx])
            if norm > 0:
                vectors[doc_idx] /= norm

        self.doc_vectors = vectors
        logger.info(f"Offline Runbook Vector Index initialized with {len(self.runbooks)} runbooks and {num_terms} features.")

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if self.doc_vectors.size == 0:
            return []

        tokens = self._tokenize(query)
        q_vec = np.zeros((len(self.vocabulary),), dtype=np.float32)

        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1

        for term, count in tf.items():
            if term in self.vocabulary:
                q_vec[self.vocabulary[term]] = count * self.idf[term]

        norm = np.linalg.norm(q_vec)
        if norm > 0:
            q_vec /= norm
        else:
            return self.runbooks[:top_k]

        # Cosine similarity matrix dot product
        scores = np.dot(self.doc_vectors, q_vec)
        ranked_indices = np.argsort(scores)[::-1]

        results = []
        for idx in ranked_indices[:top_k]:
            rb = dict(self.runbooks[idx])
            rb["similarity_score"] = float(round(scores[idx], 3))
            results.append(rb)

        return results

offline_rag = LocalVectorRunbookIndex()
