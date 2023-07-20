// Import required libp2p modules
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { mplex } from '@libp2p/mplex';
import { webRTCDirect, webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { webTransport } from '@libp2p/webtransport';
import { createLibp2p } from 'libp2p';
import { circuitRelayTransport } from 'libp2p/circuit-relay';
import { identifyService } from 'libp2p/identify';

// Get references to the chat container, input, and send button
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatMessagesContainer = document.getElementById('chat-messages');

// Function to display chat messages in the UI
function displayChatMessage(sender, message) {
  const messageElement = document.createElement('p');
  messageElement.textContent = `${sender}: ${message}`;
  chatMessagesContainer.appendChild(messageElement);
}

// Function to send a chat message to a specific peer
function sendMessageToPeer(peerId, message) {
  libp2p.dial(peerId)
    .then((conn) => {
      conn.write(message);
    })
    .catch((err) => {
      console.error('Error sending message:', err);
    });
}

// Create our libp2p node
const libp2p = createLibp2p({
  // transports allow us to dial peers that support certain types of addresses
  transports: [
    webSockets(),
    webTransport(),
    webRTC(),
    webRTCDirect(),
    circuitRelayTransport({
      // use content routing to find a circuit relay server we can reserve a
      // slot on
      discoverRelays: 1
    })
  ],
  connectionEncryption: [noise()],
  streamMuxers: [yamux(), mplex()],
  peerDiscovery: [
    bootstrap({
      list: [
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
      ]
    })
  ],
  services: {
    // the identify service is used by the DHT and the circuit relay transport
    // to find peers that support the relevant protocols
    identify: identifyService(),

    // the DHT is used to find circuit relay servers we can reserve a slot on
    dht: kadDHT({
      // browser node ordinarily shouldn't be DHT servers
      clientMode: true
    })
  }
});

// Listen for new connections to peers
libp2p.addEventListener('peer:connect', (evt) => {
  const peerId = evt.detail;
  console.log(`Connected to ${peerId.toString()}`);

  // Add event listener for incoming data from the peer
  libp2p.connectionManager.get(peerId, '/libp2p/1.0.0', (err, conn) => {
    if (err) {
      console.error(`Error getting connection to ${peerId.toString()}`, err);
      return;
    }

    conn.on('data', (data) => {
      // Convert the incoming data to a string and display it in the UI
      displayChatMessage(peerId.toString(), data.toString());
    });
  });
});

// Event listener for the send button click
sendButton.addEventListener('click', () => {
  const message = messageInput.value;
  if (message.trim() !== '') {
    // Display the sent message in the UI
    displayChatMessage('You', message);

    // Send the message to all connected peers
    const connectedPeers = libp2p.peerStore.peers;
    for (const peer of connectedPeers) {
      sendMessageToPeer(peer.id, message);
    }

    // Clear the input field
    messageInput.value = '';
  }
});

// UI elements
const status = document.createElement('div');
status.textContent = 'libp2p started!';
chatContainer.insertBefore(status, chatContainer.firstChild);
console.log(`libp2p id is ${libp2p.peerId.toString()}`);

// Start the libp2p node
libp2p.start()
  .then(() => {
    console.log('libp2p node started!');
  })
  .catch((err) => {
    console.error('Failed to start libp2p node:', err);
  });
