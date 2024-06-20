import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Box,
  Card,
  InlineStack,
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
  const { admin, session } = await authenticate.admin(request);

  const env = {
    shopifyAppUrl: process.env.SHOPIFY_APP_URL,
    targetOnchainUrl: process.env.TARGET_ONCHAIN_URL,
    clerkUrl: process.env.CLERK_URL,
  };

  const sessionDb = await db.session.findFirst({ where: { id: session.id } });

  if (!sessionDb) {
    throw new Error('Session not found');
  }

  let account;
  if (sessionDb.clerkDbJwt) {
    const response = await fetch(`${env.clerkUrl}/v1/client?__clerk_db_jwt=${sessionDb.clerkDbJwt}`);
    if (!response.ok) {
      await db.session.update({ where: { id: session.id }, data: { clerkDbJwt: null } });
    } else {
      const result = await response.json();
  
      if (result.response.sessions.length === 0) {
        await db.session.update({ where: { id: session.id }, data: { clerkDbJwt: null } });
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

  const products = await getProducts(admin.graphql);

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
      shop: session.shop
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
    <Page fullWidth>
      <TitleBar title="Target Onchain" />
      <Layout>
        <Layout.AnnotatedSection
          id="targetOnchainAccount"
          title="Target Onchain account"
          description="Connect your Target Onchain account so you can manage and sync with Target Onchain."
        >
          <AccountConnectionWrapper />
        </Layout.AnnotatedSection>
        <Layout.AnnotatedSection
          id="publishing"
          title="Publishing"
          description="Products that are being synced to your catalog, or have errors preventing their sync, are shown here."
        >
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Product Status
              </Text>
              <InlineStack blockAlign="center" gap="100">
                <Text as="span" fontWeight="semibold">
                  {products.length}
                </Text>
                <Text as="span">
                  products are available to Target Onchain
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>
        <Layout.AnnotatedSection
          id="billing"
          title="Billing"
          description="Your Target Onchain commission and billing information."
        >
          <Card>
            <BlockStack gap="300">
              <InlineStack blockAlign="center" gap="100">
                <Text as="span">
                  Commission:
                </Text>
                <Text as="span" fontWeight="semibold">
                  0%
                </Text>
              </InlineStack>
              <Text as="p" variant="bodyMd">
                You won't be charged any commission on sales or fees for using Target Onchain.
              </Text>
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </Page>
  );
}
