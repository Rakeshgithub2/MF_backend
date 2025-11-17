# AWS S3 Usage Analysis for Mutual Fund Website

## Current Status: **AWS S3 NOT REQUIRED**

Your mutual fund website currently has NO file upload features that require cloud storage.

## Potential Future Uses of AWS S3

### 1. **User Profile Pictures**

```typescript
// Backend: Profile picture upload endpoint
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface ProfilePictureUpload {
  userId: string;
  file: Buffer;
  filename: string;
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    const file = req.file; // multer middleware
    const userId = req.user!.id;

    const key = `profile-pictures/${userId}/${Date.now()}-${file.originalname}`;

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Or private with signed URLs
    };

    const result = await s3Client.send(new PutObjectCommand(uploadParams));

    // Update user profile with image URL
    await prisma.user.update({
      where: { id: userId },
      data: {
        profilePicture: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`,
      },
    });

    res.json({
      message: 'Profile picture uploaded',
      url: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
};
```

### 2. **KYC Document Storage**

```typescript
// KYC document upload for investment compliance
export const uploadKYCDocument = async (req: Request, res: Response) => {
  try {
    const { documentType } = req.body; // 'pan', 'aadhar', 'bank_statement'
    const file = req.file;
    const userId = req.user!.id;

    const key = `kyc-documents/${userId}/${documentType}/${Date.now()}-${file.originalname}`;

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256', // Encrypt sensitive documents
      ACL: 'private', // Private access only
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Store document metadata in database
    await prisma.kycDocument.create({
      data: {
        userId,
        documentType,
        filename: file.originalname,
        s3Key: key,
        status: 'UPLOADED',
        uploadedAt: new Date(),
      },
    });

    res.json({ message: 'KYC document uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'KYC upload failed' });
  }
};
```

### 3. **Investment Reports & Statements**

```typescript
// Generate and store monthly portfolio statements
export const generatePortfolioStatement = async (
  userId: string,
  month: string
) => {
  try {
    // Generate PDF report
    const pdfBuffer = await generatePDFReport(userId, month);

    const key = `statements/${userId}/${month}/portfolio-statement.pdf`;

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ACL: 'private',
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Store statement record
    await prisma.portfolioStatement.create({
      data: {
        userId,
        month,
        s3Key: key,
        generatedAt: new Date(),
      },
    });

    return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
  } catch (error) {
    throw new Error('Statement generation failed');
  }
};
```

### 4. **Fund Fact Sheets & Prospectus**

```typescript
// Store fund documents (fact sheets, prospectus)
export const uploadFundDocument = async (req: Request, res: Response) => {
  try {
    const { fundId, documentType } = req.body;
    const file = req.file;

    const key = `fund-documents/${fundId}/${documentType}/${file.originalname}`;

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Public access for fund documents
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Update fund with document URL
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        documents: {
          [documentType]: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`,
        },
      },
    });

    res.json({ message: 'Fund document uploaded' });
  } catch (error) {
    res.status(500).json({ error: 'Document upload failed' });
  }
};
```

## Required Database Schema Updates

```sql
-- Add to existing User model
ALTER TABLE users ADD COLUMN profile_picture VARCHAR(500);

-- New KYC Documents table
CREATE TABLE kyc_documents (
  id VARCHAR(24) PRIMARY KEY,
  user_id VARCHAR(24) REFERENCES users(id),
  document_type VARCHAR(50), -- 'pan', 'aadhar', 'bank_statement'
  filename VARCHAR(200),
  s3_key VARCHAR(500),
  status VARCHAR(20), -- 'UPLOADED', 'VERIFIED', 'REJECTED'
  uploaded_at TIMESTAMP,
  verified_at TIMESTAMP
);

-- Portfolio Statements table
CREATE TABLE portfolio_statements (
  id VARCHAR(24) PRIMARY KEY,
  user_id VARCHAR(24) REFERENCES users(id),
  month VARCHAR(7), -- 'YYYY-MM'
  s3_key VARCHAR(500),
  generated_at TIMESTAMP
);
```

## Environment Variables Needed

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1

# Optional: CloudFront CDN
AWS_CLOUDFRONT_DOMAIN=your_cloudfront_domain
```

## NPM Dependencies Required

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.450.0",
    "@aws-sdk/s3-request-presigner": "^3.450.0",
    "multer": "^1.4.5",
    "sharp": "^0.32.6" // For image processing
  },
  "devDependencies": {
    "@types/multer": "^1.4.11"
  }
}
```

## Cost Analysis

### **Current Needs: $0/month**

- No file uploads = No S3 needed

### **If You Add File Features:**

- **MongoDB GridFS**: Free (already have MongoDB)
- **Cloudinary**: Free tier (25GB storage, 25GB bandwidth)
- **AWS S3**: ~$0.023/GB/month + transfer costs

## Alternative Solutions (Cheaper/Free)

### 1. **MongoDB GridFS** (Recommended)

```typescript
import { GridFSBucket } from 'mongodb';

const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

export const uploadToGridFS = (file: Buffer, filename: string) => {
  const uploadStream = bucket.openUploadStream(filename);
  uploadStream.end(file);
  return uploadStream.id;
};
```

### 2. **Cloudinary** (For Images)

```typescript
import { v2 as cloudinary } from 'cloudinary';

export const uploadToCloudinary = async (file: Buffer) => {
  const result = await cloudinary.uploader.upload(
    `data:image/jpeg;base64,${file.toString('base64')}`
  );
  return result.secure_url;
};
```

## Conclusion

**Current Answer: NO, AWS S3 is NOT required for your mutual fund website.**

**Future Recommendation:**

1. **Start with MongoDB GridFS** for any file uploads
2. **Add Cloudinary** for profile pictures (free tier)
3. **Consider AWS S3** only when you reach enterprise scale

Your current implementation works perfectly without any cloud file storage.
