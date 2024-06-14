import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import db from "../db.server";

import { getDestinationUrl } from "../models/Frame.server";

export const loader = async ({ params }) => {
  // [START validate]
  invariant(params.id, "Could not find Frame destination");

  const id = Number(params.id);
  const frame = await db.frame.findFirst({ where: { id } });

  invariant(frame, "Could not find Frame destination");
  // [END validate]

  // [START increment]
  await db.frame.update({
    where: { id },
    data: { scans: { increment: 1 } },
  });
  // [END increment]

  // [START redirect]
  return redirect(getDestinationUrl(frame));
  // [END redirect]
};
