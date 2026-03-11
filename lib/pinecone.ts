import { Pinecone } from '@pinecone-database/pinecone'

function getIndex() {
    const apiKey = process.env.PINECONE_API_KEY
    const indexName = process.env.PINECONE_INDEX_NAME

    if (!apiKey) {
        throw new Error('PINECONE_API_KEY is not set')
    }

    if (!indexName) {
        throw new Error('PINECONE_INDEX_NAME is not set')
    }

    const pinecone = new Pinecone({
        apiKey,
    })

    return pinecone.index(indexName)
}

export async function saveManyVectors(vectors: Array<{
    id: string
    embedding: number[]
    metadata: any
}>) {
    const index = getIndex()
    const upsertData = vectors.map(v => ({
        id: v.id,
        values: v.embedding,
        metadata: v.metadata
    }))

    await index.upsert(upsertData)
}

export async function searchVectors(
    embedding: number[],
    filter: any = {},
    topK: number = 5
) {
    const index = getIndex()
    const result = await index.query({
        vector: embedding,
        filter,
        topK,
        includeMetadata: true
    })

    return result.matches || []
}
