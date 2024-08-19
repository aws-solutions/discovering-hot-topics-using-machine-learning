/**********************************************************************************************************************
* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
 *********************************************************************************************************************/

'use strict';

const ingestionWindow = require('../util/ingestion-windows');
const expect = require('chai').expect;

describe('Test Ingestion Window', () => {
    it('should go to yesterday', async () => {
        const d = new Date('February 1, 2020 00:05:00 GMT+00');
        const response = ingestionWindow.calculateIngestionWindow(d, 2);
        expect(response.length).to.equal(2);
        expect(response[0]).to.equal('2020/01/31/23/');
        expect(response[1]).to.equal('2020/01/31/22/');
    });

    it('should in to yesteryear', () => {
        const d = new Date('January 1, 2020 00:02:00 GMT+00');
        const response = ingestionWindow.calculateIngestionWindow(d, 2);
        expect(response.length).to.equal(2);
        expect(response[0]).to.equal('2019/12/31/23/');
        expect(response[1]).to.equal('2019/12/31/22/');
    });

    it('should in to yestermonth', () => {
        const d = new Date('March 1, 2020 00:02:00 GMT+00');
        const response = ingestionWindow.calculateIngestionWindow(d, 2);
        expect(response.length).to.equal(2);
        expect(response[0]).to.equal('2020/02/29/23/');
        expect(response[1]).to.equal('2020/02/29/22/');
    });

    it('should return 3 records', () => {
        const d = new Date('March 1, 2020 00:02:00 GMT+00');
        const response = ingestionWindow.calculateIngestionWindow(d, 3);
        expect(response.length).to.equal(3);
        expect(response[0]).to.equal('2020/02/29/23/');
        expect(response[1]).to.equal('2020/02/29/22/');
        expect(response[2]).to.equal('2020/02/29/21/');
    });

    it('should return 1 record', () => {
        const d = new Date('March 1, 2020 00:02:00 GMT+00');
        const response = ingestionWindow.calculateIngestionWindow(d, 1);
        expect(response.length).to.equal(1);
        expect(response[0]).to.equal('2020/02/29/23/');
    });
});
