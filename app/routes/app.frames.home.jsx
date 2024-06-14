import { json } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  IndexTable,
  Thumbnail,
  Text,
  Icon,
  InlineStack,
} from "@shopify/polaris";

import { getFrames } from "../models/Frame.server";
import { AlertDiamondIcon, ImageIcon } from "@shopify/polaris-icons";

// [START loader]
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const frames = await getFrames(session.shop, admin.graphql);

  return json({
    frames,
  });
}
// [END loader]

// [START empty]
const EmptyFrameState = ({ onAction }) => (
  <EmptyState
    heading="Create unique Frames for your product"
    action={{
      content: "Create Frame",
      onAction,
    }}
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Allow customers to scan codes and buy products using their phones.</p>
  </EmptyState>
);
// [END empty]

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

// [START table]
const FrameTable = ({ frames }) => (
  <IndexTable
    resourceName={{
      singular: "Frame",
      plural: "Frames",
    }}
    itemCount={frames.length}
    headings={[
      { title: "Thumbnail", hidden: true },
      { title: "Title" },
      { title: "Product" },
      { title: "Date created" },
      { title: "Scans" },
    ]}
    selectable={false}
  >
    {frames.map((frame) => (
      <FrameTableRow key={frame.id} frame={frame} />
    ))}
  </IndexTable>
);
// [END table]

// [START row]
const FrameTableRow = ({ frame }) => (
  <IndexTable.Row id={frame.id} position={frame.id}>
    <IndexTable.Cell>
      <Thumbnail
        source={frame.productImage || ImageIcon}
        alt={frame.productTitle}
        size="small"
      />
    </IndexTable.Cell>
    <IndexTable.Cell>
      <Link to={`/app/frames/${frame.id}`}>{truncate(frame.title)}</Link>
    </IndexTable.Cell>
    <IndexTable.Cell>
      {/* [START deleted] */}
      {frame.productDeleted ? (
        <InlineStack align="start" gap="200">
          <span style={{ width: "20px" }}>
            <Icon source={AlertDiamondIcon} tone="critical" />
          </span>
          <Text tone="critical" as="span">
            product has been deleted
          </Text>
        </InlineStack>
      ) : (
        truncate(frame.productTitle)
      )}
      {/* [END deleted] */}
    </IndexTable.Cell>
    <IndexTable.Cell>
      {new Date(frame.createdAt).toDateString()}
    </IndexTable.Cell>
    <IndexTable.Cell>{frame.scans}</IndexTable.Cell>
  </IndexTable.Row>
);
// [END row]

export default function Index() {
  const { frames } = useLoaderData();
  const navigate = useNavigate();

  // [START page]
  return (
    <Page>
      <ui-title-bar title="Frames">
        <button variant="primary" onClick={() => navigate("/app/frames/new")}>
          Create Frame
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {frames.length === 0 ? (
              <EmptyFrameState onAction={() => navigate("/app/frames/new")} />
            ) : (
              <FrameTable frames={frames} />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
  // [END page]
}