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

// [START loader]
export async function loader({ request }) {
  const { admin: { graphql }, session: { shop } } = await authenticate.admin(request);
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
  });
}
// [END loader]

export default function SetupPage() {
  const { products } = useLoaderData();

  return (
    <Page>
      <TitleBar title="Setup page" />
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
                <Text as="p" variant="bodyMd">
                  The app template comes with a setup page which
                  demonstrates how to create multiple pages within app navigation
                  using{" "}
                  <Link
                    url="https://shopify.dev/docs/apps/tools/app-bridge"
                    target="_blank"
                    removeUnderline
                  >
                    App Bridge
                  </Link>
                  .
                </Text>
                <Text as="p" variant="bodyMd">
                  To create your own page and have it show up in the app
                  navigation, add a page inside <Code>app/routes</Code>, and a
                  link to it in the <Code>&lt;NavMenu&gt;</Code> component found
                  in <Code>app/routes/app.jsx</Code>.
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
                    url="https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav"
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

/**
 * @param {{ children: React.ReactNode }} props
 */
function Code({ children }) {
  return (
    <Box
      as="span"
      padding="025"
      paddingInlineStart="100"
      paddingInlineEnd="100"
      background="bg-surface-active"
      borderWidth="025"
      borderColor="border"
      borderRadius="100"
    >
      <code>{children}</code>
    </Box>
  );
}
