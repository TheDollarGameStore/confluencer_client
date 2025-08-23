import { useMemo, useCallback } from 'react'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * useBackblazeAudio
 * Small helper for loading audio files from Backblaze B2 (S3-compatible).
 *
 * Contract
 * - Inputs: { region, endpoint, bucket, key, secret, forcePathStyle? }
 * - Exposes:
 *    - client: configured S3Client
 *    - buildPublicUrl(key): string
 *    - getSignedUrlFor(key, expiresInSec?): Promise<string>
 *    - fetchObjectUrl(key): Promise<string> (returns a blob URL suitable for <audio src>)
 *
 * Notes
 * - If your bucket is public, prefer buildPublicUrl and set it directly as <audio src>.
 * - For private buckets, use getSignedUrlFor or fetchObjectUrl.
 */
export default function useBackblazeAudio(config) {
  const { region, endpoint, bucket, key, secret, forcePathStyle = false } = config || {}

  const client = useMemo(() => {
    if (!region || !endpoint || !key || !secret) return null
    return new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: {
        accessKeyId: key,
        secretAccessKey: secret,
      },
    })
  }, [region, endpoint, key, secret, forcePathStyle])

  // Build a public URL (for public-read objects)
  const buildPublicUrl = useCallback((objectKey) => {
    if (!bucket || !endpoint || !objectKey) return ''
    const url = new URL(endpoint)
    // Use virtual-hosted style if possible: https://{bucket}.host/objectKey
    // If forcePathStyle is true, fall back to path-style: https://host/{bucket}/{objectKey}
    if (!forcePathStyle) {
      return `${url.protocol}//${bucket}.${url.host}/${objectKey.replace(/^\//, '')}`
    }
    return `${url.protocol}//${url.host}/${bucket}/${objectKey.replace(/^\//, '')}`
  }, [bucket, endpoint, forcePathStyle])

  // Create a presigned URL for private access
  const getSignedUrlFor = useCallback(async (objectKey, expiresInSec = 900) => {
    if (!client || !bucket || !objectKey) return ''
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: objectKey })
    return getSignedUrl(client, cmd, { expiresIn: expiresInSec })
  }, [client, bucket])

  // Fetch object and return a blob URL
  const fetchObjectUrl = useCallback(async (objectKey) => {
    if (!client || !bucket || !objectKey) return ''
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: objectKey })
    const res = await client.send(cmd)
    // In browsers, res.Body is a ReadableStream
    const blob = await new Response(res.Body).blob()
    return URL.createObjectURL(blob)
  }, [client, bucket])

  return {
    client,
    buildPublicUrl,
    getSignedUrlFor,
    fetchObjectUrl,
  }
}
