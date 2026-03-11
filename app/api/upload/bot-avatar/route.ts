import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

function getS3Client() {
    const region = process.env.AWS_REGION
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    if (!region || !accessKeyId || !secretAccessKey) {
        throw new Error('AWS S3 environment variables are not fully set')
    }

    return new S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    })
}

export async function POST(request: NextRequest) {
    try {
        const s3Client = getS3Client()
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'unautorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'no file provided' }, { status: 400 })
        }

        const fileExtension = file.name.split('.').pop()
        const fileName = `bot-avatars/${userId}-${Date.now()}.${fileExtension}`

        const buffer = Buffer.from(await file.arrayBuffer())

        const bucketName = process.env.S3_BUCKET_NAME

        if (!bucketName) {
            throw new Error('S3_BUCKET_NAME is not set')
        }

        const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: file.type
        })

        await s3Client.send(uploadCommand)

        const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`

        return NextResponse.json({
            success: true,
            url: publicUrl
        })

    } catch (error) {
        console.error('s3 uplaod error:', error)
        return NextResponse.json({ error: 'failed to upload image' }, { status: 500 })
    }
}
