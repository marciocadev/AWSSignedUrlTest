import { Mock, expect, test, vi } from "vitest";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mockClient } from "aws-sdk-client-mock";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { SdkStream } from "@aws-sdk/types";
import { BucketClient } from "./bucket";
import { sdkStreamMixin } from "@smithy/util-stream";

const s3Mock = mockClient(S3Client);

function createMockStream(text: string): SdkStream<Readable> {
  const stream = new Readable();
  stream._read = () => { };
  stream.push(text);
  stream.push(null); // indicate end of file
  const sdkStream = sdkStreamMixin(stream);
  return sdkStream;
}

test("Given a bucket, when giving one of its keys, we should get its signed url", async () => {
  // GIVEN

  const BUCKET_NAME = "BUCKET_NAME";
  const KEY = "sampletext.Pdf";
  const VALUE = "VALUE";

  s3Mock.on(GetObjectCommand, { Bucket: BUCKET_NAME, Key: KEY }).resolves({
    Body: createMockStream(VALUE),
  });
  s3Mock.on(HeadObjectCommand, { Bucket: BUCKET_NAME, Key: KEY }).resolves({
    AcceptRanges: "bytes",
    ContentType: "application/pdf",
    ETag: "6805f2cfc46c0f04559748bb039d69ae",
    LastModified: new Date("Thu, 15 Dec 2016 01:19:41 GMT"),
    Metadata: {},
    VersionId: "null",
  });

  vi.mock("@aws-sdk/s3-request-presigner");
  const getSignedUrlMock: Mock = getSignedUrl as any;
  getSignedUrlMock.mockResolvedValue(VALUE);

  // WHEN
  const client = new BucketClient(BUCKET_NAME);
  const signedUrl = await client.signedUrl(KEY);
  // THEN
  expect(signedUrl).toBe(VALUE);
});
