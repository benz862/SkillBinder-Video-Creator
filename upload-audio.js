export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { filename, contentType, fileData } = req.body;

    // Step 1: Get presigned upload URL from Higgsfield
    const uploadReq = await fetch('https://api.higgsfield.ai/v1/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename, content_type: contentType, method: 'upload_url' })
    });
    const uploadData = await uploadReq.json();
    if (!uploadReq.ok) throw new Error(uploadData.message || 'Failed to get upload URL');

    const { upload_url, media_id } = uploadData;

    // Step 2: Upload the file binary to S3
    const fileBuffer = Buffer.from(fileData, 'base64');
    const s3Res = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: fileBuffer
    });
    if (!s3Res.ok) throw new Error('Failed to upload to storage');

    // Step 3: Confirm upload with Higgsfield
    const confirmRes = await fetch('https://api.higgsfield.ai/v1/media/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ media_id, type: 'audio' })
    });
    const confirmData = await confirmRes.json();

    res.status(200).json({ media_id, confirmed: confirmData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
