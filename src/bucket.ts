import {
  __Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export enum BucketSignedUrlAction {
  DOWNLOAD = "DOWNLOAD",
  UPLOAD = "UPLOAD",
}
export interface BucketSignedUrlOptions {
  readonly duration?: number;
  readonly action?: BucketSignedUrlAction;
}

export class BucketClient {
  constructor(
    private readonly bucketName: string,
    private readonly s3Client: S3Client = new S3Client({})
  ) { }

  public async signedUrl(
    key: string,
    opts?: BucketSignedUrlOptions
  ): Promise<string> {
    let s3Command: GetObjectCommand | PutObjectCommand;

    // Set default action to DOWNLOAD if not provided
    const action = opts?.action ?? BucketSignedUrlAction.DOWNLOAD;

    // Set the S3 command
    switch (action) {
      case BucketSignedUrlAction.DOWNLOAD:
        if (!(await this.exists(key))) {
          throw new Error(
            `Cannot provide signed url for a non-existent key (key=${key})`
          );
        }
        s3Command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        break;
      case BucketSignedUrlAction.UPLOAD:
        s3Command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        break;
      default:
        throw new Error(`Invalid action: ${opts?.action}`);
    }

    // Generate the presigned URL
    const signedUrl = await getSignedUrl(this.s3Client, s3Command, {
      expiresIn: 900,
    });

    return signedUrl;
  }

  public async exists(key: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      throw error;
    }
  }
}