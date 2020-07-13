import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import dayjs from "dayjs";
import cuid from "cuid";
import aws from "aws-sdk";

import { NowRequest, NowResponse } from "@now/node";
import config from "../../config";
import { mbSendEmail } from "../../utils/email";
import { getPDF } from "../../utils/screenshot";

const Bucket = "locals-orders-store";

function tmpFile(ext: string) {
  return path.join(
    os.tmpdir(),
    `archive.${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`
  );
}

export default async (req: NowRequest, res: NowResponse) => {
  if (req.method !== "POST") {
    res.status(400);
    res.json({ done: false });
    return;
  }

  // TODO: add more defensive checks

  const { client, orderHtml, orderNumber } = req.body;
  const prefix = config.id;

  if (process.env.MAILER === "MG") {
    let attachmentPath: string;

    // move pdf to a feature flag ! in general make attachment sending a feature
    let fallbackToHtml = false;
    try {
      attachmentPath = tmpFile("pdf");
      const pdf = await getPDF(orderHtml);
      fs.writeFileSync(attachmentPath, pdf);
    } catch (e) {
      console.warn(e);
      fallbackToHtml = true;
    }

    if (fallbackToHtml) {
      attachmentPath = tmpFile("html");
      fs.writeFileSync(attachmentPath, orderHtml);
    }

    const sendOrderEmail = async (email: string) =>
      await mbSendEmail(
        email,
        `[${prefix}] Zamówienie nr ${orderNumber}`,
        orderHtml,
        `${client.firstname} ${client.lastname}`,
        client.email,
        attachmentPath
      );

    const response = await sendOrderEmail(config.email);
    if (response) {
      if (client.email) {
        try {
          await sendOrderEmail(client.email);
        } catch (e) {
          /** noop */
        }
      }
      res.json({
        done: true,
        id: response.id,
      });
    } else {
      res.status(400);
      res.json({ done: false });
    }
    return;
  }

  const s3 = new aws.S3({
    accessKeyId: process.env.AMZ_ACCESS_KEY,
    secretAccessKey: process.env.AMZ_SECRET_KEY,
    region: process.env.AMZ_REGION,
  });

  const uid = cuid();
  const documentKey = `u/${prefix}/${dayjs().format("YYYY/MM/DD")}/${uid}.html`;

  try {
    await s3
      .putObject({
        Bucket: Bucket,
        Key: documentKey,
        Body: orderHtml,
        ACL: "public-read",
        ContentType: "text/html",
        Metadata: {
          brand: config.id,
        },
      })
      .promise();
  } catch (err) {
    console.error(err);
  }

  const baseUrl = `https://${Bucket}.s3.amazonaws.com`;

  res.json({
    done: true,
    url: `${baseUrl}/${documentKey}`,
  });
};
