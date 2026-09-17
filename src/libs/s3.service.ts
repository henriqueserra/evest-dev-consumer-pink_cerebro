import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  DeleteObjectCommandOutput,
  GetObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  ListObjectsCommand,
  ListObjectsCommandInput,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  ObjectCannedACL,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { EverestErrorServices } from './everest.error.services';
import dotenv from 'dotenv';
import path from 'path';
import { EverestLogService } from './everest.log.services';
dotenv.config();

const routeName = 'S3Service';
const logService = new EverestLogService();

export interface ExtendedHeadObjectCommandOutput extends HeadObjectCommandOutput {
  fileName: string;
  fileSizeMB: number;
  mimeType: string;
  metadata: { [key: string]: string };
}

const region = process.env.AWSREGION;
const accessKeyId = process.env.AWSACESSKEYID;
const secretAccessKey = process.env.AWSSECRETACCESSKEY;

if (!region || !accessKeyId || !secretAccessKey) {
  throw new Error('AWS configuration environment variables are not set properly.');
}

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const s3ClientSa = new S3Client({
  region: 'sa-east-1',
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Add type definitions
interface S3OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class S3Service {
  // Add retry logic for S3 operations
  private static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    const methodName = `${routeName}.withRetry`;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
        }
      }
    }

    throw lastError;
  }

  // Improved put object with validation
  public static async s3PutObject({
    s3Bucket,
    s3Key,
    buffer,
    metadata,
  }: {
    s3Key: string;
    s3Bucket: string;
    buffer: Buffer;
    metadata?: Record<string, string>;
  }): Promise<{ success: boolean; data: PutObjectCommandOutput; payload: { s3Bucket: string; s3Key: string } }> {
    const methodName = `${routeName}.s3PutObject`;
    try {
      const putS3ObjectParams: PutObjectCommandInput = {
        Bucket: s3Bucket,
        Key: s3Key,
        Body: buffer,
        Metadata: metadata,
      };

      const result = await this.withRetry(() => s3Client.send(new PutObjectCommand(putS3ObjectParams)));

      return {
        success: true,
        data: result,
        payload: { s3Bucket, s3Key },
      };
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3PutObjectAcl({
    s3Bucket,
    s3Key,
    buffer,
  }: {
    s3Key: string;
    s3Bucket: string;
    buffer: Buffer;
  }): Promise<any> {
    const methodName = `${routeName}.s3PutObjectAcl`;
    try {
      const putS3ObjectParams: PutObjectCommandInput = {
        Bucket: s3Bucket,
        Key: s3Key,
        Body: buffer,
        ACL: 'public-read',
      };
      const result = await s3Client.send(new PutObjectCommand(putS3ObjectParams));

      return { payload: { s3Bucket, s3Key, s3Region: 'us-east-1' }, result };
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async extractDataFromS3Response(body: any): Promise<Buffer> {
    const methodName = `${routeName}.extractDataFromS3Response`;
    const stream = body as Readable;

    const data: Buffer = await new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.once('end', () => resolve(Buffer.concat(chunks)));
      stream.once('error', reject);
    });

    return data;
  }

  public static async s3DeleteObject({
    s3Bucket,
    s3Key,
  }: {
    s3Key: string;
    s3Bucket: string;
  }): Promise<DeleteObjectCommandOutput> {
    const methodName = `${routeName}.s3DeleteObject`;
    try {
      const s3GetObjectParams: DeleteObjectCommandInput = {
        Bucket: s3Bucket,
        Key: s3Key,
      };
      const result: DeleteObjectCommandOutput = await s3Client.send(new DeleteObjectCommand(s3GetObjectParams));
      logService.log({ message: `Arquivo ${s3Key} deletado com sucesso!`, method: methodName });
      return result;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3GetMimeType({ fileName }: { fileName: string }) {
    const methodName = `${routeName}.s3GetMimeType`;
    try {
      const extension = fileName.split('.').pop() || '';
      const mimeTypes: { [key: string]: string } = {
        txt: 'text/plain',
        html: 'text/html',
        css: 'text/css',
        csv: 'text/csv',
        json: 'application/json',
        js: 'application/javascript',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        pdf: 'application/pdf',
        // Add more file extensions and their corresponding MIME types as needed
      };

      // Convert the extension to lowercase (file extensions are often case-insensitive)
      const lowerCaseExtension = extension.toLowerCase();

      // Lookup the MIME type for the given extension
      const mimeType = mimeTypes[lowerCaseExtension];

      return mimeType || 'application/octet-stream';
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  // Improved get object with streaming
  public static async s3GetObject({ s3Bucket, s3Key }: { s3Key: string; s3Bucket: string }): Promise<Buffer> {
    const methodName = `${routeName}.s3GetObject`;
    try {
      const getS3ObjectParams: GetObjectCommandInput = {
        Bucket: s3Bucket,
        Key: s3Key,
      };

      const result = await this.withRetry(() => s3Client.send(new GetObjectCommand(getS3ObjectParams)));

      return await this.extractDataFromS3Response(result.Body);
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3GetObjectSa({ s3Bucket, s3Key }: { s3Key: string; s3Bucket: string }): Promise<Buffer> {
    const methodName = `${routeName}.s3GetObjectSa`;
    try {
      const s3GetObjectParams: GetObjectCommandInput = {
        Bucket: s3Bucket,
        Key: s3Key,
      };
      const result: GetObjectCommandOutput = await s3ClientSa.send(new GetObjectCommand(s3GetObjectParams));

      const data = await this.extractDataFromS3Response(result.Body);

      return data;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3GetObjectAttributes({ s3Key, s3Bucket }: { s3Key: string; s3Bucket: string }): Promise<
    {
      fileName: string;
      fileSizeMB: number;
      mimeType: string;
      metadata: { [key: string]: string };
    } & HeadObjectCommandOutput
  > {
    const methodName = `${routeName}.s3GetObjectAttributes`;
    try {
      const params = {
        Bucket: s3Bucket,
        Key: s3Key,
      };
      let result: HeadObjectCommandOutput = await s3Client.send(new HeadObjectCommand(params));

      const fileName = result?.Metadata?.filename_original || s3Key.split('/').pop() || 'Verificar';
      let fileSizeMB = result?.ContentLength ? Math.ceil((result?.ContentLength / 1024 / 1024) * 10) / 10 : 0;

      if (fileSizeMB === 0) fileSizeMB = 0.01;

      return {
        ...result,
        fileName,
        fileSizeMB,
        mimeType: result?.ContentType || 'application/octet-stream',
        metadata: result?.Metadata || { filename_original: fileName },
      };
    } catch (error: any) {
      if (error.name === 'NotFound') throw new Error(`${s3Key} - not found`);
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3GetObjectAttributesSa({ s3Key, s3Bucket }: { s3Key: string; s3Bucket: string }): Promise<
    {
      fileName: string;
      fileSizeMB: number;
      mimeType: string;
      metadata: { [key: string]: string };
    } & HeadObjectCommandOutput
  > {
    const methodName = `${routeName}.s3GetObjectAttributes`;
    try {
      const params = {
        Bucket: s3Bucket,
        Key: s3Key,
      };
      let result: HeadObjectCommandOutput = await s3ClientSa.send(new HeadObjectCommand(params));

      const fileName = result?.Metadata?.filename_original || s3Key.split('/').pop() || 'Verificar';
      let fileSizeMB = result?.ContentLength ? Math.ceil((result?.ContentLength / 1024 / 1024) * 10) / 10 : 0;

      if (fileSizeMB === 0) fileSizeMB = 0.01;

      return {
        ...result,
        fileName,
        fileSizeMB,
        mimeType: result?.ContentType || 'application/octet-stream',
        metadata: result?.Metadata || { filename_original: fileName },
      };
    } catch (error: any) {
      if (error.name === 'NotFound') throw new Error(`${s3Key} - not found`);
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3GetObjectSize({ s3Key, s3Bucket }: { s3Key: string; s3Bucket: string }) {
    const methodName = `${routeName}.s3GetObjectSize`;
    try {
      const params = {
        Bucket: s3Bucket,
        Key: s3Key,
      };
      let { ContentLength } = await s3Client.send(new HeadObjectCommand(params));

      if (!ContentLength) ContentLength = 0;

      const tamanho = Math.ceil((ContentLength / 1024 / 1024) * 10) / 10;
      return tamanho;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3ListFilesInBucket({ s3Bucket }: { s3Bucket: string }) {
    const methodName = `${routeName}.s3ListFilesInBucket`;
    try {
      let nextToken: any = null;
      let items: any = [];
      const today = new Date();
      today.setDate(today.getDate() - 180);
      do {
        const params: ListObjectsV2CommandInput = {
          Bucket: s3Bucket,
          ContinuationToken: nextToken,
        };
        const { Contents, NextContinuationToken } = await s3Client.send(new ListObjectsV2Command(params));

        if (Contents) {
          Contents.map((content) => {
            if (content.LastModified && content.LastModified < today) {
              items.push({
                Key: content.Key,
                LastModified: content.LastModified,
                Size: content.Size,
              });
            }
          });
          logService.log({ message: items.length, method: methodName });
        }

        nextToken = NextContinuationToken;
      } while (nextToken);
      return items;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3ListFilesInBucketAndKey({
    s3Bucket,
    s3PartialKey,
  }: {
    s3Bucket: string;
    s3PartialKey: string;
  }) {
    const methodName = `${routeName}.s3ListFilesInBucketAndKey`;
    try {
      const params: ListObjectsCommandInput = {
        Bucket: s3Bucket,
        Prefix: s3PartialKey,
      };
      const dados = await s3Client.send(new ListObjectsCommand(params));
      if (!dados.Contents || dados.Contents.length === 0) return [];
      return dados.Contents.map((item) => item.Key);
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3ObjectCopyAcl({
    s3BucketDestino,
    s3KeyDestino,
    s3BucketOrigem,
    s3KeyOrgiem,
    publicAcl,
  }: {
    s3KeyOrgiem: string;
    s3KeyDestino: string;
    s3BucketOrigem: string;
    s3BucketDestino: string;
    publicAcl: boolean;
  }): Promise<any> {
    const methodName = `${routeName}.s3ObjectCopyAcl`;
    try {
      const getS3ObjectParams: GetObjectCommandInput = {
        Bucket: s3BucketOrigem,
        Key: s3KeyOrgiem,
      };
      const resultCopy = await s3Client.send(new GetObjectCommand(getS3ObjectParams));
      if (!resultCopy.Body) throw new Error('Body not found');
      const buffer = await this.extractDataFromS3Response(resultCopy.Body);

      const putS3ObjectParams: PutObjectCommandInput = {
        Bucket: s3BucketDestino,
        Key: s3KeyDestino,
        Body: buffer,
        ContentType: resultCopy.ContentType,
        ACL: publicAcl ? ('public-read' as ObjectCannedACL) : undefined,
      };
      const result = await s3Client.send(new PutObjectCommand(putS3ObjectParams));

      return result;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3ObjectCopySaAcl({
    s3BucketDestino,
    s3KeyDestino,
    s3BucketOrigem,
    s3KeyOrgiem,
    publicAcl,
  }: {
    s3KeyOrgiem: string;
    s3KeyDestino: string;
    s3BucketOrigem: string;
    s3BucketDestino: string;
    publicAcl: boolean;
  }): Promise<any> {
    const methodName = `${routeName}.s3ObjectCopySaAcl`;
    try {
      const getS3ObjectParams: GetObjectCommandInput = {
        Bucket: s3BucketOrigem,
        Key: s3KeyOrgiem,
      };
      const resultCopy = await s3ClientSa.send(new GetObjectCommand(getS3ObjectParams));
      if (!resultCopy.Body) throw new Error('Body not found');
      const buffer = await this.extractDataFromS3Response(resultCopy.Body);

      const putS3ObjectParams: PutObjectCommandInput = {
        Bucket: s3BucketDestino,
        Key: s3KeyDestino,
        Body: buffer,
        ContentType: resultCopy.ContentType,
        ACL: publicAcl ? ('public-read' as ObjectCannedACL) : undefined,
      };
      const result = await s3Client.send(new PutObjectCommand(putS3ObjectParams));

      return result;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3ObjectCopy({
    s3BucketDestino,
    s3KeyDestino,
    s3BucketOrigem,
    s3KeyOrgiem,
  }: {
    s3KeyOrgiem: string;
    s3KeyDestino: string;
    s3BucketOrigem: string;
    s3BucketDestino: string;
  }): Promise<any> {
    const methodName = `${routeName}.s3ObjectCopy`;
    try {
      const object = await this.s3GetObjectSa({ s3Bucket: s3BucketOrigem, s3Key: s3KeyOrgiem });

      const result = await this.s3PutObject({ s3Bucket: s3BucketDestino, s3Key: s3KeyDestino, buffer: object });

      logService.log({
        message: `Arquivo ${s3KeyOrgiem} copiado com sucesso do ${s3BucketOrigem} para ${s3BucketDestino}`,
        method: methodName,
      });

      return result;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`s3ObjectCopy ${errorMessage}`);
    }
  }

  public static async s3ObjectCopyUs({
    s3BucketDestino,
    s3KeyDestino,
    s3BucketOrigem,
    s3KeyOrgiem,
  }: {
    s3KeyOrgiem: string;
    s3KeyDestino: string;
    s3BucketOrigem: string;
    s3BucketDestino: string;
  }): Promise<any> {
    const methodName = `${routeName}.s3ObjectCopyUs`;
    try {
      const object = await this.s3GetObject({ s3Bucket: s3BucketOrigem, s3Key: s3KeyOrgiem });

      const result = await this.s3PutObject({ s3Bucket: s3BucketDestino, s3Key: s3KeyDestino, buffer: object });

      logService.log({
        message: `Arquivo ${s3KeyOrgiem} copiado com sucesso do ${s3BucketOrigem} para ${s3BucketDestino}`,
        method: methodName,
      });

      return result;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`s3ObjectCopy ${errorMessage}`);
    }
  }

  public static async s3GetFileSizeMB({ s3Bucket, s3Key }: { s3Key: string; s3Bucket: string }) {
    const methodName = `${routeName}.s3GetFileSizeMB`;
    try {
      const params = {
        Bucket: s3Bucket,
        Key: s3Key,
      };
      const { ContentLength } = await s3Client.send(new HeadObjectCommand(params));

      if (!ContentLength) return 0;

      const fileSizeMB = Math.ceil((ContentLength / 1024 / 1024) * 10) / 10;
      return fileSizeMB;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3GetPreSignedUrl({
    s3Bucket,
    s3Key,
    expirationMinutes,
  }: {
    s3Key: string;
    s3Bucket: string;
    expirationMinutes: number;
  }) {
    const methodName = `${routeName}.s3GetPreSignedUrl`;
    try {
      const params: GetObjectCommandInput = {
        Bucket: s3Bucket,
        Key: s3Key,
        ResponseContentDisposition: 'inline',
      };

      const command = new GetObjectCommand(params);
      const expiracao = expirationMinutes * 60;
      const url = await getSignedUrl(s3Client, command, {
        expiresIn: expiracao,
        signingDate: new Date(),
        signingRegion: 'us-east-1',
      });
      return url;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  // Add method to check if object exists
  public static async objectExists({ s3Bucket, s3Key }: { s3Bucket: string; s3Key: string }): Promise<boolean> {
    const methodName = `${routeName}.objectExists`;
    try {
      await this.s3GetObjectAttributes({ s3Bucket: s3Bucket, s3Key: s3Key });
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  // Add method to get signed URL with custom options
  public static async getSignedUrl({
    s3Bucket,
    s3Key,
    expiresIn = 3600,
    responseType = 'inline',
  }: {
    s3Bucket: string;
    s3Key: string;
    expiresIn?: number;
    responseType?: 'inline' | 'attachment';
  }): Promise<string> {
    const methodName = `${routeName}.getSignedUrl`;
    try {
      const command = new GetObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        ResponseContentDisposition: `${responseType}; filename="${path.basename(s3Key)}"`,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async getSignedUrlSa({
    s3Bucket,
    s3Key,
    expiresIn = 3600,
    responseType = 'inline',
  }: {
    s3Bucket: string;
    s3Key: string;
    expiresIn?: number;
    responseType?: 'inline' | 'attachment';
  }): Promise<string> {
    const methodName = `${routeName}.getSignedUrlSa`;
    try {
      const command = new GetObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        ResponseContentDisposition: `${responseType}; filename="${path.basename(s3Key)}"`,
      });

      return await getSignedUrl(s3ClientSa, command, { expiresIn });
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      throw new Error(`${methodName} :: ${errorMessage}`);
    }
  }

  public static async s3ObjectExistsSa({ s3Key, s3Bucket }: { s3Key: string; s3Bucket: string }): Promise<boolean> {
    const methodName = `${routeName}.s3ObjectExistsSa`;
    try {
      await this.s3GetObjectAttributesSa({ s3Bucket: s3Bucket, s3Key: s3Key });
      return true;
    } catch (error: any) {
      return false;
    }
  }

  public static async s3ObjectExists({ s3Key, s3Bucket }: { s3Key: string; s3Bucket: string }): Promise<boolean> {
    const methodName = `${routeName}.s3ObjectExists`;
    try {
      await this.s3GetObjectAttributes({ s3Bucket: s3Bucket, s3Key: s3Key });
      return true;
    } catch (error: any) {
      return false;
    }
  }
}
