import * as R from "remeda";
import { NowRequest, NowResponse } from "@now/node";
import { google } from "googleapis";
import Money from "../../utils/cents";
import config from "../../config";

// TODO: catch error
export default async (req: NowRequest, res: NowResponse) => {
  const sheets = google.sheets("v4");
  const result = await sheets.spreadsheets.values.get({
    auth: process.env.GOOGLE_API_KEY,
    spreadsheetId: config.spreadsheet.id,
    range: config.spreadsheet.range,
  });

  const rows = result.data.values as string[][];

  const groupedProducts = R.pipe(
    rows,
    R.reduce((acc, row) => {
      const isGroupHeader = row.length === 1;
      const isProduct = row[1] && row[1].trim().match(/^\d+([,.]\d+)?$/);

      if (isGroupHeader) {
        acc.push({ name: row[0], products: [] });
      }

      if (isProduct) {
        const group = R.last(acc);
        if (group) {
          const name = row[0].trim();
          const price = Money.fromAmount(row[1].trim().replace(",", ".")).cents;
          group.products.push({ name, price });
        }
      }

      return acc;
    }, [] as GroupedProducts),
    R.filter((group) => group.products.length > 0)
  );

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
  res.json(groupedProducts);
};
