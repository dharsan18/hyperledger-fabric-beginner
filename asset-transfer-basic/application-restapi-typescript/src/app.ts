import express from 'express';
import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TextDecoder } from 'util';

const app = express();
const port = 3000;
app.use(express.json());

const channelName = envOrDefault('CHANNEL_NAME', 'mychannel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');
const mspId = envOrDefault('MSP_ID', 'Org1MSP');
const cryptoPath = envOrDefault('CRYPTO_PATH', path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com'));
const keyDirectoryPath = envOrDefault('KEY_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore'));
const certDirectoryPath = envOrDefault('CERT_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts'));
const tlsCertPath = envOrDefault('TLS_CERT_PATH', path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt'));
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org1.example.com');

const utf8Decoder = new TextDecoder();

async function main(): Promise<void> {
    app.get('/get-all-assets', async (req:any, res:any) => {
        try {
            await displayInputParameters();

            const client = await newGrpcConnection();
            const gateway = connect({
                client,
                identity: await newIdentity(),
                signer: await newSigner(),
                evaluateOptions: () => {
                    return { deadline: Date.now() + 5000 };
                },
                endorseOptions: () => {
                    return { deadline: Date.now() + 15000 };
                },
                submitOptions: () => {
                    return { deadline: Date.now() + 5000 };
                },
                commitStatusOptions: () => {
                    return { deadline: Date.now() + 60000 };
                },
            });

            try {
                const network = gateway.getNetwork(channelName);
                const contract = network.getContract(chaincodeName);
                const resultBytes = await contract.evaluateTransaction('GetAllAssets');
                const resultJson = utf8Decoder.decode(resultBytes);
                const result = JSON.parse(resultJson);
                res.json(result);
            } finally {
                gateway.close();
                client.close();
            }
        } catch (error) {
            console.error('Failed to get assets:', error);
            res.status(500).send('Failed to get assets');
        }
    });

    app.get('/assets/:id', async (req:any, res:any) => {
        const assetId = req.params.id;
        try {
            const client = await newGrpcConnection();
            const gateway = connect({
                client,
                identity: await newIdentity(),
                signer: await newSigner(),
                evaluateOptions: () => {
                    return { deadline: Date.now() + 5000 };
                },
                endorseOptions: () => {
                    return { deadline: Date.now() + 15000 };
                },
                submitOptions: () => {
                    return { deadline: Date.now() + 5000 };
                },
                commitStatusOptions: () => {
                    return { deadline: Date.now() + 60000 };
                },
            });
    
            try {
                const network = gateway.getNetwork(channelName);
                const contract = network.getContract(chaincodeName);
                const resultBytes = await contract.evaluateTransaction('ReadAsset', assetId);
                const resultJson = utf8Decoder.decode(resultBytes);
                const result = JSON.parse(resultJson);
                res.json(result);
            } finally {
                gateway.close();
                client.close();
            }
        } catch (error) {
            console.error('Failed to get asset:', error);
            res.status(500).send('Failed to get asset');
        }
    });
    

    app.post('/createAsset', async (req:any, res:any) => {
        console.log(req.body)
        const { assetId, temperature, ph, createdBy, cc, ec,timestamp } = req.body;
        try {
            const client = await newGrpcConnection();
            const gateway = connect({
                client,
                identity: await newIdentity(),
                signer: await newSigner(),
                evaluateOptions: () => {
                    return { deadline: Date.now() + 5000 };
                },
                endorseOptions: () => {
                    return { deadline: Date.now() + 15000 };
                },
                submitOptions: () => {
                    return { deadline: Date.now() + 5000 };
                },
                commitStatusOptions: () => {
                    return { deadline: Date.now() + 60000 };
                },
            });

            try {
                const network = gateway.getNetwork(channelName);
                const contract = network.getContract(chaincodeName);
                await contract.submitTransaction(
                    'CreateAsset',
                    assetId,
                    temperature,
                    ph,
                    createdBy,
                    cc,
                    ec,
                    timestamp
                );
                res.status(201).send('Asset created successfully');
            } finally {
                gateway.close();
                client.close();
            }
        } catch (error) {
            console.error('Failed to create asset:', error);
            res.status(500).send('Failed to create asset');
        }
    });

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

main().catch(error => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});

async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity(): Promise<Identity> {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function getFirstDirFileName(dirPath: string): Promise<string> {
    const files = await fs.readdir(dirPath);
    return path.join(dirPath, files[0]);
}

async function newSigner(): Promise<Signer> {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function displayInputParameters(): Promise<void> {
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certDirectoryPath: ${certDirectoryPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}

function envOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}
