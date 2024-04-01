/*
  SPDX-License-Identifier: Apache-2.0
*/

import {Object, Property} from 'fabric-contract-api';

@Object()
export class Iot {

    @Property()
    public id: string;

    @Property()
    public temperature: string;

    @Property()
    public ph: string;

    @Property()
    public cc: string;

    @Property()
    public createdBy: string;

    @Property()
    public ec: string;

    @Property()
    public timestamp: string;
    
}
