import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  Bleed,
  Button,
  ChoiceList,
  Divider,
  EmptyState,
  InlineStack,
  InlineError,
  Layout,
  Page,
  Text,
  TextField,
  Thumbnail,
  BlockStack,
  PageActions,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";

import db from "../db.server";
import { getFrame, validateFrame } from "../models/Frame.server";

export async function loader({ request, params }) {
  // [START authenticate]
  const { admin } = await authenticate.admin(request);
  // [END authenticate]

  // [START data]
  if (params.id === "new") {
    return json({
      destination: "product",
      title: "",
    });
  }

  return json(await getFrame(Number(params.id), admin.graphql));
  // [END data]
}

// [START action]
export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
    shop,
  };

  if (data.action === "delete") {
    await db.frame.delete({ where: { id: Number(params.id) } });
    return redirect("/app");
  }

  const errors = validateFrame(data);

  if (errors) {
    return json({ errors }, { status: 422 });
  }

  const frame =
    params.id === "new"
      ? await db.frame.create({ data })
      : await db.frame.update({ where: { id: Number(params.id) }, data });

  return redirect(`/app/frames/${frame.id}`);
}
// [END action]

// [START state]
export default function FrameForm() {
  const errors = useActionData()?.errors || {};

  const frame = useLoaderData();
  const [formState, setFormState] = useState(frame);
  const [cleanFormState, setCleanFormState] = useState(frame);
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  const nav = useNavigation();
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";
  const isDeleting =
    nav.state === "submitting" && nav.formData?.get("action") === "delete";
  // [END state]

  const navigate = useNavigate();

  // [START select-product]
  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select", // customized action verb, either 'select' or 'add',
    });

    if (products) {
      const { images, id, variants, title, handle } = products[0];

      setFormState({
        ...formState,
        productId: id,
        productVariantId: variants[0].id,
        productTitle: title,
        productHandle: handle,
        productAlt: images[0]?.altText,
        productImage: images[0]?.originalSrc,
      });
    }
  }
  // [END select-product]

  // [START save]
  const submit = useSubmit();
  function handleSave() {
    const data = {
      title: formState.title,
      productId: formState.productId || "",
      productVariantId: formState.productVariantId || "",
      productHandle: formState.productHandle || "",
      destination: formState.destination,
    };

    setCleanFormState({ ...formState });
    submit(data, { method: "post" });
  }
  // [END save]

  // [START polaris]
  return (
    <Page>
      {/* [START breadcrumbs] */}
      <ui-title-bar title={frame.id ? "Edit Frame" : "Create new Frame"}>
        <button variant="breadcrumb" onClick={() => navigate("/app")}>
          Frames
        </button>
      </ui-title-bar>
      {/* [END breadcrumbs] */}
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* [START title] */}
            <Card>
              <BlockStack gap="500">
                <Text as={"h2"} variant="headingLg">
                  Title
                </Text>
                <TextField
                  id="title"
                  helpText="Only store staff can see this title"
                  label="title"
                  labelHidden
                  autoComplete="off"
                  value={formState.title}
                  onChange={(title) => setFormState({ ...formState, title })}
                  error={errors.title}
                />
              </BlockStack>
            </Card>
            {/* [END title] */}
            <Card>
              <BlockStack gap="500">
                {/* [START product] */}
                <InlineStack align="space-between">
                  <Text as={"h2"} variant="headingLg">
                    Product
                  </Text>
                  {formState.productId ? (
                    <Button variant="plain" onClick={selectProduct}>
                      Change product
                    </Button>
                  ) : null}
                </InlineStack>
                {formState.productId ? (
                  <InlineStack blockAlign="center" gap="500">
                    <Thumbnail
                      source={formState.productImage || ImageIcon}
                      alt={formState.productAlt}
                    />
                    <Text as="span" variant="headingMd" fontWeight="semibold">
                      {formState.productTitle}
                    </Text>
                  </InlineStack>
                ) : (
                  <BlockStack gap="200">
                    <Button onClick={selectProduct} id="select-product">
                      Select product
                    </Button>
                    {errors.productId ? (
                      <InlineError
                        message={errors.productId}
                        fieldID="myFieldID"
                      />
                    ) : null}
                  </BlockStack>
                )}
                {/* [END product] */}
                <Bleed marginInlineStart="200" marginInlineEnd="200">
                  <Divider />
                </Bleed>
                {/* [START destination] */}
                <InlineStack gap="500" align="space-between" blockAlign="start">
                  <ChoiceList
                    title="Scan destination"
                    choices={[
                      { label: "Link to product page", value: "product" },
                      {
                        label: "Link to checkout page with product in the cart",
                        value: "cart",
                      },
                    ]}
                    selected={[formState.destination]}
                    onChange={(destination) =>
                      setFormState({
                        ...formState,
                        destination: destination[0],
                      })
                    }
                    error={errors.destination}
                  />
                  {frame.destinationUrl ? (
                    <Button
                      variant="plain"
                      url={frame.destinationUrl}
                      target="_blank"
                    >
                      Go to destination URL
                    </Button>
                  ) : null}
                </InlineStack>
              </BlockStack>
              {/* [END destination] */}
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          {/* [START preview] */}
          <Card>
            <Text as={"h2"} variant="headingLg">
              Frame
            </Text>
            {frame ? (
              <EmptyState image={frame.image} imageContained={true} />
            ) : (
              <EmptyState image="">
                Your Frame will appear here after you save
              </EmptyState>
            )}
            <BlockStack gap="300">
              <Button
                disabled={!frame?.image}
                url={frame?.image}
                download
                variant="primary"
              >
                Download
              </Button>
              <Button
                disabled={!frame.id}
                url={`/frames/${frame.id}`}
                target="_blank"
              >
                Go to public URL
              </Button>
            </BlockStack>
          </Card>
          {/* [END preview] */}
        </Layout.Section>
        {/* [START actions] */}
        <Layout.Section>
          <PageActions
            secondaryActions={[
              {
                content: "Delete",
                loading: isDeleting,
                disabled: !frame.id || !frame || isSaving || isDeleting,
                destructive: true,
                outline: true,
                onAction: () =>
                  submit({ action: "delete" }, { method: "post" }),
              },
            ]}
            primaryAction={{
              content: "Save",
              loading: isSaving,
              disabled: !isDirty || isSaving || isDeleting,
              onAction: handleSave,
            }}
          />
        </Layout.Section>
        {/* [END actions] */}
      </Layout>
    </Page>
  );
  // [END polaris]
}