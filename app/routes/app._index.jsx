import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import AccountConnectionWrapper from '../components/AccountConnectionWrapper';
import db from "../db.server";

export async function getProducts(graphql) {
  const response = await graphql(`
    {
      products(first: 25) {
        nodes {
          id
          title
          description
          handle
          images(first: 1) {
            edges {
              node {
                altText
                originalSrc
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    }`);

  const {
    data: {
      products: { nodes: products },
    },
  } = await response.json();

  return products;
}

// [START action]
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
    shop,
  };
  
  await db.session.update({
    where: { id: session.id },
    data: { clerkDbJwt: data.action === "connect" ? data.clerkDbJwt : null }
  });
  
  return json({});
}
// [END action]

// [START loader]
export async function loader({ request }) {
  const { admin: { graphql }, session: { id, shop } } = await authenticate.admin(request);

  const env = {
    shopifyAppUrl: process.env.SHOPIFY_APP_URL,
    targetOnchainUrl: process.env.TARGET_ONCHAIN_URL,
    clerkUrl: process.env.CLERK_URL,
  };

  const sessionDb = await db.session.findFirst({ where: { id } });

  if (!sessionDb) {
    throw new Error('Session not found');
  }

  let account;
  if (sessionDb.clerkDbJwt) {
    const response = await fetch(`${env.clerkUrl}/v1/client?__clerk_db_jwt=${sessionDb.clerkDbJwt}`);
    if (!response.ok) {
      await db.session.update({ where: { id }, data: { clerkDbJwt: null } });
    } else {
      const result = await response.json();
  
      if (result.response.sessions.length === 0) {
        await db.session.update({ where: { id }, data: { clerkDbJwt: null } });
      } else {
        const accountName = result.response.sessions[0].public_user_data.identifier
          ? result.response.sessions[0].public_user_data.identifier
          : result.response.sessions[0].public_user_data.first_name
            ? result.response.sessions[0].public_user_data.first_name
            : result.response.sessions[0].user.web3_wallets
              ? result.response.sessions[0].user.web3_wallets.web3_wallet
              : '';
        
        const avatarUrl = result.response.sessions[0].public_user_data.has_image
          ? result.response.sessions[0].public_user_data.image_url
          : '';
      
        account = {
          accountName,
          avatarUrl,
        }
      }
    }
  }

  const products = await getProducts(graphql);

  // FIXME: Must be changed to sync. Deletes should be handled too.
  const upsertOperations = products.map((product) => {
    const { images, variants, ...restOfProduct } = product;

    const variantId = variants.edges.length > 0 ? variants.edges[0].node.id : null;
    const image = images.edges.length > 0 ? images.edges[0].node : null;

    const upsertProduct = {
      ...restOfProduct,
      variantId,
      alt: image?.altText ?? '',
      image: image?.originalSrc ?? '',
      shop
    };
    
    return db.product.upsert({
      where: { id: product.id },
      update: upsertProduct,
      create: upsertProduct,
    })
  });

  await db.$transaction(upsertOperations);

  return json({
    products,
    env,
    account,
  });
}
// [END loader]

export default function SetupPage() {
  const { products, env } = useLoaderData();

  return (
    <Page>
      <TitleBar title="Setup" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="300">
            <AccountConnectionWrapper />
            <Card>
              <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Publishing
              </Text>
                <Text as="p" variant="bodyMd">
                  Synced products: {products.length}
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Billing
              </Text>
                <Text as="p" variant="bodyMd">
                  You won't be charged any commission on sales made through Target Onchain.
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Resources
              </Text>
              <List>
                <List.Item>
                  <Link
                    url={`${env.targetOnchainUrl}/about`}
                    target="_blank"
                    removeUnderline
                  >
                    Getting Started
                  </Link>
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
