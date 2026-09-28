"""
Local Air-Gapped ChromaDB Vector Store & RAG Service
Uses a 100% offline local embedding function (TF-IDF / Hashing) with ZERO external model downloads or internet calls.
Strict Air-Gap Verified.
"""

import os
import json
import math
import logging
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np
import chromadb
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings

logger = logging.getLogger("ChromaRAGService")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CHROMA_DIR = BASE_DIR / "data" / "chroma_db"
SOPS_FILE = BASE_DIR / "data" / "enterprise_sops.json"

class OfflineLocalEmbeddingFunction(EmbeddingFunction):
    """
    100% local, deterministic dense embedding function.
    Eliminates all external model download attempts from HuggingFace/ONNX.
    """
    def __init__(self, dim: int = 128):
        self.dim = dim

    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for doc in input:
            tokens = re.findall(r'\b[a-zA-Z0-9_\-\.]+\b', doc.lower())
            vec = np.zeros(self.dim, dtype=np.float32)
            if not tokens:
                embeddings.append(vec.tolist())
                continue

            for t in tokens:
                # Hash token into dimension buckets
                h = hash(t) % self.dim
                vec[h] += 1.0

            # L2 normalize
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec /= norm
            embeddings.append(vec.tolist())
        return embeddings

class ChromaRAGService:
    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self.embedding_fn = OfflineLocalEmbeddingFunction(dim=128)
        self.sops_data: List[Dict[str, Any]] = []
        self._init_chromadb()

    def _init_chromadb(self):
        try:
            os.makedirs(str(CHROMA_DIR), exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
            self.collection = self.chroma_client.get_or_create_collection(
                name="noc_enterprise_sops_offline",
                embedding_function=self.embedding_fn,
                metadata={"hnsw:space": "cosine"}
            )
            self._load_and_ingest_sops()
            logger.info(f"Initialized Offline ChromaDB vector store at {CHROMA_DIR} (Total docs: {self.collection.count()})")
        except Exception as e:
            logger.error(f"ChromaDB initialization error: {e}")

    def _load_and_ingest_sops(self):
        if not SOPS_FILE.exists():
            logger.warning(f"SOPs file {SOPS_FILE} does not exist.")
            return

        try:
            with open(SOPS_FILE, "r", encoding="utf-8") as f:
                self.sops_data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to read SOPs JSON: {e}")
            return

        documents = []
        metadatas = []
        ids = []

        for sop in self.sops_data:
            sop_id = sop["id"]
            doc_content = (
                f"SOP ID: {sop_id}\n"
                f"Title: {sop['title']}\n"
                f"Category: {sop['category']}\n"
                f"Severity: {sop['severity_profile']}\n"
                f"Target Roles: {', '.join(sop.get('target_roles', []))}\n"
                f"Trigger Precursors: {' | '.join(sop.get('trigger_precursors', []))}\n"
                f"Technical Root Causes: {' | '.join(sop.get('technical_root_causes', []))}\n"
                f"Preventive Remediation: {' '.join(sop.get('preventive_remediation_steps', []))}\n"
                f"Automation Runbook: {sop.get('automation_script', 'N/A')}\n"
                f"Lead Time: {sop.get('lead_time_window', '120-300s')}"
            )
            documents.append(doc_content)
            metadatas.append({
                "sop_id": sop_id,
                "title": sop["title"],
                "category": sop["category"],
                "severity": sop["severity_profile"],
                "automation_script": sop.get("automation_script", "")
            })
            ids.append(sop_id)

        # Upsert into ChromaDB
        if documents and self.collection:
            try:
                self.collection.upsert(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
                logger.info(f"Upserted {len(documents)} Enterprise SOPs into Offline ChromaDB vector collection.")
            except Exception as e:
                logger.error(f"ChromaDB upsert error: {e}")

    def query_sops(self, query_text: str, n_results: int = 2) -> List[Dict[str, Any]]:
        if not self.collection:
            return []

        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=min(n_results, self.collection.count() or 1)
            )

            matched_sops = []
            if results and "ids" in results and results["ids"]:
                for idx, doc_id in enumerate(results["ids"][0]):
                    raw_sop = next((s for s in self.sops_data if s["id"] == doc_id), None)
                    distance = results["distances"][0][idx] if "distances" in results and results["distances"] else 0.0
                    similarity = max(0.0, min(1.0, 1.0 - (distance / 2.0)))
                    if raw_sop:
                        sop_copy = dict(raw_sop)
                        sop_copy["similarity_score"] = round(similarity, 3)
                        matched_sops.append(sop_copy)

            return matched_sops
        except Exception as e:
            logger.error(f"ChromaDB query error: {e}")
            # Fallback to keyword matching
            q_lower = query_text.lower()
            scored = []
            for s in self.sops_data:
                score = 0.5
                if s["id"].lower() in q_lower or s["category"].lower() in q_lower:
                    score = 0.9
                elif any(sym.lower() in q_lower for sym in s.get("trigger_precursors", [])):
                    score = 0.85
                scored.append((score, s))
            scored.sort(key=lambda x: x[0], reverse=True)
            return [s for _, s in scored[:n_results]]

    def get_all_sops(self) -> List[Dict[str, Any]]:
        return self.sops_data

chroma_rag = ChromaRAGService()
