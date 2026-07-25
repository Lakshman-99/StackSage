"""
StackSage Vector Store Service - ChromaDB with persistent storage.
Data is saved to disk at data/chromadb/ and survives server restarts.
"""

from typing import Optional

import chromadb

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class VectorStoreService:
    """Manages persistent ChromaDB collections for code embeddings."""

    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[chromadb.ClientAPI] = None

    @property
    def client(self) -> chromadb.ClientAPI:
        if self._client is None:
            persist_path = str(self.settings.chroma_persist_path)
            self._client = chromadb.PersistentClient(path=persist_path)
            logger.info("chromadb_initialized", persist_dir=persist_path)
        return self._client

    def get_or_create_collection(self, repo_id: str) -> chromadb.Collection:
        """Get or create a ChromaDB collection for a repository."""
        collection_name = f"stacksage_{repo_id.replace('-', '_')[:50]}"
        collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("collection_ready", name=collection_name, count=collection.count())
        return collection

    def add_documents(
        self,
        repo_id: str,
        ids: list[str],
        documents: list[str],
        metadatas: list[dict],
    ) -> int:
        """Add code chunks to the vector store in batches."""
        collection = self.get_or_create_collection(repo_id)
        batch_size = 100
        total_added = 0

        for i in range(0, len(documents), batch_size):
            batch_ids = ids[i : i + batch_size]
            batch_docs = documents[i : i + batch_size]
            batch_meta = metadatas[i : i + batch_size]

            try:
                collection.add(ids=batch_ids, documents=batch_docs, metadatas=batch_meta)
                total_added += len(batch_ids)
            except Exception as e:
                logger.error("embedding_batch_failed", repo_id=repo_id, batch=i, error=str(e))
                # Continue with remaining batches
                continue

        logger.info("documents_added", repo_id=repo_id, count=total_added)
        return total_added

    def query(
        self,
        repo_id: str,
        query_text: str,
        n_results: int = 10,
        where: Optional[dict] = None,
    ) -> dict:
        """Query the vector store for relevant code chunks."""
        collection = self.get_or_create_collection(repo_id)
        count = collection.count()

        if count == 0:
            logger.warning("query_empty_collection", repo_id=repo_id)
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

        kwargs = {
            "query_texts": [query_text],
            "n_results": min(n_results, count),
        }
        if where:
            kwargs["where"] = where

        results = collection.query(**kwargs)
        logger.debug("vector_query", repo_id=repo_id, query=query_text[:80], results=len(results.get("documents", [[]])[0]))
        return results

    def delete_collection(self, repo_id: str) -> None:
        """Delete a repository's vector collection."""
        collection_name = f"stacksage_{repo_id.replace('-', '_')[:50]}"
        try:
            self.client.delete_collection(collection_name)
            logger.info("collection_deleted", name=collection_name)
        except Exception as e:
            logger.warning("collection_delete_failed", name=collection_name, error=str(e))

    def collection_exists(self, repo_id: str) -> bool:
        """Check if embeddings exist for a repo."""
        collection_name = f"stacksage_{repo_id.replace('-', '_')[:50]}"
        try:
            col = self.client.get_collection(collection_name)
            return col.count() > 0
        except Exception:
            return False

    def get_stats(self, repo_id: str) -> dict:
        collection = self.get_or_create_collection(repo_id)
        return {"collection_name": collection.name, "document_count": collection.count()}


# Singleton
_vector_store: Optional[VectorStoreService] = None

def get_vector_store() -> VectorStoreService:
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
    return _vector_store