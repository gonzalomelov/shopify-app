import invariant from "tiny-invariant";
import db from "../db.server";
/**
 * @typedef {import('../services/textToDataUrl').TextToDataURLOptions} TextToDataURLOptions
 */
import { textToDataURL } from '../services/textToDataUrl';

// [START get-frame]
export async function getFrame(id, graphql) {
  const frame = await db.frame.findFirst({ where: { id } });

  if (!frame) {
    return null;
  }

  return supplementFrame(frame, graphql);
}

export async function getFrames(shop, graphql) {
  const frames = await db.frame.findMany({
    where: { shop },
    orderBy: { id: "desc" },
  });

  if (frames.length === 0) return [];

  return Promise.all(
    frames.map((frame) => supplementFrame(frame, graphql))
  );
}
// [END get-frame]

// [START get-frame-image]
export function getFrameImage(id) {
  const url = new URL(`/frames/${id}/scan`, process.env.SHOPIFY_APP_URL);

  /** @type {TextToDataURLOptions} */
  const opts = {
    width: 300,
    height: 300,
    backgroundColor: '#FFBF60FF',
    textColor: '#010599FF',
    fontSize: 40,
  };

  return textToDataURL(url.href, opts);
}
// [END get-frame-image]

// [START get-destination]
export function getDestinationUrl(frame) {
  if (frame.destination === "product") {
    return `https://${frame.shop}/products/${frame.productHandle}`;
  }

  const match = /gid:\/\/shopify\/ProductVariant\/([0-9]+)/.exec(frame.productVariantId);
  invariant(match, "Unrecognized product variant ID");

  return `https://${frame.shop}/cart/${match[1]}:1`;
}
// [END get-destination]

// [START hydrate-frame]
async function supplementFrame(frame, graphql) {
  const frameImagePromise = getFrameImage(frame.id);

  const response = await graphql(
    `
      query supplementFrame($id: ID!) {
        product(id: $id) {
          title
          images(first: 1) {
            nodes {
              altText
              url
            }
          }
        }
      }
    `,
    {
      variables: {
        id: frame.productId,
      },
    }
  );

  const {
    data: { product },
  } = await response.json();

  return {
    ...frame,
    productDeleted: !product?.title,
    productTitle: product?.title,
    productImage: product?.images?.nodes[0]?.url,
    productAlt: product?.images?.nodes[0]?.altText,
    destinationUrl: getDestinationUrl(frame),
    image: await frameImagePromise,
  };
}
// [END hydrate-frame]

// [START validate-frame]
export function validateFrame(data) {
  const errors = {};

  if (!data.title) {
    errors.title = "Title is required";
  }

  if (!data.productId) {
    errors.productId = "Product is required";
  }

  if (!data.destination) {
    errors.destination = "Destination is required";
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}
// [END validate-frame]
