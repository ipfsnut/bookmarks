import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig, fallback } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const BASE_RPC_URLS = [
  'https://base.meowrpc.com',              // MeowRPC (reliable public endpoint)
  'https://base.drpc.org',                 // DRPC (decentralized RPC)
  'https://base-mainnet.g.alchemy.com/v2/demo', // Alchemy demo key (limited but works)
  'https://base.gateway.tenderly.co',      // Tenderly gateway
  'https://base-rpc.publicnode.com',       // Public Node
];

const ETH_RPC_URLS = [
  'https://eth.meowrpc.com',               // MeowRPC
  'https://eth.drpc.org',                  // DRPC
  'https://ethereum.publicnode.com',       // Public Node
  'https://rpc.ankr.com/eth',              // Ankr
];

export const config = createConfig({
  chains: [base, mainnet],
  connectors: [
    injected(),
    farcasterFrame()
  ],
  transports: {
    [base.id]: fallback(
      BASE_RPC_URLS.map(url => 
        http(url, {
          batch: {
            wait: 500,
            batchSize: 10,
          },
        })
      ),
    ),
    [mainnet.id]: fallback(
      ETH_RPC_URLS.map(url => 
        http(url, {
          batch: {
            wait: 500,
            batchSize: 10,
          },
        })
      ),
    ),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}