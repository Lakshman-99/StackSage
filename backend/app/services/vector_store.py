"""
StackSage Vector Store Service - ChromaDB-backed vector storage for code embeddings.
Powers the RAG pipeline for the Question Agent.
"""

from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class VectorStoreService:
    """Manages ChromaDB collections for code chunk embeddings."""

    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[chromadb.ClientAPI] = None

    @property
    def client(self) -> chromadb.ClientAPI:
        if self._client is None:
            self._client = chromadb.Client(
                ChromaSettings(
                    persist_directory=str(self.settings.chroma_persist_path),
                    anonymized_telemetry=False,
                )
            )
            logger.info("chromadb_initialized", persist_dir=self.settings.chroma_persist_dir)
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
        """Add code chunks to the vector store."""
        collection = self.get_or_create_collection(repo_id)

        batch_size = 100
        total_added = 0

        for i in range(0, len(documents), batch_size):
            batch_ids = ids[i : i + batch_size]
            batch_docs = documents[i : i + batch_size]
            batch_meta = metadatas[i : i + batch_size]

            collection.add(
                ids=batch_ids,
                documents=batch_docs,
                metadatas=batch_meta,
            )
            total_added += len(batch_ids)

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

        kwargs = {
            "query_texts": [query_text],
            "n_results": min(n_results, collection.count() or 1),
        }
        if where:
            kwargs["where"] = where

        results = collection.query(**kwargs)
        logger.debug("vector_query", repo_id=repo_id, query=query_text[:100], n_results=n_results)
        return results

    def delete_collection(self, repo_id: str) -> None:
        """Delete a repository's vector collection."""
        collection_name = f"stacksage_{repo_id.replace('-', '_')[:50]}"
        try:
            self.client.delete_collection(collection_name)
            logger.info("collection_deleted", name=collection_name)
        except Exception as e:
            logger.warning("collection_delete_failed", name=collection_name, error=str(e))

    def get_stats(self, repo_id: str) -> dict:
        """Get stats for a repository's vector collection."""
        collection = self.get_or_create_collection(repo_id)
        return {
            "collection_name": collection.name,
            "document_count": collection.count(),
        }


# Singleton
_vector_store: Optional[VectorStoreService] = None


def get_vector_store() -> VectorStoreService:
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
    return _vector_store