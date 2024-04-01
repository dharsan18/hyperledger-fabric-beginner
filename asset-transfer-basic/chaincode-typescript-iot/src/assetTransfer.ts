/*
 * SPDX-License-identifier: Apache-2.0
 */
// Deterministic JSON.stringify()
import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import {Iot} from './asset';

@Info({title: 'Iot', description: 'Smart contract for iot data'})
export class AssetTransferContract extends Contract {

    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        const assets: Iot[] = [
            {
                id: 'asset1',
                temperature: 'blue',
                ph: '5',
                cc: '7',
                createdBy: 'Tomoko',
                ec: '300',
                timestamp: '02/02/2024'
            },
            {
                id: 'asset2',
                temperature: 'red',
                ph: '5',
                cc: '7',
                createdBy: 'Brad',
                ec: '400',
                timestamp: '02/02/2024'
            },
            {
                id: 'asset3',
                temperature: 'green',
                ph: '10',
                cc: '7',
                createdBy: 'Jin Soo',
                ec: '500',
                timestamp: '02/02/2024'
            },
            {
                id: 'asset4',
                temperature: 'yellow',
                ph: '10',
                cc: '7',
                createdBy: 'Max',
                ec: '600',
                timestamp: '02/02/2024'
            },
            {
                id: 'asset5',
                temperature: 'black',
                ph: '15',
                cc: '7',
                createdBy: 'Adriana',
                ec: '700',
                timestamp: '02/02/2024'
            },
            {
                id: 'asset6',
                temperature: 'white',
                ph: '15',
                cc: '7',
                createdBy: 'Michel',
                ec: '800',
                timestamp: '02/02/2024'
            },
        ];

        for (const asset of assets) {
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(asset.id, Buffer.from(stringify(sortKeysRecursive(asset))));
            console.info(`Asset ${asset.id} initialized`);
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    @Transaction()
    public async CreateAsset(ctx: Context, id: string, temperature: string, ph: string, createdBy: string, ec: string,cc: string,timestamp:string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }

        const asset = {
            id: id,
            temperature: temperature,
            ph: ph,
            createdBy: createdBy,
            ec: ec,
            cc:cc,
            timestamp:timestamp
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    }

    // ReadAsset returns the asset stored in the world state with given id.
    @Transaction(false)
    public async ReadAsset(ctx: Context, id: string): Promise<string> {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    @Transaction()
    public async UpdateAsset(ctx: Context, id: string, temperature: string, ph: string, createdBy: string, ec: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            id: id,
            temperature: temperature,
            ph: ph,
            createdBy: createdBy,
            ec: ec,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    // DeleteAsset deletes an given asset from the world state.
    @Transaction()
    public async DeleteAsset(ctx: Context, id: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given id exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // TransferAsset updates the createdBy field of asset with given id in the world state, and returns the old createdBy.
    @Transaction()
    public async TransferAsset(ctx: Context, id: string, newcreatedBy: string): Promise<string> {
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        const oldcreatedBy = asset.createdBy;
        asset.createdBy = newcreatedBy;
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldcreatedBy;
    }

    // GetAllAssets returns all assets found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllAssets(ctx: Context): Promise<string> {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

}
