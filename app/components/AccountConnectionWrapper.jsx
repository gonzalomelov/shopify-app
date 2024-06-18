import { Link, AccountConnection } from '@shopify/polaris';
import { useState, useCallback } from 'react';
import { useLoaderData } from "@remix-run/react";

function AccountConnectionWrapper() {
  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const { env } = useLoaderData();

  const handleAction = useCallback(() => {
    if (connected) {
      setAccountName('');
      setAvatarUrl('');
      setConnected(false);
      return;
    }

    const width = 600;
    const height = 400;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);

    const popWin = window.open(
      `${env.targetOnchainUrl}/sign-in`,
      'merchantWindow',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    if (popWin) {
      const receiveMessage = async (event) => {
        if (event.origin === env.shopifyAppUrl) {
          if (event.data.source === 'target-onchain' && event.data.token) {
            try {
              const response = await fetch(`${env.clerkUrl}/v1/client?__clerk_db_jwt=${event.data.token}`);
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              const result = await response.json();

              // const id = result.response.sessions[0].user.id;
              const email = result.response.sessions[0].user.email_addresses[0].email_address;
              const imageUrl = result.response.sessions[0].user.image_url;

              setAccountName(email);
              setAvatarUrl(imageUrl);

              setConnected((connected) => !connected);

              popWin.close();
              window.removeEventListener("message", receiveMessage);
            } catch (error) {
              console.error('Error fetching data:', error);
            }
          } else {
            console.log('Invalid event data:', event.data);
          }
        } else {
          console.log('Invalid origin:', event.origin);
        }
      };

      window.addEventListener("message", receiveMessage);

      popWin.onbeforeunload = () => {
        window.removeEventListener("message", receiveMessage);
      };
    } else {
      throw new Error('Failed to open popup window');
    }
  }, [connected]);

  const buttonText = connected ? 'Disconnect' : 'Connect';
  const details = connected ? 'Account connected' : 'No account connected';
  const terms = connected ? null : (
    <p>
      By clicking <strong>Connect</strong>, you agree to accept Target Onchain’s{' '}
      <Link url={`${env.targetOnchainUrl}/termsAndConditions`} target="_blank">terms and conditions</Link>. You’ll pay a
      commission rate of 15% on sales made through Target Onchain.
    </p>
  );

  return (
    <AccountConnection
      accountName={accountName}
      avatarUrl={avatarUrl}
      connected={connected}
      title="Target Onchain"
      action={{
        content: buttonText,
        onAction: handleAction,
      }}
      details={details}
      termsOfService={terms}
    />
  );
}

export default AccountConnectionWrapper;
